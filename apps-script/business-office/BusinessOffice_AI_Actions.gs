/** H38 AI action engine — plan, preview, owner approval, deterministic execution, and audit. */
var H38_AI_ACTION_TTL_SECONDS = 900;
var H38_AI_ACTION_CACHE_PREFIX = 'H38_AI_ACTION_';
var H38_AI_ACTION_RESULT_PREFIX = 'H38_AI_ACTION_RESULT_';

function boAiActionCatalog_() {
  return {
    'email.send': { label: 'Send email', confirmation: 'SEND', risk: 'external', prepare: boAiActionPrepareEmail_, execute: boAiActionExecuteEmail_ },
    'record.approve': { label: 'Approve record', confirmation: 'APPROVE', risk: 'approval', prepare: boAiActionPrepareRecordApproval_, execute: boAiActionExecuteRecordApproval_ },
    'record.reject': { label: 'Reject record', confirmation: 'REJECT', risk: 'approval', prepare: boAiActionPrepareRecordRejection_, execute: boAiActionExecuteRecordRejection_ },
    'quote.convert': { label: 'Convert approved quote to job', confirmation: 'CONVERT', risk: 'workflow', prepare: boAiActionPrepareQuoteConversion_, execute: boAiActionExecuteQuoteConversion_ },
    'job.invoice': { label: 'Create invoice from job', confirmation: 'CREATE', risk: 'financial-preparation', prepare: boAiActionPrepareJobInvoice_, execute: boAiActionExecuteJobInvoice_ },
    'journal.post': { label: 'Post approved journal entry', confirmation: 'POST', risk: 'accounting', prepare: boAiActionPrepareJournalPost_, execute: boAiActionExecuteJournalPost_ },
    'payroll.export': { label: 'Export approved payroll', confirmation: 'EXPORT', risk: 'payroll', prepare: boAiActionPreparePayrollExport_, execute: boAiActionExecutePayrollExport_ },
    'tax.finalize': { label: 'Finalize approved tax preparation report', confirmation: 'FINALIZE', risk: 'tax-preparation', prepare: boAiActionPrepareTaxFinalization_, execute: boAiActionExecuteTaxFinalization_ }
  };
}

function boAiActionCatalogForClient_() {
  const catalog = boAiActionCatalog_();
  return Object.keys(catalog).map(function (actionId) {
    const item = catalog[actionId];
    return { actionId: actionId, label: item.label, confirmation: item.confirmation, risk: item.risk, ownerApprovalRequired: true };
  });
}

function boAiCommand_(payload) {
  payload = payload || {};
  const message = String(payload.message || '').trim();
  boAssert_(message, 'AI command is required.');
  const context = boAiSafeContext_(payload.context || {});
  const normalized = message.toLowerCase();

  if (/\b(read|review|summari[sz]e)\b.*\b(email|emails|inbox)\b|\bwhat(?:'s| is) in my inbox\b/.test(normalized)) {
    const brief = boAiEmailBrief_({ limit: Number(payload.limit) || 5 });
    return { kind: 'message', answer: brief.summary, spoken: true, items: brief.items || [] };
  }
  if (/\b(teach|walk me through|help me use|next step)\b/.test(normalized)) {
    const coached = boAiCoach_({ task: message, context: context });
    return { kind: 'message', answer: coached.answer, spoken: true };
  }
  if (/\b(improvement|improvements|save time|workflow ideas)\b/.test(normalized)) {
    const items = boAiRecommendations_();
    const answer = items.length ? items.map(function (item, index) { return (index + 1) + '. ' + item.title + ' — ' + item.reason; }).join('\n') : 'No repeated workflow pattern is strong enough for a recommendation yet.';
    return { kind: 'message', answer: answer, spoken: true, recommendations: items };
  }

  const plan = boAiPlanCommandWithModel_(message, context);
  if (plan.kind !== 'action') return { kind: 'message', answer: plan.answer || 'I need more detail before I can help with that.', spoken: true };
  const action = boAiPrepareAction_({ actionId: plan.actionId, arguments: plan.arguments || {}, context: context });
  return { kind: 'action', answer: plan.answer || action.preview, action: action, spoken: true };
}

function boAiPlanCommandWithModel_(message, context) {
  const actions = boAiActionCatalogForClient_().map(function (item) {
    return { actionId: item.actionId, label: item.label, confirmation: item.confirmation };
  });
  const instructions = [
    'You are the H38 command planner. Return ONLY one JSON object and no markdown.',
    'Never execute an action. You may only plan one allowlisted action for later owner confirmation.',
    'If the request is informational, ambiguous, missing a required record ID, or outside the allowlist, return kind message with a concise answer or one clarifying question.',
    'Never invent recipients, record IDs, amounts, dates, or business facts.',
    'Never plan source-code changes, deployments, permission changes, credential changes, money movement, payroll funding, tax filing, deletion, or silent external communication.',
    'JSON shape: {"kind":"message|action","answer":"text","actionId":"allowlisted id or empty","arguments":{}}.',
    'Allowed actions: ' + JSON.stringify(actions)
  ].join(' ');
  const response = boAiOpenAi_(instructions, JSON.stringify({ request: message, currentContext: context }));
  const plan = boAiParseJsonObject_(response.text);
  const catalog = boAiActionCatalog_();
  if (!plan || plan.kind !== 'action' || !catalog[String(plan.actionId || '')]) {
    return { kind: 'message', answer: plan && plan.answer ? String(plan.answer) : response.text };
  }
  return { kind: 'action', answer: String(plan.answer || ''), actionId: String(plan.actionId), arguments: plan.arguments && typeof plan.arguments === 'object' ? plan.arguments : {} };
}

function boAiPrepareAction_(payload) {
  payload = payload || {};
  const actionId = String(payload.actionId || '').trim();
  const catalog = boAiActionCatalog_();
  const definition = catalog[actionId];
  boAssert_(definition, 'This AI action is not allowed.');
  boAiAssertActionBoundary_(actionId, payload.arguments || {});

  const context = boAiSafeContext_(payload.context || {});
  const prepared = definition.prepare(payload.arguments || {}, context);
  boAssert_(prepared && prepared.payload && prepared.preview, 'The AI action could not be prepared safely.');

  const actionToken = Utilities.getUuid();
  const actorEmail = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  boAssert_(actorEmail, 'A signed-in Google user is required.');
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + H38_AI_ACTION_TTL_SECONDS * 1000);
  const digest = boAiActionDigest_({ actionId: actionId, payload: prepared.payload, actorEmail: actorEmail, createdAt: createdAt.toISOString() });
  const stored = {
    actionToken: actionToken,
    actionId: actionId,
    payload: prepared.payload,
    preview: String(prepared.preview).slice(0, 8000),
    actorEmail: actorEmail,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    digest: digest
  };
  const raw = JSON.stringify(stored);
  boAssert_(raw.length < 90000, 'The prepared AI action is too large. Reduce the request and try again.');
  CacheService.getUserCache().put(H38_AI_ACTION_CACHE_PREFIX + actionToken, raw, H38_AI_ACTION_TTL_SECONDS);
  boAiRecordEvent_({ type: 'ai_action_prepare', module: context.module || '', outcome: actionId });
  return {
    actionToken: actionToken,
    actionId: actionId,
    label: definition.label,
    risk: definition.risk,
    preview: stored.preview,
    confirmation: definition.confirmation,
    expiresAt: stored.expiresAt,
    requiresOwnerApproval: true,
    executed: false
  };
}

function boAiConfirmAction_(payload) {
  payload = payload || {};
  const actionToken = String(payload.actionToken || payload.confirmationToken || '').trim();
  boAssert_(actionToken, 'AI action token is required.');
  const userProperties = PropertiesService.getUserProperties();
  const completedKey = H38_AI_ACTION_RESULT_PREFIX + actionToken;
  const completed = boAiJson_(userProperties.getProperty(completedKey), null);
  if (completed) return Object.assign({}, completed, { duplicatePrevented: true });

  const lock = LockService.getUserLock();
  lock.waitLock(10000);
  try {
    const completedAfterLock = boAiJson_(userProperties.getProperty(completedKey), null);
    if (completedAfterLock) return Object.assign({}, completedAfterLock, { duplicatePrevented: true });

    const cache = CacheService.getUserCache();
    const raw = cache.get(H38_AI_ACTION_CACHE_PREFIX + actionToken);
    boAssert_(raw, 'This AI action expired. Prepare it again before approving it.');
    const stored = JSON.parse(raw);
    const definition = boAiActionCatalog_()[stored.actionId];
    boAssert_(definition, 'The prepared AI action is no longer allowed.');
    boAssert_(new Date(stored.expiresAt).getTime() >= Date.now(), 'This AI action expired. Prepare it again.');
    const actorEmail = String(Session.getActiveUser().getEmail() || '').toLowerCase();
    boAssert_(actorEmail && actorEmail === stored.actorEmail, 'Only the user who prepared this action may approve it.');
    boAssert_(stored.digest === boAiActionDigest_({ actionId: stored.actionId, payload: stored.payload, actorEmail: stored.actorEmail, createdAt: stored.createdAt }), 'The prepared AI action failed integrity verification.');
    boAssert_(String(payload.confirmation || '').trim().toUpperCase() === definition.confirmation, 'Say or enter ' + definition.confirmation + ' to approve this action.');

    const owner = boRequireOwner_();
    boApproveSelectedRecord('AI Action', actionToken, stored.actionId, 'Approved', stored.preview);
    let result;
    try {
      result = definition.execute(stored.payload || {});
    } catch (error) {
      boAiRecordEvent_({ type: 'ai_action_execute', module: stored.actionId, outcome: 'failed' });
      boProof_('AI ACTION EXECUTE', 'AI Action', actionToken, 'FAIL', stored.actionId + ': ' + String(error && error.message || error), owner.Email);
      throw error;
    }

    const completedResult = {
      completed: true,
      actionToken: actionToken,
      actionId: stored.actionId,
      label: definition.label,
      completedAt: new Date().toISOString(),
      result: boAiActionPublicResult_(stored.actionId, result),
      duplicatePrevented: false
    };
    userProperties.setProperty(completedKey, JSON.stringify(completedResult));
    cache.remove(H38_AI_ACTION_CACHE_PREFIX + actionToken);
    boAiRecordEvent_({ type: 'ai_action_execute', module: stored.actionId, outcome: 'approved_and_completed' });
    boProof_('AI ACTION EXECUTE', 'AI Action', actionToken, 'PASS', stored.actionId, owner.Email);
    return completedResult;
  } finally {
    lock.releaseLock();
  }
}

function boAiAssertActionBoundary_(actionId, args) {
  const text = (actionId + ' ' + JSON.stringify(args || {})).toLowerCase();
  const forbidden = ['source code', 'deploy', 'deployment', 'permission', 'credential', 'password', 'secret', 'move money', 'fund payroll', 'file tax', 'delete permanently'];
  forbidden.forEach(function (term) { boAssert_(text.indexOf(term) < 0, 'AI cannot perform or prepare protected system changes.'); });
}

function boAiActionPrepareEmail_(args, context) {
  const to = boAiCleanHeader_(args.to || '');
  const subject = boAiCleanHeader_(args.subject || 'Highway 38 follow-up');
  const instructions = String(args.request || args.instructions || '').trim();
  let body = String(args.body || '').trim();
  boAssert_(to && to.indexOf('@') > 0, 'A valid email recipient is required.');
  boAssert_(body || instructions, 'Email instructions or a reviewed body are required.');
  if (!body) {
    body = boAiOpenAi_('Draft a clear professional business email. Return only the email body. Do not add facts, prices, dates, promises, or commitments that were not supplied.', JSON.stringify({ to: to, subject: subject, instructions: instructions, context: context })).text;
  }
  boAssert_(body.length <= 20000, 'The email is too long to send through the voice approval flow.');
  return { payload: { to: to, subject: subject, body: body }, preview: 'Send email to ' + to + '\nSubject: ' + subject + '\n\n' + body };
}

function boAiActionPrepareRecordApproval_(args, context) { return boAiActionPrepareRecordDecision_(args, context, 'Approved'); }
function boAiActionPrepareRecordRejection_(args, context) { return boAiActionPrepareRecordDecision_(args, context, 'Rejected'); }
function boAiActionPrepareRecordDecision_(args, context, decision) {
  const recordType = String(args.recordType || context.recordType || '').trim();
  const recordId = String(args.recordId || context.recordId || '').trim();
  const approvalType = String(args.approvalType || 'Owner decision').trim();
  boAssert_(recordType && recordId, 'The record type and exact record ID are required.');
  return { payload: { recordType: recordType, recordId: recordId, approvalType: approvalType, decision: decision, notes: String(args.notes || 'Approved through H38 AI owner confirmation.') }, preview: decision + ' ' + recordType + ' ' + recordId + ' for ' + approvalType + '.' };
}

function boAiActionPrepareQuoteConversion_(args, context) {
  const quoteId = String(args.quoteId || (context.recordType === 'Quote' ? context.recordId : '') || '').trim();
  boAssert_(quoteId, 'The exact approved quote ID is required.');
  return { payload: { quoteId: quoteId }, preview: 'Convert approved quote ' + quoteId + ' into one work order and one job. Duplicate creation remains blocked.' };
}

function boAiActionPrepareJobInvoice_(args, context) {
  const jobId = String(args.jobId || (context.recordType === 'Job' ? context.recordId : '') || '').trim();
  boAssert_(jobId, 'The exact job ID is required.');
  return { payload: { jobId: jobId }, preview: 'Create a draft invoice from job ' + jobId + '. This does not send the invoice or move money.' };
}

function boAiActionPrepareJournalPost_(args, context) {
  const entryId = String(args.entryId || (context.recordType === 'Journal Entry' ? context.recordId : '') || '').trim();
  boAssert_(entryId, 'The exact approved journal entry ID is required.');
  return { payload: { entryId: entryId }, preview: 'Post approved, balanced journal entry ' + entryId + '. Existing accounting locks and approval checks remain active.' };
}

function boAiActionPreparePayrollExport_(args, context) {
  const periodId = String(args.periodId || (context.recordType === 'Payroll Period' ? context.recordId : '') || '').trim();
  boAssert_(periodId, 'The exact approved payroll period ID is required.');
  return { payload: { periodId: periodId }, preview: 'Export approved payroll period ' + periodId + ' to the existing provider CSV. This does not fund payroll.' };
}

function boAiActionPrepareTaxFinalization_(args, context) {
  const periodId = String(args.periodId || (context.recordType === 'Tax Period' ? context.recordId : '') || '').trim();
  boAssert_(periodId, 'The exact approved tax preparation period ID is required.');
  return { payload: { periodId: periodId }, preview: 'Finalize approved tax preparation report ' + periodId + '. This does not file a return or make a payment.' };
}

function boAiActionExecuteEmail_(payload) { boAiSendViaGmailApi_(payload); return { sent: true, to: payload.to, subject: payload.subject, sentAt: new Date().toISOString() }; }
function boAiActionExecuteRecordApproval_(payload) { return boQuoteBuilderApprove_(payload.recordType, payload.recordId, payload.approvalType, 'Approved', payload.notes || ''); }
function boAiActionExecuteRecordRejection_(payload) { return boQuoteBuilderApprove_(payload.recordType, payload.recordId, payload.approvalType, 'Rejected', payload.notes || ''); }
function boAiActionExecuteQuoteConversion_(payload) { return boQuoteBuilderToJob_(payload.quoteId); }
function boAiActionExecuteJobInvoice_(payload) { return boCreateInvoiceFromJob(payload.jobId); }
function boAiActionExecuteJournalPost_(payload) { return boPostJournalEntry(payload.entryId); }
function boAiActionExecutePayrollExport_(payload) { return boExportPayrollProviderCsv(payload.periodId); }
function boAiActionExecuteTaxFinalization_(payload) { return boFinalizeTaxPreparationReport(payload.periodId); }

function boAiActionPublicResult_(actionId, result) {
  result = result || {};
  if (actionId === 'email.send') return { sent: true, to: result.to || '', subject: result.subject || '', sentAt: result.sentAt || new Date().toISOString() };
  if (actionId === 'quote.convert') return { jobId: result.job && result.job['Job ID'] || '', workOrderId: result.workOrder && result.workOrder['Work Order ID'] || '', duplicatePrevented: !!result.duplicatePrevented };
  if (actionId === 'job.invoice') return { invoiceId: result['Invoice ID'] || '', invoiceNumber: result['Invoice Number'] || '' };
  if (actionId === 'payroll.export') return { fileUrl: result.fileUrl || '', fileId: result.fileId || '' };
  return { completed: true };
}

function boAiActionDigest_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value), Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function boAiCleanHeader_(value) { return String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 500); }
function boAiParseJsonObject_(text) {
  text = String(text || '').trim();
  try { return JSON.parse(text); } catch (error) {}
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) { try { return JSON.parse(text.slice(start, end + 1)); } catch (error) {} }
  return null;
}
