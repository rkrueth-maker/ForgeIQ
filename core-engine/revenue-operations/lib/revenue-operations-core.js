'use strict';

const crypto = require('crypto');

const TERMINAL_QUOTE_STATUSES = new Set(['DECLINED', 'EXPIRED', 'CANCELLED']);
const TERMINAL_INVOICE_STATUSES = new Set(['PAID', 'VOID', 'CREDITED']);
const EXTERNAL_ACTIONS = new Set([
  'SEND_QUOTE',
  'SEND_INVOICE',
  'SEND_EMAIL',
  'SEND_SMS',
  'CREATE_PAYMENT_REQUEST',
  'PROCESS_PAYMENT',
  'EXECUTE_REFUND',
  'PUBLISH_SOCIAL',
  'LAUNCH_AD',
  'SPEND_AD_BUDGET',
  'DEPLOY_WEBSITE',
  'FINAL_DELIVERY'
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

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function normalizeId(value, label = 'ID') {
  const text = String(value || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/.test(text) || text.includes('..')) throw new Error(`${label} is invalid.`);
  return text;
}

function normalizeText(value, label, minimum = 1, maximum = 10000) {
  const text = String(value || '').trim();
  if (text.length < minimum || text.length > maximum) throw new Error(`${label} must contain ${minimum}–${maximum} characters.`);
  return text;
}

function toCents(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Money value must be finite.');
    return Math.round((value + Number.EPSILON) * 100);
  }
  const text = String(value ?? '').trim().replace(/[$,]/g, '');
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(text)) throw new Error(`Invalid money value: ${value}`);
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction = ''] = unsigned.split('.');
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  if (!Number.isSafeInteger(cents)) throw new Error('Money value exceeds safe range.');
  return negative ? -cents : cents;
}

function fromCents(cents) {
  if (!Number.isSafeInteger(cents)) throw new Error('Cents must be a safe integer.');
  return (cents / 100).toFixed(2);
}

function calculateLine(line) {
  const quantity = Number(line.quantity ?? 1);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Line quantity must be greater than zero.');
  const unitCents = toCents(line.unitPrice ?? line.unitAmount ?? 0);
  const discountCents = toCents(line.discount ?? 0);
  const lineSubtotalCents = Math.round(quantity * unitCents);
  if (discountCents < 0 || discountCents > lineSubtotalCents) throw new Error('Line discount is outside the allowed range.');
  return {
    id: normalizeId(line.id || `LINE-${crypto.randomUUID()}`, 'Line ID'),
    description: normalizeText(line.description || 'Line item', 'Line description', 1, 500),
    quantity,
    unitCents,
    discountCents,
    netCents: lineSubtotalCents - discountCents,
    category: String(line.category || 'SERVICE').toUpperCase()
  };
}

function calculateDocumentTotals(lines, options = {}) {
  if (!Array.isArray(lines) || !lines.length) throw new Error('At least one line item is required.');
  const calculated = lines.map(calculateLine);
  const subtotalCents = calculated.reduce((sum, line) => sum + line.netCents, 0);
  const taxRate = Number(options.taxRate ?? 0);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) throw new Error('Tax rate must be between 0 and 1.');
  const taxCents = Math.round(subtotalCents * taxRate);
  const adjustmentCents = toCents(options.adjustment ?? 0);
  const totalCents = subtotalCents + taxCents + adjustmentCents;
  if (totalCents < 0) throw new Error('Document total may not be negative.');
  return { lines: calculated, subtotalCents, taxCents, adjustmentCents, totalCents };
}

function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') return ['Configuration must be an object.'];
  if (config.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  const controls = config.controls || {};
  if (controls.selectedRecordOnly !== true) errors.push('Selected-record execution is required.');
  if (controls.bulkExecution !== false) errors.push('Bulk execution must remain disabled.');
  if (controls.automaticRetry !== false) errors.push('Automatic retry must remain disabled.');
  if (controls.duplicateProtection !== true) errors.push('Duplicate protection is required.');
  if (controls.ownerApprovalRequired !== true) errors.push('Owner approval is required.');
  if (controls.proofLogRequired !== true || controls.errorLogRequired !== true) errors.push('Proof and Error Logs are required.');
  if (controls.externalActionsEnabled !== false) errors.push('External actions must default to disabled.');
  if (config.payments?.providerHostedOnly !== true || config.payments?.rawCardDataAllowed !== false) errors.push('Payments must be provider hosted and raw card data must be forbidden.');
  if (config.communications?.liveSendEnabled !== false) errors.push('Live communications must default to disabled.');
  if (config.social?.publicationEnabled !== false) errors.push('Social publication must default to disabled.');
  if (config.advertising?.launchEnabled !== false || config.advertising?.spendEnabled !== false) errors.push('Advertising launch and spend must default to disabled.');
  if (config.website?.deploymentEnabled !== false) errors.push('Website deployment must default to disabled.');
  return errors;
}

function createQuote(input, now = Date.now()) {
  const totals = calculateDocumentTotals(input.lines, { taxRate: input.taxRate, adjustment: input.adjustment });
  return {
    id: normalizeId(input.id || `QUOTE-${crypto.randomUUID()}`, 'Quote ID'),
    tenantKey: normalizeId(input.tenantKey, 'Tenant key').toLowerCase(),
    customerId: normalizeId(input.customerId, 'Customer ID'),
    jobId: input.jobId ? normalizeId(input.jobId, 'Job ID') : null,
    catalogId: input.catalogId ? normalizeId(input.catalogId, 'Catalog ID') : null,
    version: Number.isInteger(input.version) && input.version > 0 ? input.version : 1,
    status: 'DRAFT',
    currency: input.currency || 'USD',
    expiresAt: input.expiresAt || null,
    ...totals,
    ownerApproval: null,
    sentAt: null,
    acceptedAt: null,
    providerReference: null,
    createdAt: nowIso(now),
    updatedAt: nowIso(now),
    externalActionOccurred: false
  };
}

function reviseQuote(quote, changes, now = Date.now()) {
  if (quote.status === 'SENT' || quote.status === 'ACCEPTED') throw new Error('Sent or accepted quotes must be copied into a new revision.');
  if (TERMINAL_QUOTE_STATUSES.has(quote.status)) throw new Error('Terminal quote cannot be revised.');
  const totals = changes.lines ? calculateDocumentTotals(changes.lines, { taxRate: changes.taxRate, adjustment: changes.adjustment }) : {
    lines: clone(quote.lines),
    subtotalCents: quote.subtotalCents,
    taxCents: quote.taxCents,
    adjustmentCents: quote.adjustmentCents,
    totalCents: quote.totalCents
  };
  return {
    ...clone(quote),
    ...totals,
    version: Number(quote.version) + 1,
    status: 'DRAFT',
    ownerApproval: null,
    updatedAt: nowIso(now),
    externalActionOccurred: false
  };
}

function approveRecordForAction(record, action, ownerId, now = Date.now()) {
  if (EXTERNAL_ACTIONS.has(action) === false && !action.startsWith('APPROVE_')) throw new Error('Unknown approval action.');
  return {
    ...clone(record),
    status: record.status === 'DRAFT' || record.status === 'OWNER_REVIEW' ? 'APPROVED_TO_SEND' : record.status,
    ownerApproval: {
      ownerId: normalizeId(ownerId, 'Owner ID'),
      action,
      recordId: record.id,
      recordVersion: Number(record.version || 1),
      approvedAt: nowIso(now),
      approvalDigest: sha256({ ownerId, action, recordId: record.id, version: Number(record.version || 1), approvedAt: nowIso(now) })
    },
    updatedAt: nowIso(now),
    externalActionOccurred: false
  };
}

function createActionEnvelope({ record, action, selectedRecordId, idempotencyKey, provider, now = Date.now() }) {
  if (!record || !record.id) throw new Error('Record is required.');
  if (String(selectedRecordId) !== String(record.id)) throw new Error('Selected-record mismatch.');
  if (!EXTERNAL_ACTIONS.has(action)) throw new Error(`Unsupported external action: ${action}`);
  if (!record.ownerApproval || record.ownerApproval.action !== action) throw new Error('Exact owner approval is required.');
  if (Number(record.ownerApproval.recordVersion) !== Number(record.version || 1)) throw new Error('Owner approval is stale for the current record version.');
  const key = normalizeText(idempotencyKey, 'Idempotency key', 8, 200);
  return {
    envelopeId: `ACTION-${crypto.randomUUID()}`,
    action,
    recordType: String(record.type || '').toUpperCase() || 'RECORD',
    recordId: record.id,
    recordVersion: Number(record.version || 1),
    selectedRecordId: record.id,
    tenantKey: record.tenantKey,
    customerId: record.customerId || null,
    jobId: record.jobId || null,
    provider: provider || null,
    idempotencyKey: key,
    idempotencyDigest: sha256(`${record.tenantKey}|${action}|${record.id}|${record.version || 1}|${key}`),
    ownerApprovalDigest: record.ownerApproval.approvalDigest,
    status: 'READY_BUT_LOCKED',
    createdAt: nowIso(now),
    automaticRetry: false,
    externalActionOccurred: false
  };
}

function validateExecutionGate({ config, envelope, ledger = new Set(), credentialsPresent = false, providerConnected = false, releaseApproved = false }) {
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.join(' '));
  if (config.controls.externalActionsEnabled !== true) throw new Error('LIVE ACTION HOLD — external actions are disabled.');
  if (!credentialsPresent) throw new Error('LIVE ACTION HOLD — provider credentials are missing.');
  if (!providerConnected) throw new Error('LIVE ACTION HOLD — provider connection is not verified.');
  if (!releaseApproved) throw new Error('LIVE ACTION HOLD — release approval is missing.');
  if (ledger.has(envelope.idempotencyDigest)) throw new Error('DUPLICATE ACTION HOLD — idempotency lock already exists.');
  ledger.add(envelope.idempotencyDigest);
  return { status: 'GATE_PASS', externalActionOccurred: false, automaticRetry: false };
}

function acceptQuote(quote, { customerId, expectedVersion, acceptanceId }, now = Date.now(), duplicateLocks = new Set()) {
  if (quote.status !== 'SENT') throw new Error('Quote is not in a sent state.');
  if (String(customerId) !== String(quote.customerId)) throw new Error('Customer mismatch.');
  if (Number(expectedVersion) !== Number(quote.version)) throw new Error('Quote version changed; refresh before accepting.');
  const lock = sha256(`${quote.tenantKey}|${quote.customerId}|${quote.id}|${quote.version}|${normalizeId(acceptanceId, 'Acceptance ID')}`);
  if (duplicateLocks.has(lock)) throw new Error('Duplicate quote acceptance blocked.');
  duplicateLocks.add(lock);
  return {
    ...clone(quote),
    status: 'ACCEPTED',
    acceptedAt: nowIso(now),
    acceptanceLock: lock,
    updatedAt: nowIso(now),
    externalActionOccurred: false
  };
}

function createInvoice(input, now = Date.now()) {
  const totals = calculateDocumentTotals(input.lines, { taxRate: input.taxRate, adjustment: input.adjustment });
  const paidCents = toCents(input.paid ?? 0);
  if (paidCents < 0 || paidCents > totals.totalCents) throw new Error('Initial paid amount is invalid.');
  return {
    id: normalizeId(input.id || `INV-${crypto.randomUUID()}`, 'Invoice ID'),
    type: 'INVOICE',
    invoiceType: String(input.invoiceType || 'FINAL').toUpperCase(),
    tenantKey: normalizeId(input.tenantKey, 'Tenant key').toLowerCase(),
    customerId: normalizeId(input.customerId, 'Customer ID'),
    jobId: input.jobId ? normalizeId(input.jobId, 'Job ID') : null,
    contractId: input.contractId ? normalizeId(input.contractId, 'Contract ID') : null,
    version: Number.isInteger(input.version) && input.version > 0 ? input.version : 1,
    status: paidCents === totals.totalCents && totals.totalCents > 0 ? 'PAID' : 'DRAFT',
    dueAt: input.dueAt || null,
    currency: input.currency || 'USD',
    ...totals,
    paidCents,
    balanceCents: totals.totalCents - paidCents,
    paymentIds: [],
    creditIds: [],
    ownerApproval: null,
    sentAt: null,
    createdAt: nowIso(now),
    updatedAt: nowIso(now),
    externalActionOccurred: false
  };
}

function recordManualPayment({ invoice, payment, now = Date.now(), duplicateLocks = new Set() }) {
  if (TERMINAL_INVOICE_STATUSES.has(invoice.status) && invoice.status !== 'PAID') throw new Error('Invoice cannot accept a payment in its current state.');
  const amountCents = toCents(payment.amount);
  if (amountCents <= 0) throw new Error('Payment amount must be greater than zero.');
  if (amountCents > invoice.balanceCents) throw new Error('Payment exceeds invoice balance.');
  const reference = normalizeText(payment.reference, 'Payment reference', 2, 200);
  const lock = sha256(`${invoice.tenantKey}|${invoice.id}|${payment.method || 'MANUAL'}|${reference}|${amountCents}`);
  if (duplicateLocks.has(lock)) throw new Error('Duplicate payment record blocked.');
  duplicateLocks.add(lock);
  const paymentRecord = {
    id: normalizeId(payment.id || `PAY-${crypto.randomUUID()}`, 'Payment ID'),
    type: 'PAYMENT',
    tenantKey: invoice.tenantKey,
    customerId: invoice.customerId,
    jobId: invoice.jobId,
    invoiceId: invoice.id,
    method: String(payment.method || 'MANUAL').toUpperCase(),
    reference,
    amountCents,
    status: 'RECORDED',
    providerReference: payment.providerReference || null,
    duplicateLock: lock,
    recordedAt: nowIso(now),
    externalActionOccurred: false,
    rawCardDataStored: false
  };
  const paidCents = invoice.paidCents + amountCents;
  const balanceCents = invoice.totalCents - paidCents;
  const updatedInvoice = {
    ...clone(invoice),
    paidCents,
    balanceCents,
    paymentIds: [...(invoice.paymentIds || []), paymentRecord.id],
    status: balanceCents === 0 ? 'PAID' : 'PARTIALLY_PAID',
    updatedAt: nowIso(now),
    externalActionOccurred: false
  };
  return { payment: paymentRecord, invoice: updatedInvoice };
}

function createCredit({ invoice, amount, reason, ownerId, now = Date.now() }) {
  const amountCents = toCents(amount);
  if (amountCents <= 0 || amountCents > invoice.balanceCents) throw new Error('Credit amount is outside the invoice balance.');
  const credit = {
    id: `CREDIT-${crypto.randomUUID()}`,
    type: 'CREDIT',
    tenantKey: invoice.tenantKey,
    customerId: invoice.customerId,
    jobId: invoice.jobId,
    invoiceId: invoice.id,
    amountCents,
    reason: normalizeText(reason, 'Credit reason', 5, 1000),
    approvedBy: normalizeId(ownerId, 'Owner ID'),
    status: 'RECORDED',
    createdAt: nowIso(now),
    externalActionOccurred: false
  };
  const balanceCents = invoice.balanceCents - amountCents;
  return {
    credit,
    invoice: {
      ...clone(invoice),
      balanceCents,
      creditIds: [...(invoice.creditIds || []), credit.id],
      status: balanceCents === 0 ? 'CREDITED' : invoice.status,
      updatedAt: nowIso(now),
      externalActionOccurred: false
    }
  };
}

function createRefundRequest({ payment, amount, reason, ownerId, now = Date.now() }) {
  const amountCents = toCents(amount);
  if (amountCents <= 0 || amountCents > payment.amountCents) throw new Error('Refund amount is invalid.');
  return {
    id: `REFUND-${crypto.randomUUID()}`,
    type: 'REFUND_REQUEST',
    tenantKey: payment.tenantKey,
    customerId: payment.customerId,
    paymentId: payment.id,
    invoiceId: payment.invoiceId,
    amountCents,
    reason: normalizeText(reason, 'Refund reason', 5, 1000),
    ownerApproval: {
      ownerId: normalizeId(ownerId, 'Owner ID'),
      action: 'EXECUTE_REFUND',
      approvedAt: nowIso(now)
    },
    status: 'APPROVED_BUT_LOCKED',
    createdAt: nowIso(now),
    automaticRetry: false,
    externalActionOccurred: false
  };
}

function createContract(input, now = Date.now()) {
  const includedUnits = Number(input.includedUnits ?? 0);
  const recurringCents = toCents(input.recurringAmount ?? 0);
  if (!Number.isFinite(includedUnits) || includedUnits < 0) throw new Error('Included usage must be zero or greater.');
  if (recurringCents < 0) throw new Error('Recurring amount cannot be negative.');
  return {
    id: normalizeId(input.id || `CONTRACT-${crypto.randomUUID()}`, 'Contract ID'),
    type: 'CONTRACT',
    tenantKey: normalizeId(input.tenantKey, 'Tenant key').toLowerCase(),
    customerId: normalizeId(input.customerId, 'Customer ID'),
    productId: input.productId ? normalizeId(input.productId, 'Product ID') : null,
    name: normalizeText(input.name, 'Contract name', 2, 200),
    status: 'DRAFT',
    recurringCents,
    billingFrequency: String(input.billingFrequency || 'MONTHLY').toUpperCase(),
    includedUnits,
    usedUnits: 0,
    overageUnitCents: toCents(input.overageUnitPrice ?? 0),
    rolloverAllowed: Boolean(input.rolloverAllowed),
    startAt: input.startAt || null,
    renewAt: input.renewAt || null,
    cancelAt: null,
    automaticRenewalExecution: false,
    automaticBillingExecution: false,
    createdAt: nowIso(now),
    updatedAt: nowIso(now),
    externalActionOccurred: false
  };
}

function activateContract(contract, ownerId, now = Date.now()) {
  if (!['DRAFT', 'OWNER_REVIEW'].includes(contract.status)) throw new Error('Contract cannot be activated from its current state.');
  return {
    ...clone(contract),
    status: 'ACTIVE',
    activatedBy: normalizeId(ownerId, 'Owner ID'),
    activatedAt: nowIso(now),
    updatedAt: nowIso(now),
    automaticRenewalExecution: false,
    automaticBillingExecution: false,
    externalActionOccurred: false
  };
}

function recordContractUsage(contract, units, reference, now = Date.now(), duplicateLocks = new Set()) {
  if (contract.status !== 'ACTIVE') throw new Error('Contract is not active.');
  const amount = Number(units);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Usage units must be greater than zero.');
  const ref = normalizeText(reference, 'Usage reference', 2, 200);
  const lock = sha256(`${contract.tenantKey}|${contract.id}|${ref}|${amount}`);
  if (duplicateLocks.has(lock)) throw new Error('Duplicate usage record blocked.');
  duplicateLocks.add(lock);
  const usedUnits = Number(contract.usedUnits || 0) + amount;
  const overageUnits = Math.max(0, usedUnits - Number(contract.includedUnits || 0));
  return {
    usage: {
      id: `USAGE-${crypto.randomUUID()}`,
      contractId: contract.id,
      tenantKey: contract.tenantKey,
      customerId: contract.customerId,
      units: amount,
      reference: ref,
      duplicateLock: lock,
      recordedAt: nowIso(now),
      externalActionOccurred: false
    },
    contract: {
      ...clone(contract),
      usedUnits,
      overageUnits,
      estimatedOverageCents: Math.round(overageUnits * Number(contract.overageUnitCents || 0)),
      updatedAt: nowIso(now),
      externalActionOccurred: false
    }
  };
}

function buildRecurringInvoiceDraft(contract, periodLabel, now = Date.now()) {
  if (contract.status !== 'ACTIVE') throw new Error('Contract must be active.');
  const overageCents = Math.round(Math.max(0, Number(contract.usedUnits || 0) - Number(contract.includedUnits || 0)) * Number(contract.overageUnitCents || 0));
  const lines = [
    { id: 'RECURRING', description: `${contract.name} — ${periodLabel}`, quantity: 1, unitPrice: fromCents(contract.recurringCents) }
  ];
  if (overageCents > 0) lines.push({ id: 'OVERAGE', description: `Usage overage — ${periodLabel}`, quantity: 1, unitPrice: fromCents(overageCents) });
  const invoice = createInvoice({
    tenantKey: contract.tenantKey,
    customerId: contract.customerId,
    contractId: contract.id,
    invoiceType: 'RECURRING',
    lines
  }, now);
  invoice.status = 'OWNER_REVIEW';
  invoice.externalActionOccurred = false;
  return invoice;
}

function createCommunicationDraft(input, now = Date.now()) {
  const channel = String(input.channel || 'EMAIL').toUpperCase();
  return {
    id: normalizeId(input.id || `COMM-${crypto.randomUUID()}`, 'Communication ID'),
    type: 'COMMUNICATION',
    tenantKey: normalizeId(input.tenantKey, 'Tenant key').toLowerCase(),
    customerId: input.customerId ? normalizeId(input.customerId, 'Customer ID') : null,
    jobId: input.jobId ? normalizeId(input.jobId, 'Job ID') : null,
    relatedRecordId: input.relatedRecordId ? normalizeId(input.relatedRecordId, 'Related record ID') : null,
    channel,
    to: normalizeText(input.to || 'OWNER_REVIEW_REQUIRED', 'Recipient', 2, 500),
    subject: normalizeText(input.subject || 'Highway 38 update', 'Subject', 2, 300),
    body: normalizeText(input.body, 'Message body', 2, 12000),
    status: 'DRAFT',
    version: 1,
    ownerApproval: null,
    providerReference: null,
    sentAt: null,
    createdAt: nowIso(now),
    updatedAt: nowIso(now),
    externalActionOccurred: false
  };
}

function scheduleSocialPost(post, scheduledAt, now = Date.now()) {
  if (post.publishAllowed !== false) throw new Error('Source content must remain owner-controlled.');
  const timestamp = new Date(scheduledAt);
  if (Number.isNaN(timestamp.getTime())) throw new Error('Scheduled time is invalid.');
  return {
    id: `SOCIAL-${String(post.day).padStart(2, '0')}-${crypto.randomUUID()}`,
    type: 'SOCIAL_SCHEDULE',
    day: post.day,
    theme: post.theme,
    draft: post.draft,
    platforms: clone(post.platforms),
    assetRequirement: post.asset,
    scheduledAt: timestamp.toISOString(),
    status: 'INTERNAL_SCHEDULE_ONLY',
    publishAllowed: false,
    ownerApproval: null,
    publishedAt: null,
    providerReference: null,
    createdAt: nowIso(now),
    externalActionOccurred: false
  };
}

function createAdvertisingPlan(input, now = Date.now()) {
  const dailyBudgetCents = toCents(input.dailyBudget ?? 0);
  const totalBudgetCents = toCents(input.totalBudget ?? 0);
  if (dailyBudgetCents < 0 || totalBudgetCents < 0) throw new Error('Advertising budgets cannot be negative.');
  if (dailyBudgetCents > totalBudgetCents && totalBudgetCents > 0) throw new Error('Daily budget cannot exceed total budget.');
  return {
    id: normalizeId(input.id || `AD-${crypto.randomUUID()}`, 'Campaign ID'),
    type: 'ADVERTISING_PLAN',
    tenantKey: normalizeId(input.tenantKey, 'Tenant key').toLowerCase(),
    name: normalizeText(input.name, 'Campaign name', 2, 200),
    objective: normalizeText(input.objective, 'Campaign objective', 5, 1000),
    dailyBudgetCents,
    totalBudgetCents,
    status: 'PLAN_ONLY',
    launchEnabled: false,
    spendEnabled: false,
    ownerApproval: null,
    providerReference: null,
    createdAt: nowIso(now),
    externalActionOccurred: false
  };
}

function createWebsiteChange(input, now = Date.now()) {
  return {
    id: normalizeId(input.id || `WEB-${crypto.randomUUID()}`, 'Website change ID'),
    type: 'WEBSITE_CHANGE',
    tenantKey: normalizeId(input.tenantKey, 'Tenant key').toLowerCase(),
    title: normalizeText(input.title, 'Change title', 2, 300),
    description: normalizeText(input.description, 'Change description', 5, 5000),
    rollbackRef: normalizeText(input.rollbackRef, 'Rollback reference', 4, 200),
    status: 'REVIEW_ONLY',
    deploymentEnabled: false,
    deployedAt: null,
    createdAt: nowIso(now),
    externalActionOccurred: false
  };
}

function calculateProfitability({ revenueRecords = [], expenseRecords = [], grouping = 'jobId' }) {
  const groups = new Map();
  function row(key) {
    const normalized = key || 'UNASSIGNED';
    if (!groups.has(normalized)) groups.set(normalized, { key: normalized, revenueCents: 0, expenseCents: 0, profitCents: 0, marginPercent: null });
    return groups.get(normalized);
  }
  for (const record of revenueRecords) row(record[grouping]).revenueCents += Number(record.amountCents ?? record.totalCents ?? 0);
  for (const record of expenseRecords) row(record[grouping]).expenseCents += Number(record.amountCents ?? 0);
  for (const group of groups.values()) {
    group.profitCents = group.revenueCents - group.expenseCents;
    group.marginPercent = group.revenueCents ? Number(((group.profitCents / group.revenueCents) * 100).toFixed(2)) : null;
  }
  return [...groups.values()].sort((a, b) => String(a.key).localeCompare(String(b.key)));
}

function calculateAttribution({ leads = [], quotes = [], invoices = [], payments = [] }) {
  const campaigns = new Map();
  function get(id) {
    const key = id || 'UNATTRIBUTED';
    if (!campaigns.has(key)) campaigns.set(key, { campaignId: key, leads: 0, qualifiedLeads: 0, quotes: 0, acceptedQuotes: 0, invoices: 0, invoicedCents: 0, payments: 0, paidCents: 0 });
    return campaigns.get(key);
  }
  for (const lead of leads) {
    const group = get(lead.campaignId);
    group.leads += 1;
    if (lead.qualified) group.qualifiedLeads += 1;
  }
  for (const quote of quotes) {
    const group = get(quote.campaignId);
    group.quotes += 1;
    if (quote.status === 'ACCEPTED') group.acceptedQuotes += 1;
  }
  for (const invoice of invoices) {
    const group = get(invoice.campaignId);
    group.invoices += 1;
    group.invoicedCents += Number(invoice.totalCents || 0);
  }
  for (const payment of payments) {
    const group = get(payment.campaignId);
    group.payments += 1;
    group.paidCents += Number(payment.amountCents || 0);
  }
  return [...campaigns.values()].map(group => ({
    ...group,
    leadToQuotePercent: group.leads ? Number(((group.quotes / group.leads) * 100).toFixed(2)) : 0,
    quoteAcceptancePercent: group.quotes ? Number(((group.acceptedQuotes / group.quotes) * 100).toFixed(2)) : 0
  }));
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function rowsToCsv(rows) {
  return rows.map(row => row.map(csvCell).join(',')).join('\n') + '\n';
}

function buildGeneralLedgerCsv({ invoices = [], payments = [], expenses = [], credits = [] }) {
  const rows = [['Record Type', 'Record ID', 'Date', 'Customer ID', 'Job ID', 'Reference', 'Debit', 'Credit', 'Status']];
  for (const invoice of invoices) rows.push(['Invoice', invoice.id, invoice.sentAt || invoice.createdAt, invoice.customerId, invoice.jobId, invoice.invoiceType, fromCents(invoice.totalCents), '', invoice.status]);
  for (const payment of payments) rows.push(['Payment', payment.id, payment.recordedAt, payment.customerId, payment.jobId, payment.reference, '', fromCents(payment.amountCents), payment.status]);
  for (const expense of expenses) rows.push(['Expense', expense.id, expense.date || expense.createdAt, expense.customerId, expense.jobId, expense.category || expense.description, fromCents(expense.amountCents), '', expense.status || 'RECORDED']);
  for (const credit of credits) rows.push(['Credit', credit.id, credit.createdAt, credit.customerId, credit.jobId, credit.reason, '', fromCents(credit.amountCents), credit.status]);
  return rowsToCsv(rows);
}

function integrationHealth(config) {
  const providers = config.providers || {};
  return Object.entries(providers).map(([id, provider]) => ({
    id,
    mode: provider.mode,
    status: provider.status,
    executionState: config.controls.externalActionsEnabled ? 'REQUIRES_RUNTIME_GATE' : 'LOCKED',
    blocker: provider.status === 'READY' ? null : 'Provider credentials, connection test, regression test, rollback, and owner release are required.'
  }));
}

function proofEntry(action, result, context = {}, now = Date.now()) {
  return {
    id: `PROOF-${crypto.randomUUID()}`,
    timestamp: nowIso(now),
    action,
    result,
    tenantKey: context.tenantKey || null,
    customerId: context.customerId || null,
    jobId: context.jobId || null,
    recordId: context.recordId || null,
    providerReference: context.providerReference || null,
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
    tenantKey: context.tenantKey || null,
    customerId: context.customerId || null,
    jobId: context.jobId || null,
    recordId: context.recordId || null,
    providerReference: context.providerReference || null,
    automaticRetry: false,
    externalActionOccurred: Boolean(context.externalActionOccurred)
  };
}

module.exports = {
  EXTERNAL_ACTIONS,
  sha256,
  toCents,
  fromCents,
  calculateLine,
  calculateDocumentTotals,
  validateConfig,
  createQuote,
  reviseQuote,
  approveRecordForAction,
  createActionEnvelope,
  validateExecutionGate,
  acceptQuote,
  createInvoice,
  recordManualPayment,
  createCredit,
  createRefundRequest,
  createContract,
  activateContract,
  recordContractUsage,
  buildRecurringInvoiceDraft,
  createCommunicationDraft,
  scheduleSocialPost,
  createAdvertisingPlan,
  createWebsiteChange,
  calculateProfitability,
  calculateAttribution,
  rowsToCsv,
  buildGeneralLedgerCsv,
  integrationHealth,
  proofEntry,
  errorEntry
};
