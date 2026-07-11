/** Selected-record approvals, state-aware action menus, and locked execution dispatcher. */
function h38PortalTaskAction(taskId, action, input) {
  h38PortalAssertOwner_();
  input = input || {};
  var task = h38PortalTaskProjection_({taskId:taskId})[0];
  if (!task) throw new Error('Task not found: ' + taskId);
  var allowed = h38PortalAvailableActions_(task).map(function(a){return a.action;});
  if (allowed.indexOf(action) < 0) return {status:'HOLD',message:'ACTION HOLD — '+action+' is not available for the current task state.',taskId:taskId,action:action};
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

function h38PortalAvailableActions_(task){
  if(!task || h38PortalTaskTerminal_(task.status)) return [];
  var approved = task.status === 'Approved' || task.approvalStatus === 'Approved by Rick - Action Allowed';
  var actions=[];
  if(!approved){
    actions=['APPROVE_TASK','HOLD','REVISE','REJECT','CLOSE_TASK'];
  }else{
    var assigned=String(task.assignedAction||'').toUpperCase();
    if(assigned && assigned!=='APPROVE_TASK' && H38_PORTAL_APPROVAL_MATRIX[assigned]) actions.push(assigned);
    actions.push('CLOSE_TASK');
  }
  return actions.filter(function(a,i,list){return list.indexOf(a)===i;}).map(function(a){
    var p=H38_PORTAL_APPROVAL_MATRIX[a]||{external:false};
    var external=!!p.external;
    return {action:a,external:external,enabled:!external||H38_PORTAL_NEXT.LIVE_EXTERNAL_ACTIONS_ENABLED||external,testOnly:external&&!H38_PORTAL_NEXT.LIVE_EXTERNAL_ACTIONS_ENABLED,decision:p.decision||a};
  });
}

function h38PortalDecisionAction_(task,action,input) {
  var decisionMap={APPROVE_TASK:'APPROVE',HOLD:'HOLD',REVISE:'REVISE',REJECT:'REJECTED',CLOSE_TASK:'COMPLETE'};
  var decision=action==='APPROVE_TASK'?h38PortalRequiredDecisionForTask_(task):decisionMap[action];
  var status=action==='APPROVE_TASK'?'Approved':action==='HOLD'?'On hold':action==='REVISE'?'Revision required':action==='REJECT'?'Rejected':'Complete';
  if(task._entity==='tasks'){
    var rec=h38PortalGet('tasks',task.taskId);
    if(!rec) throw new Error('Task record not found: '+task.taskId);
    if(String(rec.Status||'')===status && String(rec['Rick Decision']||'')===decision){
      return {status:'PASS',message:'Task decision was already applied.',taskId:task.taskId,decision:decision,alreadyApplied:true};
    }
    rec.Status=status;
    rec['Approval Status']=action==='APPROVE_TASK'?'Approved by Rick - Action Allowed':action==='CLOSE_TASK'?'Completed - Proof Logged':'Rick Review Required / Owner Approval Required';
    rec['Rick Decision']=decision;
    rec['Blocking Issue']=action==='HOLD'?(input.reason||'Held by Rick'):action==='REVISE'?(input.reason||'Revision required'):action==='REJECT'?(input.reason||'Rejected by Rick'):'';
    if(action==='APPROVE_TASK') rec['Next Recommended Action']=h38PortalPostApprovalNextAction_(rec);
    else if(action==='CLOSE_TASK') rec['Next Recommended Action']='';
    else rec['Next Recommended Action']=input.nextAction||input.reason||rec['Next Recommended Action'];
    rec['Last Update']=h38PortalNow_();
    rec.Notes=(rec.Notes?rec.Notes+'\n':'')+'['+h38PortalNow_()+'] '+action+(input.reason?' — '+input.reason:'');
    h38PortalSave('tasks',rec);
  } else if(task.sourceSheet) {
    h38PortalUpdateLegacyDecision_(task.sourceSheet,task.sourceRow,status,decision,input,action==='APPROVE_TASK');
  }
  h38PortalWriteProof_({jobId:task.jobId||task.taskId,source:task.sourceSheet||'Portal Tasks',action:'Owner task decision: '+action,decision:decision,result:'PASS',evidence:'Task ID='+task.taskId,notes:input.reason||'Selected record only; no external action.'});
  return {status:'PASS',message:'Task updated: '+status,taskId:task.taskId,decision:decision};
}

function h38PortalPostApprovalNextAction_(taskRecord){
  var assigned=String(taskRecord['Assigned Action']||'').toUpperCase();
  if(H38_PORTAL_APPROVAL_MATRIX[assigned]){
    var p=H38_PORTAL_APPROVAL_MATRIX[assigned];
    return p.external ? assigned.replace(/_/g,' ')+' is approved for test-only gate verification; live execution remains locked.' : assigned.replace(/_/g,' ')+' is ready for selected-record execution.';
  }
  return 'Approval recorded. Update the linked record or close the task when complete.';
}

function h38PortalRequiredDecisionForTask_(task){
  var assigned=String(task.assignedAction||'').toUpperCase();
  if(H38_PORTAL_APPROVAL_MATRIX[assigned]) return H38_PORTAL_APPROVAL_MATRIX[assigned].decision;
  var bySheet={
    'Email Approval Queue':'APPROVE SEND','Quote Approval Queue':'APPROVE QUOTE SEND','Follow-Up Queue':'APPROVE FOLLOW-UP SEND',
    'Output Queue':'APPROVE DELIVERY DRAFT ROUTING','Social Approval Queue':'APPROVE SOCIAL HANDOFF','Website Approval Queue':'APPROVE WEBSITE HANDOFF'
  };
  if(bySheet[task.sourceSheet])return bySheet[task.sourceSheet];
  return 'APPROVE';
}

function h38PortalUpdateLegacyDecision_(sheetName,rowNumber,status,decision,input,approved){
  var sh=h38PortalSpreadsheet_().getSheetByName(sheetName);if(!sh)throw new Error('Legacy sheet not found: '+sheetName);
  if(!rowNumber||rowNumber<2||rowNumber>sh.getLastRow())throw new Error('Invalid selected source row.');
  var headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],map=h38PortalHeaderMap_(headers);
  function set(h,v){if(map[h]!==undefined)sh.getRange(rowNumber,map[h]+1).setValue(v);}
  set('Status',status);
  set('Approval Status',status==='Approved'?'Approved by Rick - Action Allowed':status==='Complete'?'Completed - Proof Logged':'Rick Review Required / Owner Approval Required');
  set('Rick Decision',decision);
  if(map['Send Allowed']!==undefined)set('Send Allowed',approved?'Yes':'No');
  if(map['Delivery Allowed']!==undefined)set('Delivery Allowed',approved?'Yes':'No');
  if(map['Publish Allowed']!==undefined)set('Publish Allowed',approved?'Yes':'No');
  set('Next Action',status==='Complete'?'':input.nextAction||('Owner decision recorded: '+decision));
  if(map.Notes!==undefined){var cell=sh.getRange(rowNumber,map.Notes+1),old=String(cell.getDisplayValue()||'');cell.setValue(old+(old?'\n':'')+'['+h38PortalNow_()+'] '+decision+(input.reason?' — '+input.reason:''));}
}

function h38PortalExecuteAction_(task,action,input){
  var policy=H38_PORTAL_APPROVAL_MATRIX[action];
  if(!policy)throw new Error('Unsupported action: '+action);
  if(policy.external&&!H38_PORTAL_NEXT.LIVE_EXTERNAL_ACTIONS_ENABLED){
    h38PortalValidateTaskGate_(task,policy);
    h38PortalWriteProof_({jobId:task.jobId||task.taskId,source:task.sourceSheet||'Portal Tasks',action:'Test external action gate: '+action,decision:policy.decision,result:'PASS - TEST MODE / NO EXTERNAL ACTION',evidence:'Task ID='+task.taskId,notes:'Gate verified only. Nothing sent, published, deployed, charged, requested, or delivered.'});
    h38PortalAnnotateTask_(task.taskId,'External action gate verified in test-only mode: '+action+'. Live execution remains locked.');
    return {status:'TEST_PASS',message:'Approval gate verified. No external action occurred.',action:action,taskId:task.taskId};
  }
  if(policy.external) throw new Error('LIVE ACTION HOLD — live external actions require separately approved credentials, workflow, regression tests, and Command Center release.');
  var result;
  if(action==='RECORD_PAYMENT') result=h38PortalInternalRecordAction_('payment',task,input);
  else if(action==='RECORD_EXPENSE') result=h38PortalInternalRecordAction_('expense',task,input);
  else if(action==='SCHEDULE_SOCIAL') result=h38PortalInternalScheduleSocial_(task,input);
  else if(action==='APPROVE_AD_PLAN') result=h38PortalInternalAdvertisingApproval_(task,input);
  else if(action==='APPROVE_WEBSITE_MERGE') result=h38PortalInternalWebsiteApproval_(task,input);
  else throw new Error('Action does not have an internal execution handler: '+action);
  h38PortalCompleteTaskAfterAction_(task,action,result&&result.message?result.message:'Internal action completed.');
  return result;
}

function h38PortalValidateTaskGate_(task,policy){
  var required=policy.decision;
  var approval=String(task.approvalStatus||'');
  var decision=String(task.decision||'');
  if(approval!=='Approved by Rick - Action Allowed')throw new Error('APPROVAL HOLD — exact owner approval status is required.');
  if(decision!==required)throw new Error('APPROVAL HOLD — required Rick Decision is '+required+'; found '+decision+'.');
  var source=task.sourceSheet?h38PortalLegacyRecord_(task.sourceSheet,task.sourceRow):null;
  if(source&&policy.allowedField&&source[policy.allowedField]!==undefined&&String(source[policy.allowedField]||'')!=='Yes')throw new Error('ACTION HOLD — '+policy.allowedField+' must equal Yes; found '+source[policy.allowedField]+'.');
  if(source){
    var duplicate=[source['Proof Log ID'],source['Sent Time'],source['Published Time'],source['Deployment Time']].filter(Boolean).join(' / ');
    if(duplicate)throw new Error('DUPLICATE ACTION HOLD — existing proof or completion marker: '+duplicate);
  }
  return true;
}

function h38PortalInternalRecordAction_(type,task,input){
  var record=input.record||input||{};
  if(type==='payment'){
    record['Job ID']=record['Job ID']||task.jobId;
    record['Customer ID']=record['Customer ID']||task.customerId;
    var paymentResult=h38PortalRecordPayment(record);
    return {status:'PASS',message:'Payment recorded internally. No live processing occurred.',record:paymentResult.payment,invoice:paymentResult.invoice};
  }
  record['Job ID']=record['Job ID']||task.jobId;
  record['Customer ID']=record['Customer ID']||task.customerId;
  var expense=h38PortalRecordExpense(record);
  return {status:'PASS',message:'Expense recorded internally.',record:expense};
}

function h38PortalInternalScheduleSocial_(task,input){
  var rec=h38PortalResolveLinkedRecord_(task,'social',input.socialId);
  if(!rec)throw new Error('Social record not found for selected task.');
  rec.Status='Scheduled';
  rec['Scheduled Time']=input.scheduledTime||rec['Scheduled Time'];
  if(!rec['Scheduled Time'])throw new Error('SOCIAL HOLD — scheduled time is required.');
  rec['Approval Status']='Approved by Rick - Action Allowed';
  rec['Rick Decision']='APPROVE SOCIAL SCHEDULE';
  rec=h38PortalSave('social',rec);
  h38PortalSave('calendar',{'Title':'Social: '+(rec.Platform||rec['Social ID']),'Event Type':'Social post','Related ID':rec['Social ID'],'Start Time':rec['Scheduled Time'],'Platform':rec.Platform,'Campaign ID':rec['Campaign ID'],'Product / Bundle ID':rec['Product / Bundle ID'],'Status':'Scheduled','Approval Warning':'Schedule recorded internally; external publisher remains disabled.'});
  return {status:'PASS',message:'Internal social schedule recorded. No publication occurred.',record:rec};
}

function h38PortalInternalAdvertisingApproval_(task,input){
  var rec=h38PortalResolveLinkedRecord_(task,'advertising',input.campaignId);
  if(!rec)throw new Error('Advertising record not found for selected task.');
  rec.Status='Approved';rec['Approval Status']='Approved by Rick - Action Allowed';rec['Rick Decision']='APPROVE AD PLAN';
  rec=h38PortalSave('advertising',rec);
  return {status:'PASS',message:'Advertising plan approved internally. No campaign launched and no spend occurred.',record:rec};
}

function h38PortalInternalWebsiteApproval_(task,input){
  var rec=h38PortalResolveLinkedRecord_(task,'website',input.changeId);
  if(!rec)throw new Error('Website change not found for selected task.');
  rec.Status='Approved for merge';rec['Approval Status']='Approved by Rick - Action Allowed';rec['Rick Decision']='APPROVE WEBSITE MERGE';
  rec=h38PortalSave('website',rec);
  return {status:'PASS',message:'Website merge handoff approved internally. No merge or deployment occurred.',record:rec};
}

function h38PortalResolveLinkedRecord_(task,entity,explicitId){
  if(explicitId) return h38PortalGet(entity,explicitId);
  var spec=H38_PORTAL_TABLES[entity];
  if(task.sourceSheet===spec.sheet && task.sourceRow) return h38PortalLegacyRecord_(task.sourceSheet,task.sourceRow);
  var rows=h38PortalList(entity,{});
  return rows.filter(function(r){
    if(task.jobId&&String(r['Job ID']||'')===String(task.jobId))return true;
    if(task.catalogId&&String(r['Product / Bundle ID']||'')===String(task.catalogId))return true;
    return String(r.Notes||'').indexOf(task.taskId)>=0;
  })[0]||null;
}

function h38PortalAnnotateTask_(taskId,note){
  var rec=h38PortalGet('tasks',taskId);if(!rec)return;
  rec.Notes=(rec.Notes?rec.Notes+'\n':'')+'['+h38PortalNow_()+'] '+note;
  rec['Last Update']=h38PortalNow_();
  h38PortalSave('tasks',rec);
}

function h38PortalCompleteTaskAfterAction_(task,action,note){
  if(task._entity!=='tasks')return;
  var rec=h38PortalGet('tasks',task.taskId);if(!rec)return;
  rec.Status='Complete';rec['Approval Status']='Completed - Proof Logged';rec['Next Recommended Action']='';rec['Blocking Issue']='';rec['Last Update']=h38PortalNow_();
  rec.Notes=(rec.Notes?rec.Notes+'\n':'')+'['+h38PortalNow_()+'] '+action+' — '+note;
  h38PortalSave('tasks',rec);
  h38PortalWriteProof_({jobId:task.jobId||task.taskId,source:'Portal Tasks',action:'Complete task after internal action: '+action,decision:action,result:'PASS',evidence:'Task ID='+task.taskId,notes:note});
}
