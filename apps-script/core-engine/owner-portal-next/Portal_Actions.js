/** Selected-record approvals and execution dispatcher. */
function h38PortalTaskAction(taskId, action, input) {
  h38PortalAssertOwner_();
  input = input || {};
  var task = h38PortalTaskProjection_({taskId:taskId})[0];
  if (!task) throw new Error('Task not found: ' + taskId);
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    if (['APPROVE_TASK','HOLD','REVISE','REJECT','CLOSE_TASK'].indexOf(action) >= 0) return h38PortalDecisionAction_(task,action,input);
    return h38PortalExecuteAction_(task,action,input);
  } catch (err) {
    h38PortalWriteError_({jobId:task.jobId||task.taskId,source:task.sourceSheet||'Portal Tasks',type:'ACTION_HOLD',description:String(err&&err.message?err.message:err),blockedAction:action,notes:'Selected task only.'});
    return {status:'HOLD',message:String(err&&err.message?err.message:err),taskId:taskId,action:action};
  } finally {
    lock.releaseLock();
  }
}

function h38PortalDecisionAction_(task,action,input) {
  var decisionMap={APPROVE_TASK:'APPROVE',HOLD:'HOLD',REVISE:'REVISE',REJECT:'REJECTED',CLOSE_TASK:'COMPLETE'};
  var decision=action==='APPROVE_TASK'?h38PortalRequiredDecisionForTask_(task):decisionMap[action];
  var status=action==='APPROVE_TASK'?'Approved':action==='HOLD'?'On hold':action==='REVISE'?'Needs review':action==='REJECT'?'Cancelled':'Complete';
  if(task._entity==='tasks'){
    var rec=h38PortalGet('tasks',task.taskId);
    rec.Status=status;
    rec['Approval Status']=action==='APPROVE_TASK'?'Approved by Rick - Action Allowed':'Rick Review Required / Owner Approval Required';
    rec['Rick Decision']=decision;
    rec['Blocking Issue']=action==='HOLD'?(input.reason||'Held by Rick'):rec['Blocking Issue'];
    rec['Next Recommended Action']=input.nextAction||rec['Next Recommended Action'];
    rec.Notes=(rec.Notes?rec.Notes+'\n':'')+'['+h38PortalNow_()+'] '+action+(input.reason?' — '+input.reason:'');
    h38PortalSave('tasks',rec);
  } else if(task.sourceSheet) {
    h38PortalUpdateLegacyDecision_(task.sourceSheet,task.sourceRow,status,decision,input,action==='APPROVE_TASK');
  }
  h38PortalWriteProof_({jobId:task.jobId||task.taskId,source:task.sourceSheet||'Portal Tasks',action:'Owner task decision: '+action,decision:decision,result:'PASS',evidence:'Task ID='+task.taskId,notes:input.reason||'Selected record only; no external action.'});
  return {status:'PASS',message:'Task updated: '+status,taskId:task.taskId,decision:decision};
}

function h38PortalRequiredDecisionForTask_(task){
  var bySheet={
    'Email Approval Queue':'APPROVE SEND',
    'Quote Approval Queue':'APPROVE QUOTE SEND',
    'Follow-Up Queue':'APPROVE FOLLOW-UP SEND',
    'Output Queue':'APPROVE DELIVERY DRAFT ROUTING',
    'Social Approval Queue':'APPROVE SOCIAL HANDOFF',
    'Website Approval Queue':'APPROVE WEBSITE HANDOFF'
  };
  if(bySheet[task.sourceSheet])return bySheet[task.sourceSheet];
  var assigned=String(task.assignedAction||'').toUpperCase();
  if(assigned.indexOf('INVOICE')>=0)return 'APPROVE INVOICE SEND';
  if(assigned.indexOf('PAYMENT')>=0)return 'APPROVE PAYMENT REQUEST';
  if(assigned.indexOf('FINAL DELIVERY')>=0)return 'APPROVE FINAL DELIVERY';
  return 'APPROVE';
}

function h38PortalUpdateLegacyDecision_(sheetName,rowNumber,status,decision,input,approved){
  var sh=h38PortalSpreadsheet_().getSheetByName(sheetName);if(!sh)throw new Error('Legacy sheet not found: '+sheetName);
  if(!rowNumber||rowNumber<2||rowNumber>sh.getLastRow())throw new Error('Invalid selected source row.');
  var headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],map=h38PortalHeaderMap_(headers);
  function set(h,v){if(map[h]!==undefined)sh.getRange(rowNumber,map[h]+1).setValue(v);}
  set('Approval Status',status==='Approved'?'Approved by Rick - Action Allowed':'Rick Review Required / Owner Approval Required');
  set('Rick Decision',decision);
  if(map['Send Allowed']!==undefined)set('Send Allowed',approved?'Yes':'No');
  if(map['Delivery Allowed']!==undefined)set('Delivery Allowed',approved?'Yes':'No');
  if(map['Publish Allowed']!==undefined)set('Publish Allowed',approved?'Yes':'No');
  set('Next Action',input.nextAction||('Owner decision recorded: '+decision));
  if(map.Notes!==undefined){var cell=sh.getRange(rowNumber,map.Notes+1),old=String(cell.getDisplayValue()||'');cell.setValue(old+(old?'\n':'')+'['+h38PortalNow_()+'] '+decision+(input.reason?' — '+input.reason:''));}
}

function h38PortalExecuteAction_(task,action,input){
  var policy=H38_PORTAL_APPROVAL_MATRIX[action];
  if(!policy)throw new Error('Unsupported action: '+action);
  if(policy.external&&!H38_PORTAL_NEXT.LIVE_EXTERNAL_ACTIONS_ENABLED){
    h38PortalValidateTaskGate_(task,policy);
    h38PortalWriteProof_({jobId:task.jobId||task.taskId,source:task.sourceSheet||'Portal Tasks',action:'Test external action: '+action,decision:policy.decision,result:'PASS - TEST MODE / NO EXTERNAL ACTION',evidence:'Task ID='+task.taskId,notes:'Adapter invoked in test mode. Nothing sent, published, deployed, charged, or delivered.'});
    return {status:'TEST_PASS',message:'Test mode verified. No external action occurred.',action:action,taskId:task.taskId};
  }
  if(policy.external) throw new Error('LIVE ACTION HOLD — live external actions require a separately approved workflow, credentials, regression tests, and release setting.');
  if(action==='RECORD_PAYMENT') return h38PortalInternalRecordAction_('payment',task,input);
  if(action==='RECORD_EXPENSE') return h38PortalInternalRecordAction_('expense',task,input);
  if(action==='SCHEDULE_SOCIAL') return h38PortalInternalScheduleSocial_(task,input);
  if(action==='APPROVE_WEBSITE_MERGE') return h38PortalInternalWebsiteApproval_(task,input);
  throw new Error('Action does not have an internal execution handler: '+action);
}

function h38PortalValidateTaskGate_(task,policy){
  var required=policy.decision;
  var record=task.sourceSheet?h38PortalLegacyRecord_(task.sourceSheet,task.sourceRow):null;
  var approval=record?String(record['Approval Status']||''):String(task.approvalStatus||'');
  var decision=record?String(record['Rick Decision']||''):String(task.decision||'');
  if(approval!=='Approved by Rick - Action Allowed')throw new Error('APPROVAL HOLD — exact owner approval status is required.');
  if(decision!==required)throw new Error('APPROVAL HOLD — required Rick Decision is '+required+'; found '+decision+'.');
  if(policy.allowedField){
    var allowed=record?String(record[policy.allowedField]||''):'';
    if(record&&allowed!=='Yes')throw new Error('ACTION HOLD — '+policy.allowedField+' must equal Yes; found '+allowed+'.');
  }
  if(record){
    var duplicate=[record['Proof Log ID'],record['Sent Time'],record['Published Time'],record['Deployment Time']].filter(Boolean).join(' / ');
    if(duplicate)throw new Error('DUPLICATE ACTION HOLD — existing proof or completion marker: '+duplicate);
  }
  return true;
}

function h38PortalInternalRecordAction_(type,task,input){
  var entity=type==='payment'?'payments':'expenses';
  var record=input.record||{};
  record['Job ID']=record['Job ID']||task.jobId;
  record['Customer ID']=record['Customer ID']||task.customerId;
  record['Recorded By']='Rick / Owner Portal';
  record.Status=record.Status||'Recorded';
  var saved=h38PortalSave(entity,record);
  return {status:'PASS',message:type+' recorded internally.',record:saved};
}

function h38PortalInternalScheduleSocial_(task,input){
  var socialId=input.socialId||task.taskId;
  var rec=h38PortalGet('social',socialId);
  if(!rec)throw new Error('Social record not found: '+socialId);
  rec.Status='Scheduled';rec['Scheduled Time']=input.scheduledTime||rec['Scheduled Time'];rec['Approval Status']='Approved by Rick - Action Allowed';rec['Rick Decision']='APPROVE SOCIAL SCHEDULE';
  h38PortalSave('social',rec);
  h38PortalSave('calendar',{'Title':'Social: '+(rec.Platform||socialId),'Event Type':'Social post','Related ID':socialId,'Start Time':rec['Scheduled Time'],'Platform':rec.Platform,'Product / Bundle ID':rec['Product / Bundle ID'],'Status':'Scheduled','Approval Warning':'Approved schedule only; external publisher remains disabled.'});
  return {status:'PASS',message:'Internal schedule recorded. No publication occurred.',record:rec};
}

function h38PortalInternalWebsiteApproval_(task,input){
  var changeId=input.changeId||task.taskId;var rec=h38PortalGet('website',changeId);if(!rec)throw new Error('Website change not found: '+changeId);
  rec.Status='Approved for merge';rec['Approval Status']='Approved by Rick - Action Allowed';rec['Rick Decision']='APPROVE WEBSITE MERGE';h38PortalSave('website',rec);
  return {status:'PASS',message:'Website merge handoff approved internally. No merge or deployment occurred.',record:rec};
}
