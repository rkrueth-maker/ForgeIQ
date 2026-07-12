#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  sha256,
  validateConfig,
  createQuoteDraft,
  approveQuote,
  prepareQuotePresentation,
  markQuotePresented,
  createInvoiceDraft,
  approveInvoice,
  prepareInvoicePresentation,
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
} = require('../core-engine/revenue-operations/lib/revenue-operations-core');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'core-engine', 'revenue-operations', 'config', 'revenue-operations.default.json');
const EVIDENCE_DIR = path.join(ROOT, 'launch-control', 'evidence');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
const baseConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const config = JSON.parse(JSON.stringify(baseConfig));
config.providers.email.approvedProviders = ['sandbox-email'];
config.providers.payment.approvedProviders = ['sandbox-pay'];
config.providers.accounting.approvedProviders = ['sandbox-books'];
config.providers.social.approvedProviders = ['sandbox-social'];
config.providers.website.approvedProviders = ['sandbox-repository'];

const passes = [];
const failures = [];
const now = Date.UTC(2026, 6, 12, 14, 0, 0);

function check(name, condition, detail = '') {
  (condition ? passes : failures).push({ name, detail });
}

function expectThrow(name, fn, expected) {
  try {
    fn();
    failures.push({ name, detail: 'Expected an error but none was thrown.' });
  } catch (error) {
    check(name, !expected || String(error.message).includes(expected), error.message);
  }
}

check('default configuration validates', validateConfig(baseConfig).length === 0, validateConfig(baseConfig).join(' '));
check('external actions default disabled', baseConfig.controls.externalActionsEnabled === false);
check('selected-record only', baseConfig.controls.selectedRecordOnly === true && baseConfig.controls.bulkExecution === false);
check('automatic retry disabled', baseConfig.controls.automaticRetry === false);
check('proof and error logs required', baseConfig.controls.proofLogRequired === true && baseConfig.controls.errorLogRequired === true);
check('raw card data forbidden', baseConfig.providers.payment.rawCardDataAllowed === false);
check('all live provider flags false', baseConfig.providers.email.liveSend === false && baseConfig.providers.payment.liveRequests === false && baseConfig.providers.payment.liveProcessing === false && baseConfig.providers.accounting.apiSync === false && baseConfig.providers.social.livePublishing === false && baseConfig.providers.website.liveDeployment === false);

const quoteDraft = createQuoteDraft({
  tenantKey: 'highway-38',
  customerId: 'CUST-TEST',
  quoteId: 'QUOTE-TEST',
  version: 2,
  lineItems: [
    { id: 'LINE-A', description: 'Problem Snapshot', quantity: 1, unitCents: 9900 },
    { id: 'LINE-B', description: 'Planning add-on', quantity: 2, unitCents: 2500 }
  ],
  expiresAt: '2026-08-01T00:00:00.000Z',
  now
});
check('quote total calculated in cents', quoteDraft.totalCents === 14900);
check('quote starts as draft without external action', quoteDraft.status === 'DRAFT' && quoteDraft.externalActionOccurred === false);
expectThrow('quote rejects negative amount', () => createQuoteDraft({ tenantKey: 'highway-38', customerId: 'CUST-TEST', quoteId: 'QUOTE-BAD', lineItems: [{ description: 'Bad', quantity: 1, unitCents: -1 }] }), 'non-negative');

const quoteApproved = approveQuote({ quote: quoteDraft, ownerId: 'RICK', expectedVersion: 2, now });
check('quote owner approval recorded', quoteApproved.status === 'OWNER_APPROVED' && quoteApproved.ownerApprovedBy === 'RICK');
expectThrow('stale quote approval blocked', () => approveQuote({ quote: quoteDraft, ownerId: 'RICK', expectedVersion: 1, now }), 'version changed');

const quoteLocks = new Set();
const quotePacket = prepareQuotePresentation({ quote: quoteApproved, provider: 'sandbox-email', lockSet: quoteLocks });
check('quote presentation stays locked', quotePacket.executionState === 'LOCKED' && quotePacket.externalActionOccurred === false);
expectThrow('duplicate quote presentation blocked', () => prepareQuotePresentation({ quote: quoteApproved, provider: 'sandbox-email', lockSet: quoteLocks }), 'Duplicate');
const quotePresented = markQuotePresented({ quote: quoteApproved, providerReference: 'PROVIDER-QUOTE-REF', now });
check('provider-confirmed quote presentation recorded', quotePresented.status === 'PRESENTED' && quotePresented.externalActionOccurred === true);

const customerApprovedQuote = { ...quotePresented, status: 'CUSTOMER_APPROVED' };
const invoiceDraft = createInvoiceDraft({
  tenantKey: 'highway-38',
  customerId: 'CUST-TEST',
  invoiceId: 'INV-TEST',
  quote: customerApprovedQuote,
  billingStage: 'deposit',
  lineItems: [{ id: 'DEP-A', description: 'Approved deposit', quantity: 1, unitCents: 7500 }],
  dueAt: '2026-07-20T00:00:00.000Z',
  now
});
check('invoice initializes balance', invoiceDraft.totalCents === 7500 && invoiceDraft.balanceCents === 7500);
expectThrow('invoice blocks unapproved quote', () => createInvoiceDraft({ tenantKey: 'highway-38', customerId: 'CUST-TEST', invoiceId: 'INV-BAD', quote: quotePresented, billingStage: 'deposit', lineItems: [{ description: 'Bad', quantity: 1, unitCents: 100 }] }), 'customer approved');

const invoiceApproved = approveInvoice({ invoice: invoiceDraft, ownerId: 'RICK', now });
const invoiceLocks = new Set();
const invoicePacket = prepareInvoicePresentation({ invoice: invoiceApproved, provider: 'sandbox-email', lockSet: invoiceLocks });
check('invoice presentation stays locked', invoicePacket.executionState === 'LOCKED' && invoicePacket.externalActionOccurred === false);
expectThrow('duplicate invoice presentation blocked', () => prepareInvoicePresentation({ invoice: invoiceApproved, provider: 'sandbox-email', lockSet: invoiceLocks }), 'Duplicate');

const paymentRequestLocks = new Set();
const paymentPacket = prepareHostedPaymentRequest({ invoice: invoiceApproved, provider: 'sandbox-pay', hostedUrl: 'https://payments.example.invalid/session/test', config, lockSet: paymentRequestLocks });
check('hosted payment request does not process payment', paymentPacket.executionState === 'LOCKED' && paymentPacket.rawCardDataStored === false && paymentPacket.externalActionOccurred === false);
expectThrow('duplicate payment request blocked', () => prepareHostedPaymentRequest({ invoice: invoiceApproved, provider: 'sandbox-pay', hostedUrl: 'https://payments.example.invalid/session/test', config, lockSet: paymentRequestLocks }), 'Duplicate');
expectThrow('unapproved payment provider blocked', () => prepareHostedPaymentRequest({ invoice: invoiceApproved, provider: 'unknown-pay', hostedUrl: 'https://payments.example.invalid/session/test', config, lockSet: new Set() }), 'not approved');
expectThrow('non-HTTPS payment link blocked', () => prepareHostedPaymentRequest({ invoice: invoiceApproved, provider: 'sandbox-pay', hostedUrl: 'http://payments.example.invalid/session/test', config, lockSet: new Set() }), 'scheme');
expectThrow('payment link credentials blocked', () => prepareHostedPaymentRequest({ invoice: invoiceApproved, provider: 'sandbox-pay', hostedUrl: 'https://user:pass@payments.example.invalid/session/test', config, lockSet: new Set() }), 'credentials');

const webhookSecret = 'synthetic-webhook-secret-letters-only-for-tests';
const eventTimestamp = Math.floor(now / 1000);
const rawEventBody = JSON.stringify({ id: 'EVENT-PAY-A', type: 'PAYMENT_SUCCEEDED', amountCents: 5000 });
const signature = signProviderEvent(webhookSecret, eventTimestamp, rawEventBody);
check('provider event signature verifies', verifyProviderEvent({ secret: webhookSecret, timestamp: eventTimestamp, rawBody: rawEventBody, signature, now }) === true);
expectThrow('tampered provider event rejected', () => verifyProviderEvent({ secret: webhookSecret, timestamp: eventTimestamp, rawBody: `${rawEventBody}x`, signature, now }), 'signature');
expectThrow('stale provider event rejected', () => verifyProviderEvent({ secret: webhookSecret, timestamp: eventTimestamp - 1000, rawBody: rawEventBody, signature: signProviderEvent(webhookSecret, eventTimestamp - 1000, rawEventBody), now }), 'outside tolerance');

const paymentEvents = new Set();
const firstPaymentResult = recordPaymentEvent({
  invoice: invoiceApproved,
  event: {
    id: 'EVENT-PAY-A',
    type: 'PAYMENT_SUCCEEDED',
    paymentId: 'PAY-A',
    invoiceId: 'INV-TEST',
    amountCents: 5000,
    currency: 'USD',
    provider: 'sandbox-pay',
    providerReference: 'PROVIDER-PAY-A'
  },
  eventLockSet: paymentEvents,
  now
});
check('partial payment updates invoice', firstPaymentResult.invoice.status === 'PARTIALLY_PAID' && firstPaymentResult.invoice.balanceCents === 2500);
check('payment event stores no card data', firstPaymentResult.payment.rawCardDataStored === false);
expectThrow('duplicate payment event blocked', () => recordPaymentEvent({ invoice: invoiceApproved, event: { id: 'EVENT-PAY-A', type: 'PAYMENT_SUCCEEDED', paymentId: 'PAY-A2', invoiceId: 'INV-TEST', amountCents: 100, currency: 'USD', provider: 'sandbox-pay' }, eventLockSet: paymentEvents, now }), 'Duplicate');
expectThrow('overpayment blocked', () => recordPaymentEvent({ invoice: firstPaymentResult.invoice, event: { id: 'EVENT-PAY-B', type: 'PAYMENT_SUCCEEDED', paymentId: 'PAY-B', invoiceId: 'INV-TEST', amountCents: 3000, currency: 'USD', provider: 'sandbox-pay' }, eventLockSet: new Set(), now }), 'exceeds');

const creditDraft = createCreditDraft({ invoice: firstPaymentResult.invoice, creditId: 'CREDIT-A', amountCents: 500, reason: 'Approved service adjustment', now });
const credited = applyApprovedCredit({ invoice: firstPaymentResult.invoice, credit: creditDraft, ownerId: 'RICK', now });
check('approved credit reduces balance', credited.invoice.balanceCents === 2000 && credited.credit.status === 'APPLIED');
expectThrow('excess credit blocked', () => createCreditDraft({ invoice: credited.invoice, creditId: 'CREDIT-B', amountCents: 5000, reason: 'Too high', now }), 'exceeds');

const refundDraft = createRefundDraft({ payment: firstPaymentResult.payment, refundId: 'REFUND-A', amountCents: 1000, reason: 'Synthetic approved refund', now });
const refundLocks = new Set();
const refundPacket = prepareRefundRequest({ refund: refundDraft, payment: firstPaymentResult.payment, provider: 'sandbox-pay', config, lockSet: refundLocks });
check('refund request remains locked', refundPacket.executionState === 'LOCKED' && refundPacket.externalActionOccurred === false);
expectThrow('duplicate refund request blocked', () => prepareRefundRequest({ refund: refundDraft, payment: firstPaymentResult.payment, provider: 'sandbox-pay', config, lockSet: refundLocks }), 'Duplicate');
expectThrow('refund over payment blocked', () => createRefundDraft({ payment: firstPaymentResult.payment, refundId: 'REFUND-B', amountCents: 6000, reason: 'Too high', now }), 'exceeds');

const contractDraft = createContractDraft({
  tenantKey: 'highway-38',
  customerId: 'CUST-TEST',
  contractId: 'CONTRACT-A',
  name: 'Monthly workflow support',
  recurringFeeCents: 12000,
  billingInterval: 'monthly',
  includedUsage: { reviews: 2, changes: 3 },
  overageRatesCents: { reviews: 2500, changes: 1500 },
  startsAt: '2026-07-15T00:00:00.000Z',
  renewsAt: '2026-08-15T00:00:00.000Z',
  now
});
const contractApproved = approveContract({ contract: contractDraft, ownerId: 'RICK', now });
const contractActive = activateContractRecord({ contract: contractApproved, activationReference: 'CONTRACT-ACTIVE-A', now });
const usageLocks = new Set();
const usageOne = recordContractUsage({ contract: contractActive, usageKey: 'reviews', quantity: 4, usageEventId: 'USAGE-A', usageLockSet: usageLocks, now });
const usageTwo = recordContractUsage({ contract: usageOne.contract, usageKey: 'changes', quantity: 4, usageEventId: 'USAGE-B', usageLockSet: usageLocks, now });
const billingPreview = previewContractBilling(usageTwo.contract);
check('contract included usage and overage calculated', billingPreview.overageCents === 6500 && billingPreview.totalCents === 18500);
check('recurring billing remains preview only', billingPreview.status === 'PREVIEW_NEEDS_OWNER_REVIEW' && billingPreview.externalActionOccurred === false);
expectThrow('duplicate usage event blocked', () => recordContractUsage({ contract: usageTwo.contract, usageKey: 'reviews', quantity: 1, usageEventId: 'USAGE-A', usageLockSet: usageLocks, now }), 'Duplicate');

const profitability = calculateProfitability({ revenueCents: 30000, directCostCents: 5000, laborCostCents: 8000, allocatedOverheadCents: 2000, adSpendCents: 1000 });
check('profitability calculated', profitability.totalCostCents === 16000 && profitability.profitCents === 14000 && profitability.marginBasisPoints === 4667);

const accountingCsv = buildAccountingCsv([
  { date: '2026-07-12', type: 'invoice', recordId: 'INV-TEST', customerId: 'CUST-TEST', description: 'Deposit, approved', debitCents: 7500, creditCents: 0, currency: 'USD', providerReference: '' },
  { date: '2026-07-12', type: 'payment', recordId: 'PAY-A', customerId: 'CUST-TEST', description: 'Hosted payment received', debitCents: 0, creditCents: 5000, currency: 'USD', providerReference: 'PROVIDER-PAY-A' }
]);
check('accounting CSV contains header and escaped comma', accountingCsv.startsWith('date,type,recordId') && accountingCsv.includes('"Deposit, approved"'));
expectThrow('accounting entry blocks double-sided amount', () => buildAccountingCsv([{ date: '2026-07-12', type: 'bad', recordId: 'BAD-A', customerId: 'CUST-TEST', description: 'Bad', debitCents: 1, creditCents: 1, currency: 'USD' }]), 'exactly one');

const communicationDraft = createCommunicationDraft({ tenantKey: 'highway-38', customerId: 'CUST-TEST', communicationId: 'COMM-A', channel: 'email', subject: 'Invoice ready', body: 'Your approved invoice draft is ready for review.', relatedRecordId: 'INV-TEST', now });
const communicationApproved = approveCommunication({ communication: communicationDraft, ownerId: 'RICK', now });
const communicationLocks = new Set();
const communicationPacket = prepareCommunicationSend({ communication: communicationApproved, provider: 'sandbox-email', config, lockSet: communicationLocks });
check('communication send remains locked', communicationPacket.executionState === 'LOCKED' && communicationPacket.externalActionOccurred === false);
expectThrow('duplicate communication send blocked', () => prepareCommunicationSend({ communication: communicationApproved, provider: 'sandbox-email', config, lockSet: communicationLocks }), 'Duplicate');

const socialDraft = createSocialDraft({ socialId: 'SOCIAL-A', platform: 'linkedin', copy: 'Synthetic Highway 38 planning post.', assetReference: 'asset://synthetic-proof', campaignId: 'CAMPAIGN-A', now });
const socialApproved = approveSocialDraft({ social: socialDraft, ownerId: 'RICK', now });
const socialScheduled = scheduleSocialInternal({ social: socialApproved, scheduledFor: new Date(now + 86400000).toISOString(), now });
check('social scheduling is internal only', socialScheduled.status === 'SCHEDULED_INTERNAL' && socialScheduled.publicationState === 'LOCKED' && socialScheduled.externalActionOccurred === false);
const socialLocks = new Set();
const socialPacket = prepareSocialPublication({ social: socialScheduled, provider: 'sandbox-social', config, lockSet: socialLocks });
check('social publication packet remains locked', socialPacket.executionState === 'LOCKED' && socialPacket.externalActionOccurred === false);
expectThrow('duplicate social publication blocked', () => prepareSocialPublication({ social: socialScheduled, provider: 'sandbox-social', config, lockSet: socialLocks }), 'Duplicate');

const websiteDraft = createWebsiteChangeDraft({ changeId: 'WEB-A', title: 'Synthetic controlled copy update', files: ['index.html'], rollbackReference: '4318aa3', now });
const websiteLocks = new Set();
const websitePacket = prepareWebsiteDeployment({ change: websiteDraft, ownerId: 'RICK', provider: 'sandbox-repository', config, lockSet: websiteLocks });
check('website deployment stays locked with rollback', websitePacket.executionState === 'LOCKED' && websitePacket.rollbackReference === '4318aa3' && websitePacket.externalActionOccurred === false);
expectThrow('website change requires rollback', () => createWebsiteChangeDraft({ changeId: 'WEB-B', title: 'Bad', files: ['index.html'], rollbackReference: '', now }), 'Rollback');

const attribution = attributionSummary([
  { source: 'linkedin', lead: true, qualified: true, quoteCents: 20000, revenueCents: 15000, adSpendCents: 0 },
  { source: 'search', lead: true, qualified: false, quoteCents: 5000, revenueCents: 0, adSpendCents: 1000 }
]);
check('lead and campaign attribution calculated', attribution.linkedin.leads === 1 && attribution.linkedin.revenueCents === 15000 && attribution.search.adSpendCents === 1000);

const health = integrationHealth(config, {
  email: { provider: 'sandbox-email', credentialPresent: true },
  payment: { provider: 'sandbox-pay', credentialPresent: true },
  accounting: { provider: 'sandbox-books', credentialPresent: false },
  social: { provider: 'sandbox-social', credentialPresent: true },
  website: { provider: 'sandbox-repository', credentialPresent: true }
});
check('all integration states remain locked without live flags', health.every(item => item.status === 'LOCKED' && item.liveFlag === false));
check('missing accounting credential reported', health.find(item => item.slot === 'accounting').blocker.includes('credential'));

const proof = proofEntry('PAYMENT_EVENT_RECORDED', 'PASS', { recordId: 'PAY-A', providerReference: 'PROVIDER-PAY-A', duplicateLock: firstPaymentResult.payment.duplicateLock, externalActionOccurred: true }, now);
check('proof entry records provider result', proof.externalActionOccurred === true && proof.digest.length === 64);
const error = errorEntry('SOCIAL_PUBLISH', new Error('Synthetic provider failure'), { recordId: 'SOCIAL-A', externalActionOccurred: false }, now);
check('error entry disables automatic retry', error.automaticRetry === false && error.externalActionOccurred === false);

const source = fs.readFileSync(path.join(ROOT, 'core-engine', 'revenue-operations', 'lib', 'revenue-operations-core.js'), 'utf8');
check('core contains no live provider secret', !/sk_live_|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source));
check('core never exposes card input fields', !/cardNumber|\bcvv\b|\bcvc\b|fullCard/i.test(source));

const sample = {
  status: 'OWNER_REVIEW_REQUIRED',
  generatedAt: new Date(now).toISOString(),
  release: config.release,
  quote: quoteApproved,
  quotePresentationPacket: quotePacket,
  invoice: invoiceApproved,
  invoicePresentationPacket: invoicePacket,
  hostedPaymentPacket: { ...paymentPacket, hostedUrl: 'REDACTED_SYNTHETIC_URL' },
  paymentRecord: firstPaymentResult.payment,
  creditRecord: credited.credit,
  refundPacket,
  contractBillingPreview: billingPreview,
  profitability,
  accountingCsvSha256: sha256(accountingCsv),
  communicationPacket,
  socialSchedule: socialScheduled,
  socialPublicationPacket: socialPacket,
  websiteDeploymentPacket: websitePacket,
  integrationHealth: health,
  externalActionsEnabled: false,
  externalActionsOccurredDuringVerification: false,
  activationBlockers: [
    'Approved email provider and production credentials',
    'Approved hosted payment provider and production credentials',
    'Approved accounting provider for API sync or continued CSV mode',
    'Approved social scheduler or native platform credentials',
    'Approved website deployment provider and rollback test',
    'Provider-specific webhook verification and sandbox regression evidence',
    'Rick approval for each live external feature flag'
  ]
};
fs.writeFileSync(path.join(EVIDENCE_DIR, 'revenue-operations-sample-package.json'), JSON.stringify(sample, null, 2) + '\n');

const evidence = {
  status: failures.length ? 'HOLD' : 'PASS',
  generatedAt: new Date().toISOString(),
  release: config.release,
  passed: passes.length,
  failed: failures.length,
  externalActionsEnabled: false,
  externalActionsOccurredDuringVerification: false,
  controls: {
    integerCentAccounting: true,
    ownerApproval: true,
    duplicateLocks: true,
    signedProviderEvents: true,
    hostedPaymentOnly: true,
    rawCardStorage: false,
    recurringUsageTracking: true,
    profitability: true,
    accountingCsv: true,
    socialInternalScheduling: true,
    websiteRollbackRequired: true,
    automaticRetry: false,
    bulkExecution: false
  },
  passes,
  failures
};
fs.writeFileSync(path.join(EVIDENCE_DIR, 'revenue-operations-core-verification.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
process.exit(failures.length ? 1 : 0);
