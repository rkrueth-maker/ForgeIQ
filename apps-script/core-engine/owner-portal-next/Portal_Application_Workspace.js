/** Unified customer/job workspace enrichment and safe approval decisions. */

function h38PortalApplicationRecordRelated_(row, moduleKey, recordId, customerId, jobId) {
  if (!row) return false;
  var values = [
    row['Record ID'],row['Source ID'],row['Linked Record ID'],row['Customer ID'],row['Job ID'],row['Request ID'],row['Quote ID'],
    row['Work Order ID'],row['Invoice ID'],row['Payment ID'],row['Document ID'],row['Task ID']
  ].map(function(value){return String(value || '');});
  if (values.indexOf(String(recordId || '')) >= 0) return true;
  if (customerId && values.indexOf(String(customerId)) >= 0) return true;
  if (jobId && values.indexOf(String(jobId)) >= 0) return true;
  var type = String(row['Record Type'] || row['Source Type'] || row['Linked Record Type'] || '').toLowerCase();
  return type && type.indexOf(String(moduleKey || '').replace(/s$/,'').toLowerCase()) >= 0 && values.indexOf(String(recordId || '')) >= 0;
}

function h38PortalApplicationReadRelatedSheet_(sheetName, moduleKey, recordId, customerId, jobId) {
  try {
    return boReadTable_(sheetName,{includeVoided:true}).filter(function(row){
      return h38PortalApplicationRecordRelated_(row,moduleKey,recordId,customerId,jobId) && row['Is Voided'] !== 'Yes';
    }).slice(0,250);
  } catch (error) {
    return [];
  }
}

function h38PortalEnrichBusinessWorkspace_(workspace, moduleKey, recordId, access) {
  workspace = workspace || {};
  workspace.related = workspace.related || {};
  var customerId = String(workspace.customerId || workspace.primary && workspace.primary['Customer ID'] || '');
  var jobId = String(workspace.jobId || workspace.primary && workspace.primary['Job ID'] || '');
  if (moduleKey === 'customers') customerId = recordId;
  if (moduleKey === 'jobs') jobId = recordId;

  workspace.related.assignedTasks = h38PortalApplicationReadRelatedSheet_(H38_TM_SHEETS.TASKS,moduleKey,recordId,customerId,jobId);
  workspace.related.messaging = h38PortalApplicationReadRelatedSheet_(H38_TM_SHEETS.MESSAGES,moduleKey,recordId,customerId,jobId);
  workspace.related.proof = h38PortalApplicationReadRelatedSheet_(H38_BO_SHEETS.PROOF_LOG,moduleKey,recordId,customerId,jobId);
  workspace.related.errors = h38PortalApplicationReadRelatedSheet_(H38_BO_SHEETS.ERROR_LOG,moduleKey,recordId,customerId,jobId);
  workspace.related.activity = h38PortalApplicationReadRelatedSheet_(H38_BO_SHEETS.ACTIVITY,moduleKey,recordId,customerId,jobId);

  var primary = workspace.primary || {};
  var customer = workspace.customer || {};
  var job = workspace.job || {};
  var related = workspace.related;
  var openJobs = (related.jobs || []).filter(function(row){return !/complete|cancel|archive|delivered/i.test(String(row.Stage || row.Status || ''));});
  var invoices = related.invoices || [];
  var currentBalance = invoices.reduce(function(sum,row){return sum + (Number(String(row['Balance Due'] || row.Balance || 0).replace(/[$,]/g,'')) || 0);},0);
  var nextAction = primary['Next Action'] || job['Next Action'] || job['Completion Checklist'] || '';
  if (!nextAction && workspace.related.assignedTasks.length) nextAction = workspace.related.assignedTasks[0].Instructions || workspace.related.assignedTasks[0].Notes || '';
  workspace.summary = Object.assign({},workspace.summary || {},{
    customerName:customer['Display Name'] || primary['Display Name'] || primary['Customer ID'] || customerId,
    currentBalance:currentBalance,
    openJobs:openJobs.length,
    nextAction:nextAction || 'Review the selected record and linked work.',
    approvalState:primary['Approval Status'] || job['Approval Status'] || '',
    communications:workspace.related.messaging.length,
    files:(related.documents || []).length,
    openErrors:workspace.related.errors.filter(function(row){return !/resolved|closed/i.test(String(row['Resolution Status'] || row.Status || ''));}).length
  });
  workspace.timeline = boUxActivity_(related).concat(workspace.related.assignedTasks.map(function(row){return {type:'Task',id:row['Task ID'],title:row['Task Title'],date:row['Updated Time'] || row['Created Time'] || row['Due Date'],status:row.Status};})).concat(workspace.related.messaging.map(function(row){return {type:'Communication',id:row['Message ID'],title:(row.Direction || 'Message') + ' · ' + String(row['Message Body'] || '').slice(0,80),date:row['Updated Time'] || row['Created Time'] || row['Sent Time'] || row['Received Time'],status:row.Status || row['Provider Status']};})).sort(function(a,b){return String(b.date || '').localeCompare(String(a.date || ''));}).slice(0,150);
  workspace.workspaceType = moduleKey === 'customers' ? 'customer' : moduleKey === 'jobs' ? 'job' : 'record';
  workspace.userRole = access.role;
  workspace.readOnly = !h38PortalBusinessPermission_(access,moduleKey,'Edit');
  workspace.externalActionsOccurred = false;
  return workspace;
}

function h38PortalBusinessDecision(recordType, recordId, decision, notes) {
  var access = h38PortalRequireUnifiedUser_();
  boAssert_(access.ownerMode,'Owner approval is required.');
  recordType = boNormalizeText_(recordType);
  recordId = boNormalizeText_(recordId);
  decision = boNormalizeText_(decision).toUpperCase();
  notes = boNormalizeText_(notes);
  boAssert_(recordType && recordId,'The selected record type and ID are required.');
  boAssert_(['APPROVE','REJECT','HOLD','REVISE'].indexOf(decision) >= 0,'Unsupported approval decision.');
  var pending = boReadTable_(H38_BO_SHEETS.APPROVALS,{includeVoided:true}).filter(function(row){
    return row['Record Type'] === recordType && row['Record ID'] === recordId && /pending|required|review|hold|revision/i.test(String(row.Status || row.Decision || ''));
  })[0] || null;
  var approvalType = pending && pending['Approval Type'] || 'Owner Review';
  if (decision === 'APPROVE' || decision === 'REJECT') {
    var finalDecision = decision === 'APPROVE' ? 'Approved' : 'Rejected';
    return {status:'PASS',decision:boApproveSelectedRecord(recordType,recordId,approvalType,finalDecision,notes),externalActionsOccurred:false};
  }
  boAssert_(notes,'A reason or required correction is required for hold or revision.');
  var status = decision === 'HOLD' ? 'On Hold' : 'Revision Requested';
  var values = {
    'Record Type':recordType,'Record ID':recordId,'Approval Type':approvalType,'Required Role':'Owner',Status:status,Decision:status,
    'Decision By':access.user['User ID'],'Decision Time':boNow_(),'Allowed Flag':'No',Notes:notes
  };
  if (pending) boUpdateRecord_(H38_BO_SHEETS.APPROVALS,pending['Approval ID'],values,'Owner '+status.toLowerCase());
  else boAppendRecord_(H38_BO_SHEETS.APPROVALS,Object.assign({'Approval ID':boId_('APP')},values),'Owner '+status.toLowerCase());
  var targetMap = {
    Quote:H38_BO_SHEETS.QUOTES,Invoice:H38_BO_SHEETS.INVOICES,'Work Order':H38_BO_SHEETS.WORK_ORDERS,
    'Purchase Order':H38_BO_SHEETS.PURCHASE_ORDERS,Expense:H38_BO_SHEETS.EXPENSES,'Payroll Period':H38_BO_SHEETS.PAYROLL_PERIODS,
    'Tax Period':H38_BO_SHEETS.TAX_PERIODS,'Journal Entry':H38_BO_SHEETS.JOURNAL_ENTRIES,Job:H38_BO_SHEETS.JOBS
  };
  var sheet = targetMap[recordType];
  if (sheet) {
    var patch = {'Approval Status':status};
    if (recordType === 'Quote' || recordType === 'Invoice') patch['Send Allowed'] = 'No';
    if (recordType === 'Payroll Period') patch['Export Allowed'] = 'No';
    if (recordType === 'Tax Period') patch['Finalization Allowed'] = 'No';
    if (recordType === 'Journal Entry') patch['Posting Allowed'] = 'No';
    boUpdateRecord_(sheet,recordId,patch,'Approval propagation: '+status);
  }
  boProof_('OWNER APPROVAL',recordType,recordId,'PASS',status+': '+notes,access.user.Email);
  return {status:'PASS',decision:values,externalActionsOccurred:false};
}
