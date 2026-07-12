'use strict';

const crypto = require('crypto');

const SENSITIVE_KEYS = new Set([
  'cardnumber', 'card_number', 'pan', 'cvv', 'cvc', 'securitycode', 'security_code',
  'expiration', 'expiry', 'expmonth', 'expyear', 'routingnumber', 'accountnumber',
  'secret', 'apikey', 'api_key', 'accesstoken', 'refresh_token', 'password'
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
}

function roundMoney(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid money value: ${value}.`);
  const factor = 10 ** digits;
  return Math.round((number + Number.EPSILON) * factor) / factor;
}

function nonNegativeMoney(value, label) {
  const number = roundMoney(value || 0);
  if (number < 0) throw new Error(`${label} may not be negative.`);
  return number;
}

function normalizeId(value, label = 'Record ID') {
  const text = String(value || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,99}$/.test(text) || text.includes('..')) throw new Error(`${label} is invalid.`);
  return text;
}

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') return ['Configuration must be an object.'];
  if (config.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (config.controls?.selectedRecordOnly !== true) errors.push('Selected-record execution is required.');
  if (config.controls?.bulkExecution !== false) errors.push('Bulk execution must remain disabled.');
  if (config.controls?.automaticRetry !== false) errors.push('Automatic retry must remain disabled.');
  if (config.controls?.duplicateProtectionRequired !== true) errors.push('Duplicate protection is required.');
  if (config.controls?.proofLogRequired !== true || config.controls?.errorLogRequired !== true) errors.push('Proof and Error Logs are required.');
  if (config.controls?.rawCardDataAllowed !== false) errors.push('Raw card data must be forbidden.');
  if (config.controls?.externalActionsEnabled !== false) errors.push('External actions must default to disabled.');
  if (Object.values(config.externalActions || {}).some(value => value !== false)) errors.push('Every external action must default to false.');
  if (!Array.isArray(config.providers) || !config.providers.length) errors.push('Provider registry is required.');
  return errors;
}

function containsSensitiveData(value, path = '') {
  if (Array.isArray(value)) return value.some((item, index) => containsSensitiveData(item, `${path}[${index}]`));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (SENSITIVE_KEYS.has(normalized)) return true;
    return containsSensitiveData(item, path ? `${path}.${key}` : key);
  });
}

function assertNoSensitiveData(value) {
  if (containsSensitiveData(value)) throw new Error('Sensitive payment or provider credential fields are forbidden.');
  return true;
}

function findProvider(config, providerId, category) {
  const provider = (config.providers || []).find(item => item.id === providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}.`);
  if (category && provider.category !== category) throw new Error(`Provider ${providerId} is not a ${category} provider.`);
  return provider;
}

function calculateQuoteTotals(input, config) {
  assertNoSensitiveData(input);
  const subtotal = nonNegativeMoney(input.subtotal ?? input.catalogPrice ?? 0, 'Subtotal');
  const addOns = (input.addOns || []).map(item => ({
    id: normalizeId(item.id, 'Add-on ID'),
    description: String(item.description || item.id),
    amount: nonNegativeMoney(item.amount, 'Add-on amount')
  }));
  const addOnTotal = roundMoney(addOns.reduce((sum, item) => sum + item.amount, 0));
  const discount = nonNegativeMoney(input.discount || 0, 'Discount');
  if (discount > subtotal + addOnTotal) throw new Error('Discount may not exceed subtotal plus add-ons.');
  const taxable = roundMoney(subtotal + addOnTotal - discount);
  const taxPercent = Number(input.taxPercent || 0);
  if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > Number(config.billing.maximumTaxPercent)) throw new Error('Tax percent is outside the configured limit.');
  const tax = roundMoney(taxable * taxPercent / 100);
  const fees = nonNegativeMoney(input.fees || 0, 'Fees');
  const total = roundMoney(taxable + tax + fees);
  if (total < Number(config.billing.minimumInvoiceTotal || 0)) throw new Error('Quote total is below the configured minimum.');
  return { subtotal, addOns, addOnTotal, discount, taxable, taxPercent, tax, fees, total };
}

function createQuoteDraft(input, config, now = Date.now()) {
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.join(' '));
  const totals = calculateQuoteTotals(input, config);
  return {
    id: normalizeId(input.id || `QUOTE-${crypto.randomUUID()}`, 'Quote ID'),
    tenantKey: normalizeId(input.tenantKey, 'Tenant key').toLowerCase(),
    customerId: normalizeId(input.customerId, 'Customer ID'),
    jobId: input.jobId ? normalizeId(input.jobId, 'Job ID') : '',
    catalogId: normalizeId(input.catalogId, 'Catalog ID'),
    scope: String(input.scope || '').trim(),
    exclusions: String(input.exclusions || '').trim(),
    paymentTerms: String(input.paymentTerms || '').trim(),
    turnaround: String(input.turnaround || '').trim(),
    revisionAllowance: String(input.revisionAllowance || '').trim(),
    totals,
    status: 'Needs review',
    approvalStatus: 'Rick Review Required / Owner Approval Required',
    ownerDecision: 'HOLD',
    sentAt: null,
    providerReference: null,
    externalActionOccurred: false,
    createdAt: nowIso(now),
    updatedAt: nowIso(now)
  };
}

function createBillingPlan({ quote, stages }) {
  if (!quote || !quote.totals) throw new Error('Quote with totals is required.');
  if (!Array.isArray(stages) || !stages.length) throw new Error('At least one billing stage is required.');
  const allowed = new Set(['Deposit', 'Progress', 'Final', 'Recurring', 'Subscription', 'Credit']);
  const rows = stages.map((stage, index) => {
    if (!allowed.has(stage.type)) throw new Error(`Unsupported billing stage: ${stage.type}.`);
    const amount = stage.amount != null
      ? nonNegativeMoney(stage.amount, 'Billing-stage amount')
      : roundMoney(quote.totals.total * Number(stage.percent || 0) / 100);
    return {
      sequence: index + 1,
      type: stage.type,
      label: String(stage.label || stage.type),
      amount,
      dueRule: String(stage.dueRule || ''),
      trigger: String(stage.trigger || ''),
      status: 'Not requested'
    };
  });
  const planned = roundMoney(rows.reduce((sum, row) => sum + row.amount, 0));
  if (planned !== roundMoney(quote.totals.total)) throw new Error(`Billing plan total ${planned} must equal quote total ${quote.totals.total}.`);
  return { quoteId: quote.id, currency: 'USD', total: planned, stages: rows, automaticBilling: false };
}

function createInvoiceDraft({ quote, billingStage, tax = 0, fees = 0, discount = 0 }, config, now = Date.now()) {
  if (!quote || !billingStage) throw new Error('Quote and selected billing stage are required.');
  const subtotal = nonNegativeMoney(billingStage.amount, 'Invoice subtotal');
  const invoiceDiscount = nonNegativeMoney(discount, 'Invoice discount');
  const invoiceTax = nonNegativeMoney(tax, 'Invoice tax');
  const invoiceFees = nonNegativeMoney(fees, 'Invoice fees');
  if (invoiceDiscount > subtotal) throw new Error('Invoice discount may not exceed subtotal.');
  const total = roundMoney(subtotal - invoiceDiscount + invoiceTax + invoiceFees);
  return {
    id: `INV-${crypto.randomUUID()}`,
    tenantKey: quote.tenantKey,
    customerId: quote.customerId,
    jobId: quote.jobId,
    quoteId: quote.id,
    invoiceType: billingStage.type,
    subtotal,
    discount: invoiceDiscount,
    tax: invoiceTax,
    fees: invoiceFees,
    total,
    amountPaid: 0,
    balance: total,
    status: 'Needs review',
    approvalStatus: 'Rick Review Required / Owner Approval Required',
    ownerDecision: 'HOLD',
    paymentProvider: null,
    providerReference: null,
    externalActionOccurred: false,
    createdAt: nowIso(now),
    updatedAt: nowIso(now)
  };
}

function createCommunicationDraft(input, now = Date.now()) {
  assertNoSensitiveData(input);
  const channel = String(input.channel || 'Email');
  return {
    id: normalizeId(input.id || `COMM-${crypto.randomUUID()}`, 'Communication ID'),
    tenantKey: normalizeId(input.tenantKey, 'Tenant key').toLowerCase(),
    customerId: normalizeId(input.customerId, 'Customer ID'),
    jobId: input.jobId ? normalizeId(input.jobId, 'Job ID') : '',
    category: String(input.category || 'General'),
    channel,
    direction: 'OUTBOUND_DRAFT',
    recipient: String(input.recipient || '').trim(),
    subject: String(input.subject || '').trim(),
    body: String(input.body || '').trim(),
    status: 'Needs review',
    approvalStatus: 'Rick Review Required / Owner Approval Required',
    ownerDecision: 'HOLD',
    sentAt: null,
    providerReference: null,
    externalActionOccurred: false,
    createdAt: nowIso(now)
  };
}

function assertApproval(record, action, config) {
  if (!record) throw new Error('Selected record is required.');
  const required = config.approvalMatrix?.[action];
  if (!required) throw new Error(`Unsupported approval action: ${action}.`);
  if (record.approvalStatus !== 'Approved by Rick - Action Allowed') throw new Error('Exact owner approval status is required.');
  if (record.ownerDecision !== required) throw new Error(`Owner decision must equal ${required}.`);
  return required;
}

function prepareExternalAction({ action, record, providerId, config, duplicateLocks = new Set(), selectedRecordId }) {
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.join(' '));
  assertNoSensitiveData(record);
  const recordId = normalizeId(record.id, 'Record ID');
  if (selectedRecordId !== recordId) throw new Error('Selected-record identity mismatch.');
  const decision = assertApproval(record, action, config);
  let category = null;
  if (['SEND_EMAIL', 'SEND_QUOTE', 'SEND_INVOICE', 'SEND_FINAL_DELIVERY'].includes(action)) category = 'communications';
  if (['REQUEST_PAYMENT', 'ISSUE_REFUND'].includes(action)) category = 'payments';
  if (action === 'PUBLISH_SOCIAL') category = 'social';
  if (action === 'DEPLOY_WEBSITE') category = 'website';
  const provider = findProvider(config, providerId, category);
  const duplicateKey = sha256({ action, recordId, providerId, decision, version: record.version || record.updatedAt || record.createdAt || '' });
  if (duplicateLocks.has(duplicateKey)) throw new Error('Duplicate external action blocked.');
  duplicateLocks.add(duplicateKey);
  return {
    status: 'GATE_PASS_NO_EXTERNAL_ACTION',
    action,
    recordId,
    providerId,
    providerStatus: provider.status,
    requiredDecision: decision,
    duplicateKey,
    externalActionsEnabled: false,
    externalActionOccurred: false,
    automaticRetry: false,
    blocker: provider.blocker || 'Owner release and live credentials required.'
  };
}

function recordPaymentInternal({ invoice, payment, existingPayments = [] }, now = Date.now()) {
  assertNoSensitiveData(payment);
  if (!invoice) throw new Error('Selected invoice is required.');
  const amount = nonNegativeMoney(payment.amount, 'Payment amount');
  if (amount <= 0) throw new Error('Payment amount must be greater than zero.');
  const reference = String(payment.transactionReference || '').trim();
  if (!reference) throw new Error('Transaction reference is required.');
  if (existingPayments.some(item => String(item.transactionReference) === reference)) throw new Error('Duplicate transaction reference blocked.');
  const priorPaid = nonNegativeMoney(invoice.amountPaid || 0, 'Prior amount paid');
  const total = nonNegativeMoney(invoice.total, 'Invoice total');
  if (roundMoney(priorPaid + amount) > total) throw new Error('Payment exceeds invoice balance.');
  const amountPaid = roundMoney(priorPaid + amount);
  const balance = roundMoney(total - amountPaid);
  const updatedInvoice = {
    ...clone(invoice),
    amountPaid,
    balance,
    status: balance === 0 ? 'Paid' : 'Partially paid',
    updatedAt: nowIso(now)
  };
  const paymentRecord = {
    id: normalizeId(payment.id || `PAY-${crypto.randomUUID()}`, 'Payment ID'),
    tenantKey: invoice.tenantKey,
    customerId: invoice.customerId,
    jobId: invoice.jobId,
    invoiceId: invoice.id,
    paymentDate: payment.paymentDate || nowIso(now),
    amount,
    paymentMethod: String(payment.paymentMethod || 'Provider-hosted'),
    transactionReference: reference,
    provider: String(payment.provider || ''),
    status: 'Recorded',
    receiptLink: String(payment.receiptLink || ''),
    rawCardDataStored: false,
    externalActionOccurred: false,
    createdAt: nowIso(now)
  };
  return { invoice: updatedInvoice, payment: paymentRecord };
}

function prepareRefund({ payment, amount, reason, approvalStatus, ownerDecision, config }, now = Date.now()) {
  assertNoSensitiveData(payment);
  const refundAmount = nonNegativeMoney(amount, 'Refund amount');
  const paid = nonNegativeMoney(payment.amount, 'Payment amount');
  const alreadyRefunded = nonNegativeMoney(payment.refundAmount || 0, 'Prior refund amount');
  if (refundAmount <= 0 || roundMoney(refundAmount + alreadyRefunded) > paid) throw new Error('Refund amount exceeds available payment amount.');
  const approvalRecord = { id: payment.id, approvalStatus, ownerDecision };
  assertApproval(approvalRecord, 'ISSUE_REFUND', config);
  return {
    id: `REF-${crypto.randomUUID()}`,
    paymentId: payment.id,
    invoiceId: payment.invoiceId,
    amount: refundAmount,
    reason: String(reason || '').trim(),
    status: 'APPROVED_PENDING_PROVIDER_EXECUTION',
    providerReference: null,
    externalActionOccurred: false,
    automaticRetry: false,
    createdAt: nowIso(now)
  };
}

function createServiceContract(input, config, now = Date.now()) {
  assertNoSensitiveData(input);
  if (!config.contracts.statuses.includes('Draft')) throw new Error('Contract configuration is invalid.');
  const includedQuantity = nonNegativeMoney(input.includedQuantity || 0, 'Included quantity');
  const overageRate = nonNegativeMoney(input.overageRate || 0, 'Overage rate');
  const recurringPrice = nonNegativeMoney(input.recurringPrice || 0, 'Recurring price');
  if (!config.contracts.billingCadences.includes(input.billingCadence)) throw new Error('Unsupported billing cadence.');
  if (!config.contracts.usageUnits.includes(input.usageUnit)) throw new Error('Unsupported usage unit.');
  return {
    id: normalizeId(input.id || `CONTRACT-${crypto.randomUUID()}`, 'Contract ID'),
    tenantKey: normalizeId(input.tenantKey, 'Tenant key').toLowerCase(),
    customerId: normalizeId(input.customerId, 'Customer ID'),
    name: String(input.name || '').trim(),
    scope: String(input.scope || '').trim(),
    exclusions: String(input.exclusions || '').trim(),
    billingCadence: input.billingCadence,
    recurringPrice,
    includedQuantity,
    usageUnit: input.usageUnit,
    overageRate,
    usageConsumed: 0,
    usageRemaining: includedQuantity,
    overageQuantity: 0,
    overageAmount: 0,
    startDate: input.startDate || null,
    renewalDate: input.renewalDate || null,
    cancellationNoticeDays: Number(input.cancellationNoticeDays || 0),
    automaticRenewal: false,
    automaticBilling: false,
    status: 'Needs review',
    approvalStatus: 'Rick Review Required / Owner Approval Required',
    ownerDecision: 'HOLD',
    externalActionOccurred: false,
    createdAt: nowIso(now)
  };
}

function applyContractUsage(contract, quantity, reference, existingUsage = [], now = Date.now()) {
  const used = nonNegativeMoney(quantity, 'Usage quantity');
  if (used <= 0) throw new Error('Usage quantity must be greater than zero.');
  const ref = String(reference || '').trim();
  if (!ref) throw new Error('Usage reference is required.');
  if (existingUsage.some(row => row.reference === ref)) throw new Error('Duplicate usage reference blocked.');
  const totalConsumed = roundMoney(Number(contract.usageConsumed || 0) + used);
  const included = nonNegativeMoney(contract.includedQuantity || 0, 'Included quantity');
  const remaining = roundMoney(Math.max(0, included - totalConsumed));
  const overageQuantity = roundMoney(Math.max(0, totalConsumed - included));
  const overageAmount = roundMoney(overageQuantity * nonNegativeMoney(contract.overageRate || 0, 'Overage rate'));
  return {
    contract: {
      ...clone(contract),
      usageConsumed: totalConsumed,
      usageRemaining: remaining,
      overageQuantity,
      overageAmount,
      updatedAt: nowIso(now)
    },
    usage: {
      id: `USAGE-${crypto.randomUUID()}`,
      contractId: contract.id,
      customerId: contract.customerId,
      quantity: used,
      unit: contract.usageUnit,
      reference: ref,
      recordedAt: nowIso(now),
      externalActionOccurred: false
    }
  };
}

function evaluateContractRenewal(contract, asOf = Date.now()) {
  if (!contract.renewalDate) return { status: 'NO_RENEWAL_DATE', daysUntilRenewal: null, ownerReviewRequired: true };
  const renewal = new Date(contract.renewalDate).getTime();
  if (!Number.isFinite(renewal)) throw new Error('Renewal date is invalid.');
  const days = Math.ceil((renewal - asOf) / 86400000);
  return {
    status: days < 0 ? 'RENEWAL_OVERDUE' : days <= 30 ? 'RENEWAL_DUE' : 'ACTIVE',
    daysUntilRenewal: days,
    ownerReviewRequired: true,
    automaticRenewal: false,
    automaticBilling: false
  };
}

function buildProfitability({ jobs = [], payments = [], expenses = [], contracts = [], attribution = [] }) {
  const groups = new Map();
  function groupKey(record) {
    return String(record.catalogId || record.productId || record.bundleId || record.contractId || 'UNASSIGNED');
  }
  function ensure(key) {
    if (!groups.has(key)) groups.set(key, { key, revenue: 0, expenses: 0, profit: 0, jobs: 0, payments: 0, contracts: 0, attributedLeads: 0, attributedRevenue: 0 });
    return groups.get(key);
  }
  jobs.forEach(job => { ensure(groupKey(job)).jobs += 1; });
  payments.forEach(payment => {
    const row = ensure(groupKey(payment));
    row.payments += 1;
    row.revenue = roundMoney(row.revenue + nonNegativeMoney(payment.amount || 0, 'Payment amount'));
  });
  expenses.forEach(expense => {
    const row = ensure(groupKey(expense));
    row.expenses = roundMoney(row.expenses + nonNegativeMoney(expense.amount || 0, 'Expense amount') + nonNegativeMoney(expense.tax || 0, 'Expense tax'));
  });
  contracts.forEach(contract => { ensure(contract.id).contracts += 1; });
  attribution.forEach(item => {
    const row = ensure(groupKey(item));
    row.attributedLeads += Number(item.leads || 0);
    row.attributedRevenue = roundMoney(row.attributedRevenue + nonNegativeMoney(item.revenue || 0, 'Attributed revenue'));
  });
  return [...groups.values()].map(row => ({ ...row, profit: roundMoney(row.revenue - row.expenses) })).sort((a, b) => a.key.localeCompare(b.key));
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function buildAccountingCsv({ invoices = [], payments = [], expenses = [], refunds = [] }, config) {
  const rows = [['Record Type','Record ID','Date','Customer ID','Job ID','Account','Description / Reference','Debit','Credit','Tax','Status','Provider Reference']];
  const accounts = config.accounting.defaultAccounts;
  invoices.forEach(row => rows.push(['Invoice',row.id,row.sentAt || row.createdAt,row.customerId,row.jobId,accounts.accountsReceivable,row.invoiceType || 'Invoice',row.total,'',row.tax || 0,row.status,row.providerReference || '']));
  payments.forEach(row => rows.push(['Payment',row.id,row.paymentDate,row.customerId,row.jobId,row.contractId ? accounts.subscriptionRevenue : accounts.serviceRevenue,row.transactionReference,'',row.amount,'',row.status,row.providerReference || row.transactionReference || '']));
  expenses.forEach(row => rows.push(['Expense',row.id,row.date,row.customerId || '',row.jobId || '',row.category || 'Expense',row.description,row.amount,'',row.tax || 0,row.status || 'Recorded',row.providerReference || '']));
  refunds.forEach(row => rows.push(['Refund',row.id,row.createdAt,row.customerId || '',row.jobId || '',accounts.refunds,row.reason,row.amount,'',0,row.status,row.providerReference || '']));
  return rows.map(row => row.map(csvCell).join(',')).join('\n');
}

function buildSocialSchedule(contentBank, startDate, config) {
  if (!contentBank || !Array.isArray(contentBank.posts) || contentBank.posts.length !== 30) throw new Error('A complete 30-day content bank is required.');
  if (contentBank.externalPublication !== false) throw new Error('Content bank must prohibit external publication by default.');
  const start = new Date(startDate);
  if (!Number.isFinite(start.getTime())) throw new Error('Schedule start date is invalid.');
  const supported = new Set(config.social.supportedPlatforms);
  const records = [];
  contentBank.posts.forEach(post => {
    const scheduled = new Date(start.getTime() + (Number(post.day) - 1) * 86400000);
    post.platforms.forEach(platform => {
      if (!supported.has(platform)) throw new Error(`Unsupported social platform: ${platform}.`);
      records.push({
        id: `SOC-${String(post.day).padStart(2,'0')}-${platform.toUpperCase().replace(/[^A-Z0-9]+/g,'-')}`,
        day: post.day,
        theme: post.theme,
        platform,
        caption: post.draft,
        assetRequirement: post.asset,
        scheduledTime: scheduled.toISOString(),
        status: 'NEEDS_ASSETS_AND_OWNER_REVIEW',
        publishAllowed: false,
        externalActionOccurred: false
      });
    });
  });
  return { status: 'INTERNAL_SCHEDULE_ONLY', records, publicationEnabled: false, advertisingSpendEnabled: false };
}

function prepareWebsiteDeployment(change, config, rollback) {
  assertNoSensitiveData(change);
  if (!rollback?.commit || !rollback?.instructions) throw new Error('Rollback commit and instructions are required.');
  const approvalRecord = { id: change.id, approvalStatus: change.approvalStatus, ownerDecision: change.ownerDecision };
  assertApproval(approvalRecord, 'DEPLOY_WEBSITE', config);
  return {
    changeId: normalizeId(change.id, 'Website change ID'),
    commit: String(change.commit || ''),
    pullRequest: String(change.pullRequest || ''),
    rollback: clone(rollback),
    status: 'APPROVED_PENDING_DEPLOYMENT',
    externalActionOccurred: false,
    automaticRetry: false
  };
}

function integrationHealth(config) {
  return config.providers.map(provider => ({
    id: provider.id,
    category: provider.category,
    mode: provider.mode,
    status: provider.status,
    connected: provider.liveExecution === true,
    externalExecutionEnabled: false,
    blocker: provider.blocker
  }));
}

function proofEntry(action, result, context = {}, now = Date.now()) {
  return {
    id: `PROOF-${crypto.randomUUID()}`,
    timestamp: nowIso(now),
    action,
    result,
    selectedRecordId: context.selectedRecordId || null,
    providerReference: context.providerReference || null,
    duplicateKey: context.duplicateKey || null,
    externalActionOccurred: Boolean(context.externalActionOccurred),
    digest: sha256({ action, result, context })
  };
}

function errorEntry(action, error, context = {}, now = Date.now()) {
  return {
    id: `ERROR-${crypto.randomUUID()}`,
    timestamp: nowIso(now),
    action,
    message: String(error?.message || error),
    selectedRecordId: context.selectedRecordId || null,
    providerReference: context.providerReference || null,
    externalActionOccurred: Boolean(context.externalActionOccurred),
    automaticRetry: false
  };
}

module.exports = {
  SENSITIVE_KEYS,
  clone,
  sha256,
  roundMoney,
  validateConfig,
  containsSensitiveData,
  assertNoSensitiveData,
  findProvider,
  calculateQuoteTotals,
  createQuoteDraft,
  createBillingPlan,
  createInvoiceDraft,
  createCommunicationDraft,
  assertApproval,
  prepareExternalAction,
  recordPaymentInternal,
  prepareRefund,
  createServiceContract,
  applyContractUsage,
  evaluateContractRenewal,
  buildProfitability,
  buildAccountingCsv,
  buildSocialSchedule,
  prepareWebsiteDeployment,
  integrationHealth,
  proofEntry,
  errorEntry
};
