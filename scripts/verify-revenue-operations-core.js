#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  validateConfig,
  createContract,
  activateContract,
  recordContractUsage,
  requestContractCancellation,
  prepareControlledAction,
  approveControlledAction,
  activationBlockers,
  recordProviderResult,
  validateHostedPaymentLink,
  recordTransaction,
  profitabilityReport,
  outstandingBalances,
  accountingCsv,
  attributionReport,
  createCommunicationDraft,
  createSocialDraft,
  createWebsiteChange,
  proofEntry,
  errorEntry,
  sha256
} = require('../core-engine/revenue-operations/lib/revenue-operations-core');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'core-engine', 'revenue-operations', 'config', 'revenue-operations.default.json');
const EVIDENCE_DIR = path.join(ROOT, 'launch-control', 'evidence');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
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

check('configuration validates', validateConfig(config).length === 0, validateConfig(config).join(' '));
check('module defaults controlled and unconnected', config.module.status === 'CONTROLLED_NOT_CONNECTED');
check('selected-record execution required', config.controls.selectedRecordOnly === true && config.controls.bulkExecution === false);
check('automatic retry disabled', config.controls.automaticRetry === false);
check('duplicate, approval, proof, and error controls required', config.controls.duplicateProtectionRequired && config.controls.ownerApprovalRequired && config.controls.proofLogRequired && config.controls.errorLogRequired);
check('all workflow execution flags disabled', Object.values(config.workflows).every(value => value === false));
check('hosted payment only and no raw card data', config.payments.providerHostedOnly === true && config.payments.rawCardDataAllowed === false);
check('communications draft-only', config.communications.draftOnly === true && config.communications.outboundSendEnabled === false);
check('publishing and advertising disabled', config.publishing.socialPublishingEnabled === false && config.publishing.websiteDeploymentEnabled === false && config.publishing.advertisingSpendEnabled === false);
check('accounting API sync disabled', config.accounting.apiSyncEnabled === false);

const contract = createContract({
  id: 'CONTRACT-001',
  customerId: 'CUST-001',
  name: 'Synthetic monthly operations support',
  cadence: 'monthly',
  amount: 500,
  includedUsage: 10,
  overageRate: 40,
  startsAt: '2026-07-15T00:00:00Z',
  renewsAt: '2026-08-15T00:00:00Z'
}, config, now);
check('contract begins in owner review', contract.status === 'OWNER_REVIEW' && contract.externalActionOccurred === false);
expectThrow('unsupported cadence rejected', () => createContract({ ...contract, id: 'CONTRACT-002', cadence: 'weekly' }, config, now), 'cadence');
expectThrow('invalid renewal order rejected', () => createContract({ ...contract, id: 'CONTRACT-003', startsAt: '2026-08-15T00:00:00Z', renewsAt: '2026-07-15T00:00:00Z' }, config, now), 'after');

const activeContract = activateContract(contract, 'CONTRACT-001', { id: 'APPROVAL-001', approved: true }, now);
check('contract activation remains internal', activeContract.status === 'ACTIVE' && activeContract.externalActionOccurred === false);
expectThrow('selected-record mismatch blocks contract activation', () => activateContract(contract, 'CONTRACT-999', { id: 'APPROVAL-002', approved: true }, now), 'Selected-record');
expectThrow('missing owner approval blocks contract activation', () => activateContract(contract, 'CONTRACT-001', { id: 'APPROVAL-003', approved: false }, now), 'Owner approval');

const usageOne = recordContractUsage(activeContract, 'CONTRACT-001', 8, 'JOB-001', now);
check('included usage records without overage', usageOne.usageEntry.status === 'RECORDED' && usageOne.usageEntry.overageAmount === 0);
const usageTwo = recordContractUsage(usageOne.contract, 'CONTRACT-001', 5, 'JOB-002', now);
check('overage requires owner review', usageTwo.usageEntry.status === 'OVERAGE_NEEDS_OWNER_REVIEW' && usageTwo.usageEntry.overageUnits === 3 && usageTwo.usageEntry.overageAmount === 120);
expectThrow('negative contract usage rejected', () => recordContractUsage(activeContract, 'CONTRACT-001', -1, 'JOB-003', now), 'greater than zero');

const cancellation = requestContractCancellation(activeContract, 'CONTRACT-001', 'Customer requested cancellation after the current paid term.', now);
check('cancellation routes to pending review', cancellation.status === 'CANCEL_PENDING' && cancellation.externalActionOccurred === false);

const quoteRecord = { id: 'QUOTE-001', type: 'quote', customerId: 'CUST-001', version: 2 };
const preparedQuote = prepareControlledAction({
  config,
  actionType: 'QUOTE_SEND',
  record: quoteRecord,
  selectedRecordId: 'QUOTE-001',
  payload: { subject: 'Quote ready for review', recipient: 'synthetic@example.invalid' },
  preparedBy: 'Revenue Core Verifier',
  now
});
check('quote send prepares owner-review action', preparedQuote.status === 'NEEDS_OWNER_APPROVAL' && preparedQuote.externalActionOccurred === false);
check('prepared action includes duplicate lock', preparedQuote.duplicateLock.length === 64 && preparedQuote.automaticRetry === false);
expectThrow('selected-record mismatch blocks action preparation', () => prepareControlledAction({ config, actionType: 'QUOTE_SEND', record: quoteRecord, selectedRecordId: 'QUOTE-002', payload: {}, preparedBy: 'Verifier', now }), 'Selected-record');
expectThrow('unsupported action rejected', () => prepareControlledAction({ config, actionType: 'BULK_SEND', record: quoteRecord, selectedRecordId: 'QUOTE-001', payload: {}, preparedBy: 'Verifier', now }), 'not supported');

const actionLocks = new Set();
const approvedQuoteAction = approveControlledAction(preparedQuote, preparedQuote.id, { id: 'APPROVAL-QUOTE-001', approved: true }, actionLocks, now);
check('approved action remains provider-locked', approvedQuoteAction.status === 'APPROVED_LOCKED_NO_PROVIDER_EXECUTION' && approvedQuoteAction.externalActionOccurred === false);
expectThrow('duplicate action approval blocked', () => approveControlledAction(preparedQuote, preparedQuote.id, { id: 'APPROVAL-QUOTE-002', approved: true }, actionLocks, now), 'Duplicate');
expectThrow('wrong selected action blocked', () => approveControlledAction(preparedQuote, 'ACTION-WRONG', { id: 'APPROVAL-QUOTE-003', approved: true }, new Set(), now), 'Selected-record');

const blockers = activationBlockers(config, approvedQuoteAction, {
  connected: false,
  credentialsPresent: false,
  regressionTestsPassed: false,
  rollbackReady: false,
  proofLogReady: true,
  errorLogReady: true
});
check('locked action reports exact activation blockers', blockers.includes('Global external-actions switch is disabled.') && blockers.some(item => item.includes('Workflow quoteSend')) && blockers.includes('Provider is not connected.') && blockers.includes('Provider credentials are missing.'));

const resultLocks = new Set();
const providerResult = recordProviderResult({
  config,
  action: approvedQuoteAction,
  providerResult: {
    providerReference: 'PROVIDER-REF-001',
    providerName: 'Synthetic Provider',
    status: 'UNKNOWN',
    message: 'Synthetic uncertain outcome held for manual review.'
  },
  resultLocks,
  now
});
check('uncertain provider result goes to hold without retry', providerResult.status === 'PROVIDER_UNKNOWN_HOLD' && providerResult.automaticRetry === false && providerResult.externalActionOccurred === false);
expectThrow('duplicate provider result blocked', () => recordProviderResult({ config, action: approvedQuoteAction, providerResult: { providerReference: 'PROVIDER-REF-001', providerName: 'Synthetic Provider', status: 'UNKNOWN', message: 'Duplicate' }, resultLocks, now }), 'Duplicate');

const paymentConfig = JSON.parse(JSON.stringify(config));
paymentConfig.payments.approvedProviders = ['sandbox-hosted-provider'];
const paymentLink = validateHostedPaymentLink(paymentConfig, { id: 'INV-001', customerId: 'CUST-001', balanceDue: 250 }, 'https://pay.example.invalid/session/abc123', 'sandbox-hosted-provider');
check('hosted payment link validates without processing', paymentLink.rawCardDataStored === false && paymentLink.externalActionOccurred === false && paymentLink.balanceDue === 250);
expectThrow('unapproved payment provider blocked', () => validateHostedPaymentLink(paymentConfig, { id: 'INV-001', customerId: 'CUST-001', balanceDue: 250 }, 'https://pay.example.invalid/session/abc123', 'unknown'), 'not approved');
expectThrow('non-HTTPS payment link blocked', () => validateHostedPaymentLink(paymentConfig, { id: 'INV-001', customerId: 'CUST-001', balanceDue: 250 }, 'http://pay.example.invalid/session/abc123', 'sandbox-hosted-provider'), 'scheme');
expectThrow('credential-bearing payment link blocked', () => validateHostedPaymentLink(paymentConfig, { id: 'INV-001', customerId: 'CUST-001', balanceDue: 250 }, 'https://user:pass@pay.example.invalid/session/abc123', 'sandbox-hosted-provider'), 'credentials');

const transactions = [
  { ...recordTransaction({ id: 'TXN-001', type: 'invoice', customerId: 'CUST-001', jobId: 'JOB-001', productId: 'H38-P001', revenueClass: 'product', amount: 500, occurredAt: '2026-07-12T12:00:00Z', currency: 'USD', campaignId: 'CAMPAIGN-001' }, now), invoiceId: 'INV-001' },
  { ...recordTransaction({ id: 'TXN-002', type: 'payment', customerId: 'CUST-001', jobId: 'JOB-001', productId: 'H38-P001', revenueClass: 'product', amount: 250, occurredAt: '2026-07-12T13:00:00Z', currency: 'USD', providerReference: 'PAYMENT-REF-001', campaignId: 'CAMPAIGN-001' }, now), invoiceId: 'INV-001' },
  recordTransaction({ id: 'TXN-003', type: 'expense', jobId: 'JOB-001', productId: 'H38-P001', revenueClass: 'product', amount: 80, occurredAt: '2026-07-12T13:30:00Z', currency: 'USD', campaignId: 'CAMPAIGN-001' }, now),
  recordTransaction({ id: 'TXN-004', type: 'refund', customerId: 'CUST-001', jobId: 'JOB-001', productId: 'H38-P001', revenueClass: 'product', amount: 25, occurredAt: '2026-07-12T13:45:00Z', currency: 'USD', providerReference: 'REFUND-REF-001' }, now)
];
check('transaction signed amounts are correct', transactions[0].signedAmount === 500 && transactions[2].signedAmount === -80 && transactions[3].signedAmount === -25);
expectThrow('raw card field rejected', () => recordTransaction({ id: 'TXN-005', type: 'payment', amount: 10, cardNumber: 'synthetic-forbidden' }, now), 'Raw card data');
expectThrow('unsupported transaction type rejected', () => recordTransaction({ id: 'TXN-006', type: 'chargeback-magic', amount: 10 }, now), 'not supported');

const profitability = profitabilityReport(transactions);
const productProfit = profitability.find(item => item.key === 'H38-P001');
check('product profitability calculated', productProfit.revenue === 750 && productProfit.expenses === 80 && productProfit.creditsRefunds === 25 && productProfit.net === 645);
const balances = outstandingBalances([{ id: 'INV-001', customerId: 'CUST-001', amount: 500, dueAt: '2026-07-01T00:00:00Z' }], transactions);
check('outstanding balance calculated', balances[0].paid === 250 && balances[0].balance === 250);
const csv = accountingCsv(transactions);
check('provider-neutral accounting CSV generated', csv.startsWith('transaction_id,type,occurred_at') && csv.includes('TXN-001') && csv.endsWith('\n'));
const attribution = attributionReport(transactions);
check('campaign attribution calculated', attribution[0].campaignId === 'CAMPAIGN-001' && attribution[0].revenue === 750 && attribution[0].cost === 80 && attribution[0].net === 670);

const communication = createCommunicationDraft({ record: quoteRecord, selectedRecordId: 'QUOTE-001', channel: 'email', subject: 'Synthetic quote follow-up', body: 'This is a synthetic draft and has not been sent.', now });
check('communication remains draft-only', communication.status === 'DRAFT_NEEDS_OWNER_APPROVAL' && communication.externalActionOccurred === false);
const social = createSocialDraft({ platform: 'linkedin', caption: 'Synthetic Highway 38 draft content.', assetReference: 'ASSET-001', campaignId: 'CAMPAIGN-001', publishAt: '2026-07-20T15:00:00Z', now });
check('social content remains unpublished draft', social.status === 'DRAFT_NEEDS_OWNER_APPROVAL' && social.externalActionOccurred === false);
const website = createWebsiteChange({ id: 'WEB-001', path: '/products.html', summary: 'Synthetic controlled product-page update.', rollbackReference: 'ROLLBACK-001', now });
check('website change remains undeployed', website.status === 'REVIEW_REQUIRED_NOT_DEPLOYED' && website.externalActionOccurred === false);
expectThrow('unsafe website path rejected', () => createWebsiteChange({ id: 'WEB-002', path: '/../private', summary: 'Unsafe synthetic path.', rollbackReference: 'ROLLBACK-002', now }), 'invalid');

const proof = proofEntry('QUOTE_SEND_PREPARED', 'PASS', { recordId: quoteRecord.id, customerId: quoteRecord.customerId, externalActionOccurred: false }, now);
check('proof entry records internal-only result', proof.externalActionOccurred === false && proof.digest.length === 64);
const error = errorEntry('PAYMENT_REQUEST', new Error('Synthetic provider failure'), { recordId: 'INV-001', customerId: 'CUST-001' }, now);
check('error entry prevents uncertain retry', error.automaticRetry === false && error.externalActionOccurred === false);

const source = fs.readFileSync(path.join(ROOT, 'core-engine', 'revenue-operations', 'lib', 'revenue-operations-core.js'), 'utf8');
check('source contains no live secret material', !/sk_live_[A-Za-z0-9]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source));
check('source contains no external network execution', !/\bfetch\s*\(|XMLHttpRequest|https\.request\s*\(|axios\s*\(/.test(source));

const sample = {
  status: 'OWNER_REVIEW_REQUIRED',
  generatedAt: new Date(now).toISOString(),
  moduleVersion: config.module.version,
  externalActionsOccurred: false,
  contract: activeContract,
  usage: usageTwo.usageEntry,
  cancellation,
  preparedAction: approvedQuoteAction,
  activationBlockers: blockers,
  providerResult,
  hostedPayment: { ...paymentLink, hostedUrl: 'REDACTED_TEST_URL' },
  profitability,
  outstandingBalances: balances,
  attribution,
  communication,
  social,
  website,
  proof,
  error,
  evidenceDigest: sha256({ contract: activeContract, action: approvedQuoteAction, transactions })
};
fs.writeFileSync(path.join(EVIDENCE_DIR, 'revenue-operations-sample.json'), JSON.stringify(sample, null, 2) + '\n');
fs.writeFileSync(path.join(EVIDENCE_DIR, 'revenue-operations-accounting.csv'), csv);

const evidence = {
  status: failures.length ? 'HOLD' : 'PASS',
  generatedAt: new Date().toISOString(),
  moduleVersion: config.module.version,
  passed: passes.length,
  failed: failures.length,
  externalActionsOccurred: false,
  controls: {
    selectedRecordOnly: true,
    bulkExecution: false,
    automaticRetry: false,
    ownerApprovalRequired: true,
    duplicateProtection: true,
    hostedPaymentOnly: true,
    rawCardDataStored: false,
    communicationsDraftOnly: true,
    socialPublishing: false,
    advertisingSpend: false,
    websiteDeployment: false,
    accountingApiSync: false
  },
  passes,
  failures
};
fs.writeFileSync(path.join(EVIDENCE_DIR, 'revenue-operations-core-verification.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
process.exit(failures.length ? 1 : 0);
