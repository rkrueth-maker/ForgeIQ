'use strict';

const crypto = require('crypto');

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
}

function normalizeId(value, label = 'ID') {
  const text = String(value || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/.test(text) || text.includes('..')) throw new Error(`${label} is invalid.`);
  return text;
}

function cents(value, label = 'Amount') {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} is invalid.`);
  return Math.round(number * 100);
}

function dollars(value) {
  return Number((Number(value) / 100).toFixed(2));
}

function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') return ['Configuration must be an object.'];
  if (config.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (config.engine?.status !== 'CONTROLLED_NOT_CONNECTED') errors.push('Engine must default to CONTROLLED_NOT_CONNECTED.');
  if (config.controls?.selectedRecordOnly !== true) errors.push('Selected-record execution is required.');
  if (config.controls?.bulkExecution !== false) errors.push('Bulk execution must remain disabled.');
  if (config.controls?.automaticRetry !== false) errors.push('Automatic retry must remain disabled.');
  if (config.controls?.duplicateProtectionRequired !== true) errors.push('Duplicate protection is required.');
  if (config.controls?.ownerApprovalRequired !== true) errors.push('Owner approval is required.');
  if (config.controls?.proofLogRequired !== true || config.controls?.errorLogRequired !== true) errors.push('Proof and Error Logs are required.');
  if (config.controls?.externalActionsEnabled !== false) errors.push('External actions must default to disabled.');
  if (config.payments?.hostedProviderOnly !== true || config.payments?.rawCardDataAllowed !== false) errors.push('Payments must be provider-hosted and raw payment-card data must be forbidden.');
  if (Object.values(config.externalActions || {}).some(value => value !== false)) errors.push('Every external action must default to disabled.');
  return errors;
}

function assertSelectedRecord(record, expectedType) {
  if (!record || Array.isArray(record)) throw new Error('Exactly one selected record is required.');
  if (expectedType && record.type !== expectedType) throw new Error(`Selected record must be ${expectedType}.`);
  normalizeId(record.id, 'Record ID');
  return record;
}

function duplicateKey(actionType, record, version, destination = '') {
  return sha256({ actionType, recordId: normalizeId(record.id, 'Record ID'), version: Number(version || 1), destination: String(destination || '').trim().toLowerCase() });
}

function createQuote({ id, customerId, jobId, lines, taxRate = 0, validUntil, version = 1, now = Date.now() }) {
  const normalizedLines = (lines || []).map((line, index) => {
    const quantity = Number(line.quantity || 0);
    const unitCents = cents(line.unitPrice, `Line ${index + 1} unit price`);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Line ${index + 1} quantity is invalid.`);
    return { id: normalizeId(line.id || `LINE-${index + 1}`, 'Line ID'), description: String(line.description || '').trim(), quantity, unitCents, totalCents: Math.round(quantity * unitCents) };
  });
  if (!normalizedLines.length) throw new Error('Quote requires at least one line.');
  const subtotalCents = normalizedLines.reduce((sum, line) => sum + line.totalCents, 0);
  const taxCents = Math.round(subtotalCents * Number(taxRate || 0));
  return {
    type: 'QUOTE', id: normalizeId(id, 'Quote ID'), customerId: normalizeId(customerId, 'Customer ID'), jobId: normalizeId(jobId, 'Job ID'),
    version: Number(version), status: 'DRAFT', lines: normalizedLines, subtotalCents, taxCents, totalCents: subtotalCents + taxCents,
    validUntil: validUntil || null, createdAt: new Date(now).toISOString(), externalActionOccurred: false
  };
}

function createInvoice({ id, customerId, jobId, quoteId = null, lines, dueDate, scheduleType = 'FINAL', version = 1, now = Date.now() }) {
  const normalizedLines = (lines || []).map((line, index) => {
    const amountCents = line.amountCents !== undefined ? Number(line.amountCents) : cents(line.amount, `Invoice line ${index + 1}`);
    if (!Number.isInteger(amountCents) || amountCents < 0) throw new Error(`Invoice line ${index + 1} is invalid.`);
    return { id: normalizeId(line.id || `LINE-${index + 1}`, 'Line ID'), description: String(line.description || '').trim(), amountCents };
  });
  if (!normalizedLines.length) throw new Error('Invoice requires at least one line.');
  const totalCents = normalizedLines.reduce((sum, line) => sum + line.amountCents, 0);
  return {
    type: 'INVOICE', id: normalizeId(id, 'Invoice ID'), customerId: normalizeId(customerId, 'Customer ID'), jobId: normalizeId(jobId, 'Job ID'), quoteId: quoteId ? normalizeId(quoteId, 'Quote ID') : null,
    version: Number(version), status: 'DRAFT', scheduleType, lines: normalizedLines, totalCents, paidCents: 0, creditedCents: 0, refundedCents: 0,
    balanceCents: totalCents, dueDate: dueDate || null, createdAt: new Date(now).toISOString(), externalActionOccurred: false
  };
}

function prepareControlledAction({ config, actionType, record, destination = '', payload = {}, now = Date.now(), locks = new Set() }) {
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.join(' '));
  assertSelectedRecord(record);
  if (!Object.prototype.hasOwnProperty.call(config.externalActions, actionType)) throw new Error(`Unknown external action: ${actionType}.`);
  const lock = duplicateKey(actionType, record, record.version || 1, destination);
  if (locks.has(lock)) throw new Error('Duplicate external action preparation blocked.');
  locks.add(lock);
  return {
    id: `ACT-${crypto.randomUUID()}`, actionType, recordType: record.type, recordId: record.id, recordVersion: Number(record.version || 1),
    destination: String(destination || '').trim(), payload, status: 'NEEDS_OWNER_APPROVAL', duplicateLock: lock,
    provider: null, providerReference: null, preparedAt: new Date(now).toISOString(), approvedAt: null, executedAt: null,
    externalActionOccurred: false, automaticRetry: false
  };
}

function approveControlledAction({ action, ownerId, now = Date.now() }) {
  if (!action || action.status !== 'NEEDS_OWNER_APPROVAL') throw new Error('Action is not awaiting owner approval.');
  return { ...action, status: 'APPROVED_NOT_EXECUTED', ownerId: normalizeId(ownerId, 'Owner ID'), approvedAt: new Date(now).toISOString(), externalActionOccurred: false };
}

function recordProviderResult({ action, provider, providerReference, outcome, now = Date.now() }) {
  if (!action || action.status !== 'APPROVED_NOT_EXECUTED') throw new Error('Action must be explicitly approved before provider result recording.');
  const state = String(outcome || '').toUpperCase();
  if (!['SUCCESS', 'FAILED', 'UNCERTAIN'].includes(state)) throw new Error('Provider outcome is invalid.');
  return {
    ...action, status: state === 'SUCCESS' ? 'EXECUTED' : state, provider: String(provider || '').trim(), providerReference: providerReference || null,
    executedAt: new Date(now).toISOString(), externalActionOccurred: state !== 'FAILED', automaticRetry: false,
    nextAction: state === 'UNCERTAIN' ? 'Owner must verify provider state before any retry.' : null
  };
}

function validateHostedPaymentLink({ config, invoice, provider, url }) {
  assertSelectedRecord(invoice, 'INVOICE');
  if (invoice.balanceCents <= 0) throw new Error('Invoice has no payable balance.');
  if (!config.payments.approvedProviders.includes(provider)) throw new Error('Payment provider is not approved.');
  let parsed;
  try { parsed = new URL(url); } catch (_) { throw new Error('Hosted payment URL is invalid.'); }
  if (!config.payments.allowedUrlSchemes.includes(parsed.protocol)) throw new Error('Hosted payment URL scheme is not allowed.');
  if (parsed.username || parsed.password) throw new Error('Hosted payment URL may not contain credentials.');
  return { invoiceId: invoice.id, provider, hostedUrl: parsed.toString(), balanceCents: invoice.balanceCents, rawCardDataStored: false, externalActionOccurred: false };
}

function recordPayment({ invoice, id, amount, provider, providerReference, receivedAt = Date.now() }) {
  assertSelectedRecord(invoice, 'INVOICE');
  const amountCents = cents(amount, 'Payment amount');
  if (amountCents <= 0 || amountCents > invoice.balanceCents) throw new Error('Payment amount exceeds the payable balance or is invalid.');
  const updated = { ...invoice, paidCents: invoice.paidCents + amountCents };
  updated.balanceCents = updated.totalCents - updated.paidCents - updated.creditedCents + updated.refundedCents;
  updated.status = updated.balanceCents === 0 ? 'PAID' : 'PARTIALLY_PAID';
  return {
    invoice: updated,
    payment: { type: 'PAYMENT', id: normalizeId(id, 'Payment ID'), invoiceId: invoice.id, customerId: invoice.customerId, amountCents, provider: String(provider || '').trim(), providerReference: providerReference || null, receivedAt: new Date(receivedAt).toISOString(), status: 'RECORDED', externalActionOccurred: true }
  };
}

function createAdjustmentRequest({ invoice, id, kind, amount, reason, now = Date.now() }) {
  assertSelectedRecord(invoice, 'INVOICE');
  const type = String(kind || '').toUpperCase();
  if (!['CREDIT', 'REFUND'].includes(type)) throw new Error('Adjustment must be CREDIT or REFUND.');
  const amountCents = cents(amount, `${type} amount`);
  if (amountCents <= 0) throw new Error(`${type} amount is invalid.`);
  if (type === 'REFUND' && amountCents > invoice.paidCents - invoice.refundedCents) throw new Error('Refund exceeds recorded net payments.');
  return { type, id: normalizeId(id, `${type} ID`), invoiceId: invoice.id, customerId: invoice.customerId, amountCents, reason: String(reason || '').trim(), status: 'NEEDS_OWNER_APPROVAL', createdAt: new Date(now).toISOString(), externalActionOccurred: false };
}

function createContract({ id, customerId, name, billingFrequency, recurringAmount, includedUsage = {}, startDate, renewalDate, now = Date.now() }) {
  return {
    type: 'CONTRACT', id: normalizeId(id, 'Contract ID'), customerId: normalizeId(customerId, 'Customer ID'), name: String(name || '').trim(),
    billingFrequency: String(billingFrequency || '').toUpperCase(), recurringAmountCents: cents(recurringAmount, 'Recurring amount'), includedUsage,
    used: {}, status: 'DRAFT', startDate: startDate || null, renewalDate: renewalDate || null, createdAt: new Date(now).toISOString(), externalActionOccurred: false
  };
}

function recordContractUsage({ contract, metric, quantity, recordId, now = Date.now(), locks = new Set() }) {
  assertSelectedRecord(contract, 'CONTRACT');
  const key = sha256({ contractId: contract.id, metric, recordId });
  if (locks.has(key)) throw new Error('Duplicate contract usage blocked.');
  locks.add(key);
  const used = { ...(contract.used || {}) };
  used[metric] = Number(used[metric] || 0) + Number(quantity || 0);
  return { contract: { ...contract, used }, usage: { id: normalizeId(recordId, 'Usage record ID'), contractId: contract.id, metric, quantity: Number(quantity), recordedAt: new Date(now).toISOString(), duplicateLock: key } };
}

function contractUsageStatus(contract) {
  assertSelectedRecord(contract, 'CONTRACT');
  const metrics = {};
  for (const [metric, included] of Object.entries(contract.includedUsage || {})) {
    const used = Number(contract.used?.[metric] || 0);
    metrics[metric] = { included: Number(included), used, remaining: Math.max(Number(included) - used, 0), overage: Math.max(used - Number(included), 0) };
  }
  return { contractId: contract.id, metrics };
}

function createExpense({ id, category, vendor, amount, incurredAt, campaignId = null, jobId = null, now = Date.now() }) {
  return { type: 'EXPENSE', id: normalizeId(id, 'Expense ID'), category: String(category || '').trim(), vendor: String(vendor || '').trim(), amountCents: cents(amount, 'Expense amount'), incurredAt: incurredAt || new Date(now).toISOString(), campaignId: campaignId ? normalizeId(campaignId, 'Campaign ID') : null, jobId: jobId ? normalizeId(jobId, 'Job ID') : null, status: 'RECORDED', externalActionOccurred: false };
}

function profitabilityReport({ invoices = [], payments = [], credits = [], refunds = [], expenses = [] }) {
  const invoicedCents = invoices.reduce((sum, item) => sum + Number(item.totalCents || 0), 0);
  const receivedCents = payments.reduce((sum, item) => sum + Number(item.amountCents || 0), 0);
  const creditCents = credits.reduce((sum, item) => sum + Number(item.amountCents || 0), 0);
  const refundCents = refunds.reduce((sum, item) => sum + Number(item.amountCents || 0), 0);
  const expenseCents = expenses.reduce((sum, item) => sum + Number(item.amountCents || 0), 0);
  const netCashCents = receivedCents - refundCents - expenseCents;
  const expectedReceivableCents = invoicedCents - receivedCents - creditCents + refundCents;
  return { invoiced: dollars(invoicedCents), received: dollars(receivedCents), credits: dollars(creditCents), refunds: dollars(refundCents), expenses: dollars(expenseCents), netCash: dollars(netCashCents), expectedReceivable: dollars(expectedReceivableCents) };
}

function attributionReport({ leads = [], invoices = [], payments = [], expenses = [] }) {
  const result = {};
  const ensure = id => result[id] || (result[id] = { campaignId: id, leads: 0, invoicedCents: 0, receivedCents: 0, spendCents: 0 });
  leads.forEach(item => ensure(item.campaignId || 'UNATTRIBUTED').leads++);
  invoices.forEach(item => ensure(item.campaignId || 'UNATTRIBUTED').invoicedCents += Number(item.totalCents || 0));
  payments.forEach(item => ensure(item.campaignId || 'UNATTRIBUTED').receivedCents += Number(item.amountCents || 0));
  expenses.forEach(item => ensure(item.campaignId || 'UNATTRIBUTED').spendCents += Number(item.amountCents || 0));
  return Object.values(result).map(item => ({ ...item, returnOnSpend: item.spendCents ? Number(((item.receivedCents - item.spendCents) / item.spendCents).toFixed(4)) : null }));
}

function accountingCsv(events) {
  const header = ['event_id','event_type','event_date','customer_id','job_id','invoice_id','amount','status','provider_reference'];
  const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = (events || []).map(event => [event.id, event.type, event.date || event.receivedAt || event.incurredAt || event.createdAt || '', event.customerId || '', event.jobId || '', event.invoiceId || '', dollars(Number(event.amountCents ?? event.totalCents ?? 0)), event.status || '', event.providerReference || ''].map(escape).join(','));
  return [header.join(','), ...rows].join('\n') + '\n';
}

function draftCommunication({ id, record, channel, to, subject = '', body, now = Date.now() }) {
  assertSelectedRecord(record);
  const text = String(body || '').trim();
  if (text.length < 2 || text.length > 12000) throw new Error('Communication body must contain 2–12000 characters.');
  return { type: 'COMMUNICATION', id: normalizeId(id, 'Communication ID'), recordType: record.type, recordId: record.id, channel: String(channel || '').toUpperCase(), to: String(to || '').trim(), subject: String(subject || '').trim(), body: text, status: 'NEEDS_OWNER_REVIEW', createdAt: new Date(now).toISOString(), externalActionOccurred: false };
}

function scheduleSocialInternal({ id, platform, body, scheduledFor, campaignId = null, assetIds = [], now = Date.now() }) {
  return { type: 'SOCIAL', id: normalizeId(id, 'Social record ID'), platform: String(platform || '').toUpperCase(), body: String(body || '').trim(), scheduledFor, campaignId: campaignId ? normalizeId(campaignId, 'Campaign ID') : null, assetIds: [...assetIds], status: 'SCHEDULED_INTERNAL', createdAt: new Date(now).toISOString(), externalActionOccurred: false };
}

function prepareWebsiteChange({ id, title, files, rollbackRef, now = Date.now() }) {
  if (!rollbackRef) throw new Error('Website change requires a rollback reference.');
  return { type: 'WEBSITE_CHANGE', id: normalizeId(id, 'Website change ID'), title: String(title || '').trim(), files: [...(files || [])], rollbackRef: String(rollbackRef), status: 'NEEDS_OWNER_REVIEW', createdAt: new Date(now).toISOString(), externalActionOccurred: false };
}

function integrationHealth({ config, providers = {} }) {
  const requiredSlots = ['payment','email','accounting','social','website'];
  const slots = requiredSlots.map(slot => {
    const provider = providers[slot] || {};
    const credentials = provider.credentials === true;
    const tests = provider.testsPassed === true;
    const ownerRelease = provider.ownerRelease === true;
    return { slot, provider: provider.name || null, credentials, testsPassed: tests, ownerRelease, status: credentials && tests && ownerRelease ? 'ELIGIBLE_NOT_ENABLED' : 'BLOCKED' };
  });
  return { status: slots.every(slot => slot.status === 'ELIGIBLE_NOT_ENABLED') ? 'READY_FOR_EXPLICIT_ENABLEMENT' : 'BLOCKED', externalActionsEnabled: config.controls.externalActionsEnabled, slots };
}

function proofEntry(action, result, context = {}, now = Date.now()) {
  return { id: `PROOF-${crypto.randomUUID()}`, timestamp: new Date(now).toISOString(), action, result, recordId: context.recordId || null, providerReference: context.providerReference || null, externalActionOccurred: Boolean(context.externalActionOccurred), digest: sha256({ action, result, context }) };
}

function errorEntry(action, error, context = {}, now = Date.now()) {
  return { id: `ERROR-${crypto.randomUUID()}`, timestamp: new Date(now).toISOString(), action, message: String(error?.message || error), recordId: context.recordId || null, providerReference: context.providerReference || null, automaticRetry: false, externalActionOccurred: Boolean(context.externalActionOccurred) };
}

module.exports = {
  sha256, cents, dollars, validateConfig, assertSelectedRecord, duplicateKey, createQuote, createInvoice,
  prepareControlledAction, approveControlledAction, recordProviderResult, validateHostedPaymentLink, recordPayment,
  createAdjustmentRequest, createContract, recordContractUsage, contractUsageStatus, createExpense,
  profitabilityReport, attributionReport, accountingCsv, draftCommunication, scheduleSocialInternal,
  prepareWebsiteChange, integrationHealth, proofEntry, errorEntry
};
