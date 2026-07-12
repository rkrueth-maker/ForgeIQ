'use strict';

const crypto = require('crypto');

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

function normalizeId(value, label = 'ID') {
  const text = String(value || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/.test(text) || text.includes('..')) throw new Error(`${label} is invalid.`);
  return text;
}

function normalizeCurrency(value) {
  const currency = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency code is invalid.');
  return currency;
}

function asCents(value, label = 'Amount') {
  const cents = Number(value);
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error(`${label} must be a non-negative integer number of cents.`);
  return cents;
}

function requirePositiveCents(value, label = 'Amount') {
  const cents = asCents(value, label);
  if (cents <= 0) throw new Error(`${label} must be greater than zero.`);
  return cents;
}

function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') return ['Configuration must be an object.'];
  if (config.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (config.controls?.selectedRecordOnly !== true) errors.push('Selected-record execution is required.');
  if (config.controls?.bulkExecution !== false) errors.push('Bulk execution must remain disabled.');
  if (config.controls?.automaticRetry !== false) errors.push('Automatic retry must remain disabled.');
  if (config.controls?.duplicateProtection !== true) errors.push('Duplicate protection is required.');
  if (config.controls?.ownerApprovalRequired !== true) errors.push('Owner approval is required.');
  if (config.controls?.proofLogRequired !== true || config.controls?.errorLogRequired !== true) errors.push('Proof and Error Logs are required.');
  if (config.controls?.externalActionsEnabled !== false) errors.push('External actions must default to disabled.');
  if (config.providers?.payment?.rawCardDataAllowed !== false) errors.push('Raw card data must be forbidden.');
  if (config.providers?.email?.liveSend !== false) errors.push('Email live send must default to false.');
  if (config.providers?.payment?.liveRequests !== false || config.providers?.payment?.liveProcessing !== false) errors.push('Payment live actions must default to false.');
  if (config.providers?.social?.livePublishing !== false) errors.push('Social live publishing must default to false.');
  if (config.providers?.website?.liveDeployment !== false) errors.push('Website live deployment must default to false.');
  return errors;
}

function claimLock(lockSet, key, label) {
  if (!(lockSet instanceof Set)) throw new Error('Duplicate lock set is required.');
  const digest = sha256(key);
  if (lockSet.has(digest)) throw new Error(`Duplicate ${label} blocked.`);
  lockSet.add(digest);
  return digest;
}

function sumLineItems(lineItems) {
  if (!Array.isArray(lineItems) || !lineItems.length) throw new Error('At least one line item is required.');
  return lineItems.reduce((total, line, index) => {
    const quantity = Number(line.quantity ?? 1);
    const unitCents = requirePositiveCents(line.unitCents, `Line ${index + 1} unit amount`);
    if (!Number.isFinite(quantity) || quantity <= 0 || Math.round(quantity * 1000) !== quantity * 1000) throw new Error(`Line ${index + 1} quantity is invalid.`);
    return total + Math.round(unitCents * quantity);
  }, 0);
}

function createQuoteDraft({ tenantKey, customerId, quoteId, version = 1, currency = 'USD', lineItems, expiresAt = null, sourceLeadId = null, now = Date.now() }) {
  const subtotalCents = sumLineItems(lineItems);
  return {
    id: normalizeId(quoteId, 'Quote ID'),
    tenantKey: normalizeId(tenantKey, 'Tenant key').toLowerCase(),
    customerId: normalizeId(customerId, 'Customer ID'),
    sourceLeadId: sourceLeadId ? normalizeId(sourceLeadId, 'Lead ID') : null,
    version: Number(version),
    currency: normalizeCurrency(currency),
    lineItems: clone(lineItems),
    subtotalCents,
    totalCents: subtotalCents,
    status: 'DRAFT',
    expiresAt,
    createdAt: new Date(now).toISOString(),
    ownerApprovalRequired: true,
    externalActionOccurred: false
  };
}

function approveQuote({ quote, ownerId, expectedVersion, now = Date.now() }) {
  if (quote.status !== 'DRAFT') throw new Error('Only a draft quote can be owner approved.');
  if (Number(quote.version) !== Number(expectedVersion)) throw new Error('Quote version changed; refresh before approval.');
  return {
    ...clone(quote),
    status: 'OWNER_APPROVED',
    ownerApprovedBy: normalizeId(ownerId, 'Owner ID'),
    ownerApprovedAt: new Date(now).toISOString(),
    externalActionOccurred: false
  };
}

function prepareQuotePresentation({ quote, provider = null, lockSet }) {
  if (quote.status !== 'OWNER_APPROVED') throw new Error('Quote must be owner approved before presentation is prepared.');
  const lock = claimLock(lockSet, `${quote.tenantKey}|${quote.customerId}|${quote.id}|${quote.version}|quote-presentation`, 'quote presentation');
  return {
    action: 'PRESENT_QUOTE',
    recordType: 'quote',
    recordId: quote.id,
    tenantKey: quote.tenantKey,
    customerId: quote.customerId,
    provider,
    duplicateLock: lock,
    executionState: 'LOCKED',
    ownerApprovalVerified: true,
    externalActionOccurred: false
  };
}

function markQuotePresented({ quote, providerReference, now = Date.now() }) {
  if (quote.status !== 'OWNER_APPROVED') throw new Error('Quote must be owner approved before it can be marked presented.');
  return {
    ...clone(quote),
    status: 'PRESENTED',
    providerReference: normalizeId(providerReference, 'Provider reference'),
    presentedAt: new Date(now).toISOString(),
    externalActionOccurred: true
  };
}

function createInvoiceDraft({ tenantKey, customerId, invoiceId, quote = null, contractId = null, billingStage, currency = 'USD', lineItems, dueAt = null, now = Date.now() }) {
  const allowedStages = ['deposit', 'progress', 'final', 'recurring'];
  if (!allowedStages.includes(billingStage)) throw new Error('Billing stage is invalid.');
  if (quote && quote.status !== 'CUSTOMER_APPROVED') throw new Error('Quote must be customer approved before invoice creation.');
  const totalCents = sumLineItems(lineItems);
  return {
    id: normalizeId(invoiceId, 'Invoice ID'),
    tenantKey: normalizeId(tenantKey, 'Tenant key').toLowerCase(),
    customerId: normalizeId(customerId, 'Customer ID'),
    quoteId: quote ? normalizeId(quote.id, 'Quote ID') : null,
    contractId: contractId ? normalizeId(contractId, 'Contract ID') : null,
    billingStage,
    currency: normalizeCurrency(currency),
    lineItems: clone(lineItems),
    totalCents,
    paidCents: 0,
    creditedCents: 0,
    balanceCents: totalCents,
    status: 'DRAFT',
    dueAt,
    createdAt: new Date(now).toISOString(),
    externalActionOccurred: false
  };
}

function approveInvoice({ invoice, ownerId, now = Date.now() }) {
  if (invoice.status !== 'DRAFT') throw new Error('Only a draft invoice can be owner approved.');
  return {
    ...clone(invoice),
    status: 'OWNER_APPROVED',
    ownerApprovedBy: normalizeId(ownerId, 'Owner ID'),
    ownerApprovedAt: new Date(now).toISOString(),
    externalActionOccurred: false
  };
}

function prepareInvoicePresentation({ invoice, provider = null, lockSet }) {
  if (invoice.status !== 'OWNER_APPROVED') throw new Error('Invoice must be owner approved before presentation is prepared.');
  const lock = claimLock(lockSet, `${invoice.tenantKey}|${invoice.customerId}|${invoice.id}|invoice-presentation`, 'invoice presentation');
  return {
    action: 'PRESENT_INVOICE',
    recordType: 'invoice',
    recordId: invoice.id,
    tenantKey: invoice.tenantKey,
    customerId: invoice.customerId,
    provider,
    duplicateLock: lock,
    executionState: 'LOCKED',
    externalActionOccurred: false
  };
}

function validateHostedUrl({ url: rawUrl, provider, approvedProviders, allowedSchemes = ['https:'] }) {
  const providerName = String(provider || '').trim();
  if (!approvedProviders.includes(providerName)) throw new Error('Provider is not approved.');
  let url;
  try { url = new URL(rawUrl); } catch (_) { throw new Error('Hosted URL is invalid.'); }
  if (!allowedSchemes.includes(url.protocol)) throw new Error('Hosted URL scheme is not allowed.');
  if (url.username || url.password) throw new Error('Hosted URL may not contain credentials.');
  return { provider: providerName, url: url.toString() };
}

function prepareHostedPaymentRequest({ invoice, provider, hostedUrl, config, lockSet }) {
  if (!['OWNER_APPROVED', 'PRESENTED', 'PARTIALLY_PAID'].includes(invoice.status)) throw new Error('Invoice is not eligible for a payment request.');
  if (asCents(invoice.balanceCents, 'Invoice balance') <= 0) throw new Error('Invoice has no payable balance.');
  const hosted = validateHostedUrl({
    url: hostedUrl,
    provider,
    approvedProviders: config.providers.payment.approvedProviders,
    allowedSchemes: config.providers.payment.allowedSchemes
  });
  const lock = claimLock(lockSet, `${invoice.tenantKey}|${invoice.customerId}|${invoice.id}|${invoice.balanceCents}|payment-request`, 'payment request');
  return {
    action: 'CREATE_HOSTED_PAYMENT_REQUEST',
    invoiceId: invoice.id,
    tenantKey: invoice.tenantKey,
    customerId: invoice.customerId,
    amountCents: invoice.balanceCents,
    currency: invoice.currency,
    provider: hosted.provider,
    hostedUrl: hosted.url,
    duplicateLock: lock,
    rawCardDataStored: false,
    executionState: 'LOCKED',
    externalActionOccurred: false
  };
}

function signProviderEvent(secret, timestamp, rawBody) {
  const key = Buffer.from(String(secret || ''), 'utf8');
  if (key.length < 32) throw new Error('Provider webhook secret must contain at least 32 bytes.');
  return crypto.createHmac('sha256', key).update(`${timestamp}.${rawBody}`).digest('hex');
}

function verifyProviderEvent({ secret, timestamp, rawBody, signature, now = Date.now(), toleranceSeconds = 300 }) {
  const eventTime = Number(timestamp);
  if (!Number.isSafeInteger(eventTime)) throw new Error('Provider event timestamp is invalid.');
  if (Math.abs(Math.floor(now / 1000) - eventTime) > Number(toleranceSeconds)) throw new Error('Provider event timestamp is outside tolerance.');
  const expected = Buffer.from(signProviderEvent(secret, eventTime, rawBody), 'hex');
  let provided;
  try { provided = Buffer.from(String(signature || ''), 'hex'); } catch (_) { throw new Error('Provider event signature is invalid.'); }
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) throw new Error('Provider event signature is invalid.');
  return true;
}

function recordPaymentEvent({ invoice, event, eventLockSet, now = Date.now() }) {
  if (!event || event.type !== 'PAYMENT_SUCCEEDED') throw new Error('Payment event type is not supported.');
  const eventId = normalizeId(event.id, 'Provider event ID');
  const paymentId = normalizeId(event.paymentId, 'Payment ID');
  const amountCents = requirePositiveCents(event.amountCents, 'Payment amount');
  if (event.invoiceId !== invoice.id) throw new Error('Payment event invoice does not match.');
  if (normalizeCurrency(event.currency) !== normalizeCurrency(invoice.currency)) throw new Error('Payment event currency does not match.');
  if (amountCents > asCents(invoice.balanceCents, 'Invoice balance')) throw new Error('Payment exceeds invoice balance.');
  const duplicateLock = claimLock(eventLockSet, `${event.provider}|${eventId}`, 'payment event');
  const paidCents = asCents(invoice.paidCents, 'Invoice paid amount') + amountCents;
  const balanceCents = asCents(invoice.totalCents, 'Invoice total') - paidCents - asCents(invoice.creditedCents, 'Invoice credited amount');
  const updatedInvoice = {
    ...clone(invoice),
    paidCents,
    balanceCents,
    status: balanceCents === 0 ? 'PAID' : 'PARTIALLY_PAID',
    lastPaymentAt: new Date(now).toISOString()
  };
  const payment = {
    id: paymentId,
    providerEventId: eventId,
    provider: String(event.provider || ''),
    providerReference: String(event.providerReference || ''),
    invoiceId: invoice.id,
    tenantKey: invoice.tenantKey,
    customerId: invoice.customerId,
    amountCents,
    currency: invoice.currency,
    status: 'RECEIVED',
    receivedAt: new Date(now).toISOString(),
    duplicateLock,
    rawCardDataStored: false,
    externalActionOccurred: true
  };
  return { invoice: updatedInvoice, payment };
}

function createCreditDraft({ invoice, creditId, amountCents, reason, now = Date.now() }) {
  const amount = requirePositiveCents(amountCents, 'Credit amount');
  if (amount > asCents(invoice.balanceCents, 'Invoice balance')) throw new Error('Credit exceeds invoice balance.');
  const text = String(reason || '').trim();
  if (text.length < 3 || text.length > 500) throw new Error('Credit reason is invalid.');
  return {
    id: normalizeId(creditId, 'Credit ID'),
    invoiceId: invoice.id,
    tenantKey: invoice.tenantKey,
    customerId: invoice.customerId,
    amountCents: amount,
    reason: text,
    status: 'DRAFT',
    ownerApprovalRequired: true,
    createdAt: new Date(now).toISOString(),
    externalActionOccurred: false
  };
}

function applyApprovedCredit({ invoice, credit, ownerId, now = Date.now() }) {
  if (credit.status !== 'DRAFT') throw new Error('Only a draft credit can be approved.');
  const amount = requirePositiveCents(credit.amountCents, 'Credit amount');
  if (amount > asCents(invoice.balanceCents, 'Invoice balance')) throw new Error('Credit exceeds invoice balance.');
  const creditedCents = asCents(invoice.creditedCents, 'Invoice credited amount') + amount;
  const balanceCents = asCents(invoice.totalCents, 'Invoice total') - asCents(invoice.paidCents, 'Invoice paid amount') - creditedCents;
  return {
    invoice: {
      ...clone(invoice),
      creditedCents,
      balanceCents,
      status: balanceCents === 0 ? 'CREDITED' : invoice.status
    },
    credit: {
      ...clone(credit),
      status: 'APPLIED',
      ownerApprovedBy: normalizeId(ownerId, 'Owner ID'),
      appliedAt: new Date(now).toISOString(),
      externalActionOccurred: false
    }
  };
}

function createRefundDraft({ payment, refundId, amountCents, reason, now = Date.now() }) {
  const amount = requirePositiveCents(amountCents, 'Refund amount');
  if (amount > asCents(payment.amountCents, 'Payment amount')) throw new Error('Refund exceeds payment amount.');
  const text = String(reason || '').trim();
  if (text.length < 3 || text.length > 500) throw new Error('Refund reason is invalid.');
  return {
    id: normalizeId(refundId, 'Refund ID'),
    paymentId: payment.id,
    invoiceId: payment.invoiceId,
    tenantKey: payment.tenantKey,
    customerId: payment.customerId,
    amountCents: amount,
    reason: text,
    status: 'DRAFT',
    executionState: 'LOCKED',
    createdAt: new Date(now).toISOString(),
    externalActionOccurred: false
  };
}

function prepareRefundRequest({ refund, payment, provider, config, lockSet }) {
  if (refund.status !== 'DRAFT') throw new Error('Refund must be a draft.');
  if (refund.paymentId !== payment.id) throw new Error('Refund payment does not match.');
  if (!config.providers.payment.approvedProviders.includes(provider)) throw new Error('Payment provider is not approved.');
  const lock = claimLock(lockSet, `${payment.provider}|${payment.id}|${refund.id}|${refund.amountCents}|refund`, 'refund request');
  return {
    ...clone(refund),
    provider,
    duplicateLock: lock,
    ownerApprovalRequired: true,
    executionState: 'LOCKED',
    externalActionOccurred: false
  };
}

function createContractDraft({ tenantKey, customerId, contractId, name, currency = 'USD', recurringFeeCents, billingInterval, includedUsage = {}, overageRatesCents = {}, startsAt, renewsAt = null, now = Date.now() }) {
  if (!['monthly', 'quarterly', 'annual'].includes(billingInterval)) throw new Error('Billing interval is invalid.');
  const normalizedUsage = {};
  for (const [key, value] of Object.entries(includedUsage)) normalizedUsage[normalizeId(key, 'Usage key')] = asCents(value, `Included usage ${key}`);
  const normalizedRates = {};
  for (const [key, value] of Object.entries(overageRatesCents)) normalizedRates[normalizeId(key, 'Usage key')] = asCents(value, `Overage rate ${key}`);
  return {
    id: normalizeId(contractId, 'Contract ID'),
    tenantKey: normalizeId(tenantKey, 'Tenant key').toLowerCase(),
    customerId: normalizeId(customerId, 'Customer ID'),
    name: String(name || '').trim(),
    currency: normalizeCurrency(currency),
    recurringFeeCents: requirePositiveCents(recurringFeeCents, 'Recurring fee'),
    billingInterval,
    includedUsage: normalizedUsage,
    overageRatesCents: normalizedRates,
    usage: {},
    startsAt,
    renewsAt,
    status: 'DRAFT',
    createdAt: new Date(now).toISOString(),
    externalActionOccurred: false
  };
}

function approveContract({ contract, ownerId, now = Date.now() }) {
  if (contract.status !== 'DRAFT') throw new Error('Only a draft contract can be approved.');
  return {
    ...clone(contract),
    status: 'OWNER_APPROVED',
    ownerApprovedBy: normalizeId(ownerId, 'Owner ID'),
    ownerApprovedAt: new Date(now).toISOString(),
    externalActionOccurred: false
  };
}

function activateContractRecord({ contract, activationReference, now = Date.now() }) {
  if (contract.status !== 'OWNER_APPROVED') throw new Error('Contract must be owner approved before activation.');
  return {
    ...clone(contract),
    status: 'ACTIVE',
    activationReference: normalizeId(activationReference, 'Activation reference'),
    activatedAt: new Date(now).toISOString(),
    externalActionOccurred: false
  };
}

function recordContractUsage({ contract, usageKey, quantity, usageEventId, usageLockSet, now = Date.now() }) {
  if (contract.status !== 'ACTIVE') throw new Error('Contract must be active before usage is recorded.');
  const key = normalizeId(usageKey, 'Usage key');
  const amount = asCents(quantity, 'Usage quantity');
  const eventId = normalizeId(usageEventId, 'Usage event ID');
  const duplicateLock = claimLock(usageLockSet, `${contract.id}|${eventId}`, 'contract usage event');
  const updated = clone(contract);
  updated.usage[key] = asCents(updated.usage[key] || 0, 'Current usage') + amount;
  updated.lastUsageAt = new Date(now).toISOString();
  return { contract: updated, usageEvent: { id: eventId, contractId: contract.id, usageKey: key, quantity: amount, duplicateLock, recordedAt: new Date(now).toISOString(), externalActionOccurred: false } };
}

function previewContractBilling(contract) {
  if (!['ACTIVE', 'OWNER_APPROVED'].includes(contract.status)) throw new Error('Contract is not eligible for billing preview.');
  let overageCents = 0;
  const usageDetail = {};
  const keys = new Set([...Object.keys(contract.includedUsage || {}), ...Object.keys(contract.usage || {})]);
  for (const key of keys) {
    const used = asCents(contract.usage?.[key] || 0, `Usage ${key}`);
    const included = asCents(contract.includedUsage?.[key] || 0, `Included usage ${key}`);
    const overage = Math.max(0, used - included);
    const rate = asCents(contract.overageRatesCents?.[key] || 0, `Overage rate ${key}`);
    const lineCents = overage * rate;
    overageCents += lineCents;
    usageDetail[key] = { used, included, overage, rateCents: rate, lineCents };
  }
  return {
    contractId: contract.id,
    recurringFeeCents: contract.recurringFeeCents,
    overageCents,
    totalCents: contract.recurringFeeCents + overageCents,
    currency: contract.currency,
    usageDetail,
    status: 'PREVIEW_NEEDS_OWNER_REVIEW',
    externalActionOccurred: false
  };
}

function calculateProfitability({ revenueCents, directCostCents, laborCostCents = 0, allocatedOverheadCents = 0, adSpendCents = 0 }) {
  const revenue = asCents(revenueCents, 'Revenue');
  const costs = asCents(directCostCents, 'Direct cost') + asCents(laborCostCents, 'Labor cost') + asCents(allocatedOverheadCents, 'Allocated overhead') + asCents(adSpendCents, 'Ad spend');
  const profitCents = revenue - costs;
  const marginBasisPoints = revenue === 0 ? 0 : Math.round((profitCents / revenue) * 10000);
  return { revenueCents: revenue, totalCostCents: costs, profitCents, marginBasisPoints };
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildAccountingCsv(entries) {
  if (!Array.isArray(entries)) throw new Error('Accounting entries must be an array.');
  const header = ['date', 'type', 'recordId', 'customerId', 'description', 'debitCents', 'creditCents', 'currency', 'providerReference'];
  const rows = entries.map(entry => {
    const debit = asCents(entry.debitCents || 0, 'Debit');
    const credit = asCents(entry.creditCents || 0, 'Credit');
    if ((debit === 0 && credit === 0) || (debit > 0 && credit > 0)) throw new Error('Each accounting entry must contain exactly one debit or credit amount.');
    return [entry.date, entry.type, normalizeId(entry.recordId, 'Record ID'), normalizeId(entry.customerId, 'Customer ID'), entry.description, debit, credit, normalizeCurrency(entry.currency), entry.providerReference || ''].map(csvCell).join(',');
  });
  return `${header.join(',')}\n${rows.join('\n')}${rows.length ? '\n' : ''}`;
}

function createCommunicationDraft({ tenantKey, customerId, communicationId, channel, subject, body, relatedRecordId, now = Date.now() }) {
  if (!['email', 'portal-message', 'sms-draft'].includes(channel)) throw new Error('Communication channel is invalid.');
  const content = String(body || '').trim();
  if (content.length < 2 || content.length > 20000) throw new Error('Communication body is invalid.');
  return {
    id: normalizeId(communicationId, 'Communication ID'),
    tenantKey: normalizeId(tenantKey, 'Tenant key').toLowerCase(),
    customerId: normalizeId(customerId, 'Customer ID'),
    relatedRecordId: normalizeId(relatedRecordId, 'Related record ID'),
    channel,
    subject: String(subject || '').trim(),
    body: content,
    status: 'DRAFT',
    createdAt: new Date(now).toISOString(),
    externalActionOccurred: false
  };
}

function approveCommunication({ communication, ownerId, now = Date.now() }) {
  if (communication.status !== 'DRAFT') throw new Error('Only a draft communication can be approved.');
  return {
    ...clone(communication),
    status: 'OWNER_APPROVED',
    ownerApprovedBy: normalizeId(ownerId, 'Owner ID'),
    ownerApprovedAt: new Date(now).toISOString(),
    externalActionOccurred: false
  };
}

function prepareCommunicationSend({ communication, provider, config, lockSet }) {
  if (communication.status !== 'OWNER_APPROVED') throw new Error('Communication must be owner approved before send preparation.');
  if (!config.providers.email.approvedProviders.includes(provider)) throw new Error('Email provider is not approved.');
  const lock = claimLock(lockSet, `${communication.tenantKey}|${communication.customerId}|${communication.id}|${provider}|send`, 'communication send');
  return {
    action: 'SEND_COMMUNICATION',
    communicationId: communication.id,
    tenantKey: communication.tenantKey,
    customerId: communication.customerId,
    provider,
    duplicateLock: lock,
    executionState: 'LOCKED',
    externalActionOccurred: false
  };
}

function createSocialDraft({ socialId, platform, copy, assetReference, campaignId = null, scheduledFor = null, now = Date.now() }) {
  const allowed = ['facebook', 'instagram', 'linkedin', 'google-business-profile', 'youtube'];
  if (!allowed.includes(platform)) throw new Error('Social platform is not supported.');
  const text = String(copy || '').trim();
  if (text.length < 2 || text.length > 10000) throw new Error('Social copy is invalid.');
  return {
    id: normalizeId(socialId, 'Social ID'),
    platform,
    copy: text,
    assetReference: String(assetReference || '').trim(),
    campaignId: campaignId ? normalizeId(campaignId, 'Campaign ID') : null,
    scheduledFor,
    status: 'DRAFT',
    createdAt: new Date(now).toISOString(),
    externalActionOccurred: false
  };
}

function approveSocialDraft({ social, ownerId, now = Date.now() }) {
  if (social.status !== 'DRAFT') throw new Error('Only a draft social record can be approved.');
  return {
    ...clone(social),
    status: 'OWNER_APPROVED',
    ownerApprovedBy: normalizeId(ownerId, 'Owner ID'),
    ownerApprovedAt: new Date(now).toISOString(),
    externalActionOccurred: false
  };
}

function scheduleSocialInternal({ social, scheduledFor, now = Date.now() }) {
  if (social.status !== 'OWNER_APPROVED') throw new Error('Social record must be owner approved before scheduling.');
  const scheduled = new Date(scheduledFor);
  if (!Number.isFinite(scheduled.getTime()) || scheduled.getTime() <= now) throw new Error('Social schedule must be in the future.');
  return {
    ...clone(social),
    scheduledFor: scheduled.toISOString(),
    status: 'SCHEDULED_INTERNAL',
    publicationState: 'LOCKED',
    externalActionOccurred: false
  };
}

function prepareSocialPublication({ social, provider, config, lockSet }) {
  if (social.status !== 'SCHEDULED_INTERNAL') throw new Error('Social record must be internally scheduled before publication preparation.');
  if (!config.providers.social.approvedProviders.includes(provider)) throw new Error('Social provider is not approved.');
  const lock = claimLock(lockSet, `${social.id}|${social.platform}|${social.scheduledFor}|${provider}|publish`, 'social publication');
  return {
    action: 'PUBLISH_SOCIAL',
    socialId: social.id,
    platform: social.platform,
    provider,
    duplicateLock: lock,
    executionState: 'LOCKED',
    externalActionOccurred: false
  };
}

function createWebsiteChangeDraft({ changeId, title, files, rollbackReference, now = Date.now() }) {
  if (!Array.isArray(files) || !files.length) throw new Error('At least one website file is required.');
  if (!rollbackReference) throw new Error('Rollback reference is required.');
  return {
    id: normalizeId(changeId, 'Website change ID'),
    title: String(title || '').trim(),
    files: [...new Set(files.map(file => String(file).trim()))],
    rollbackReference: String(rollbackReference),
    status: 'DRAFT',
    createdAt: new Date(now).toISOString(),
    externalActionOccurred: false
  };
}

function prepareWebsiteDeployment({ change, ownerId, provider, config, lockSet }) {
  if (change.status !== 'DRAFT') throw new Error('Website change must be a draft.');
  if (!config.providers.website.approvedProviders.includes(provider)) throw new Error('Website provider is not approved.');
  const lock = claimLock(lockSet, `${change.id}|${change.rollbackReference}|${provider}|deploy`, 'website deployment');
  return {
    ...clone(change),
    status: 'OWNER_APPROVED',
    ownerApprovedBy: normalizeId(ownerId, 'Owner ID'),
    provider,
    duplicateLock: lock,
    executionState: 'LOCKED',
    externalActionOccurred: false
  };
}

function attributionSummary(records) {
  if (!Array.isArray(records)) throw new Error('Attribution records must be an array.');
  const summary = {};
  for (const record of records) {
    const source = String(record.source || 'unknown').trim().toLowerCase();
    if (!summary[source]) summary[source] = { leads: 0, qualified: 0, quoteCents: 0, revenueCents: 0, adSpendCents: 0 };
    summary[source].leads += Number(record.lead ? 1 : 0);
    summary[source].qualified += Number(record.qualified ? 1 : 0);
    summary[source].quoteCents += asCents(record.quoteCents || 0, 'Attributed quote');
    summary[source].revenueCents += asCents(record.revenueCents || 0, 'Attributed revenue');
    summary[source].adSpendCents += asCents(record.adSpendCents || 0, 'Attributed ad spend');
  }
  for (const value of Object.values(summary)) value.returnOnAdSpendBasisPoints = value.adSpendCents === 0 ? null : Math.round(((value.revenueCents - value.adSpendCents) / value.adSpendCents) * 10000);
  return summary;
}

function integrationHealth(config, credentials = {}) {
  const slots = ['email', 'payment', 'accounting', 'social', 'website'];
  return slots.map(slot => {
    const providerConfig = config.providers[slot];
    const approved = providerConfig.approvedProviders || [];
    const selectedProvider = credentials[slot]?.provider || null;
    const credentialPresent = Boolean(credentials[slot]?.credentialPresent);
    const providerApproved = selectedProvider ? approved.includes(selectedProvider) : false;
    const liveFlag = slot === 'email' ? providerConfig.liveSend : slot === 'payment' ? providerConfig.liveRequests && providerConfig.liveProcessing : slot === 'accounting' ? providerConfig.apiSync : slot === 'social' ? providerConfig.livePublishing : providerConfig.liveDeployment;
    return {
      slot,
      selectedProvider,
      credentialPresent,
      providerApproved,
      liveFlag: Boolean(liveFlag),
      status: providerApproved && credentialPresent && liveFlag ? 'CONNECTED' : 'LOCKED',
      blocker: providerApproved ? (credentialPresent ? 'Owner release and live feature flag remain required.' : 'Production credential is missing.') : 'Approved provider is not configured.'
    };
  });
}

function proofEntry(action, result, context = {}, now = Date.now()) {
  return {
    id: `PROOF-${crypto.randomUUID()}`,
    timestamp: new Date(now).toISOString(),
    action,
    result,
    recordId: context.recordId || null,
    providerReference: context.providerReference || null,
    duplicateLock: context.duplicateLock || null,
    externalActionOccurred: Boolean(context.externalActionOccurred),
    digest: sha256({ action, result, context })
  };
}

function errorEntry(action, error, context = {}, now = Date.now()) {
  return {
    id: `ERROR-${crypto.randomUUID()}`,
    timestamp: new Date(now).toISOString(),
    action,
    message: String(error?.message || error),
    recordId: context.recordId || null,
    providerReference: context.providerReference || null,
    automaticRetry: false,
    externalActionOccurred: Boolean(context.externalActionOccurred)
  };
}

module.exports = {
  clone,
  stableJson,
  sha256,
  normalizeId,
  normalizeCurrency,
  asCents,
  validateConfig,
  claimLock,
  createQuoteDraft,
  approveQuote,
  prepareQuotePresentation,
  markQuotePresented,
  createInvoiceDraft,
  approveInvoice,
  prepareInvoicePresentation,
  validateHostedUrl,
  prepareHostedPaymentRequest,
  signProviderEvent,
  verifyProviderEvent,
  recordPaymentEvent,
  createCreditDraft,
  applyApprovedCredit,
  createRefundDraft,
  prepareRefundRequest,
  createContractDraft,
  approveContract,
  activateContractRecord,
  recordContractUsage,
  previewContractBilling,
  calculateProfitability,
  buildAccountingCsv,
  createCommunicationDraft,
  approveCommunication,
  prepareCommunicationSend,
  createSocialDraft,
  approveSocialDraft,
  scheduleSocialInternal,
  prepareSocialPublication,
  createWebsiteChangeDraft,
  prepareWebsiteDeployment,
  attributionSummary,
  integrationHealth,
  proofEntry,
  errorEntry
};
