function h38BackendApproveRequest(requestId, decision) {
  var owner = h38BackendOwner_();
  if (decision !== 'APPROVE REQUEST FOR FULFILLMENT') throw new Error('APPROVAL HOLD — exact decision required.');
  var request = h38BackendFind_('requests','Request ID',requestId);
  if (!request) throw new Error('Request not found.');
  if (request.Status === 'Removed' || request.Status === 'Rejected') throw new Error('WORKFLOW HOLD — request is closed.');
  request.Status = 'Approved for setup'; request['Approval Status'] = 'Approved'; request['Owner Decision'] = decision; request['Next Action'] = 'Create fulfillment workspace';
  h38BackendSave_('requests',request);
  request = h38BackendPromoteApprovedRequest_(request);
  h38BackendProof_('Owner workflow',requestId,'Approve request',decision,'PASS','Owner=' + owner,'No customer action executed.');
  return h38BackendCreateFulfillment_(request);
}

function h38BackendCreateFulfillment_(request) {
  var existing = h38BackendFind_('fulfillment','Request ID',request['Request ID']);
  if (existing) return existing;
  var fulfillmentId = h38BackendId_('FUL');
  var record = h38BackendSave_('fulfillment',{
    'Fulfillment ID':fulfillmentId,'Request ID':request['Request ID'],'Customer ID':request['Customer ID'],'Job ID':request['Job ID'],'Product / Bundle ID':request['Product / Bundle ID'],
    'Status':'Setup','Inputs Complete':'No','Scope Approved':'No','Quote Status':'Not prepared','Payment Status':'Not requested','Start Authorization':'HOLD',
    'Deliverables':'','QA Status':'Not started','Revisions Used':'0','Revision Allowance':'Catalog controlled','Final Delivery Status':'BLOCKED — OWNER APPROVAL REQUIRED',
    'Owner Decision':'APPROVE REQUEST FOR FULFILLMENT','Next Action':'Confirm inputs, scope, quote, and payment requirements'
  });
  h38BackendSave_('tasks',{'Task ID':h38BackendId_('TASK'),'Task Title':'Prepare fulfillment scope','Task Type':'Fulfillment','Related ID':fulfillmentId,'Priority':'High','Status':'Open','Approval Requirement':'Owner Approval Required','Approval Status':'Pending','Assigned Action':'Verify inputs and prepare scope','Next Recommended Action':'Keep start authorization on HOLD'});
  h38BackendProof_('Fulfillment',fulfillmentId,'Create fulfillment workspace','APPROVE REQUEST FOR FULFILLMENT','PASS','Request=' + request['Request ID'],'Final delivery remains blocked.');
  h38BackendMirrorFulfillment_(record);
  return record;
}

function h38BackendAuthorizeStart(fulfillmentId, decision) {
  h38BackendOwner_();
  if (decision !== 'AUTHORIZE FULFILLMENT START') throw new Error('APPROVAL HOLD — exact decision required.');
  var record = h38BackendFind_('fulfillment','Fulfillment ID',fulfillmentId);
  if (!record) throw new Error('Fulfillment record not found.');
  var blockers = [];
  if (record['Inputs Complete'] !== 'Yes') blockers.push('inputs incomplete');
  if (record['Scope Approved'] !== 'Yes') blockers.push('scope unapproved');
  if (['Accepted','Not required'].indexOf(record['Quote Status']) < 0) blockers.push('quote not accepted/not required');
  if (['Paid','Not required'].indexOf(record['Payment Status']) < 0) blockers.push('payment incomplete/not required');
  if (blockers.length) throw new Error('START HOLD — ' + blockers.join('; ') + '.');
  record.Status = 'Ready to start'; record['Start Authorization'] = 'AUTHORIZED'; record['Owner Decision'] = decision; record['Next Action'] = 'Begin approved internal fulfillment work';
  h38BackendSave_('fulfillment',record);
  h38BackendProof_('Fulfillment',fulfillmentId,'Authorize start',decision,'PASS','All start gates satisfied','No send or final delivery authorized.');
  return record;
}

function h38BackendMarkReadyForOwnerReview(fulfillmentId, qaEvidence) {
  h38BackendOwner_();
  var record = h38BackendFind_('fulfillment','Fulfillment ID',fulfillmentId);
  if (!record || record['Start Authorization'] !== 'AUTHORIZED') throw new Error('WORKFLOW HOLD — authorized fulfillment required.');
  if (!h38BackendClean_(qaEvidence,5000)) throw new Error('QA HOLD — evidence required.');
  record.Status = 'Owner review'; record['QA Status'] = 'Complete'; record['Final Delivery Status'] = 'BLOCKED — OWNER APPROVAL REQUIRED'; record['Next Action'] = 'Owner reviews deliverables; delivery remains separate';
  h38BackendSave_('fulfillment',record);
  h38BackendProof_('Fulfillment',fulfillmentId,'Submit for owner review','INTERNAL QA COMPLETE','PASS',qaEvidence,'No final delivery executed.');
  return record;
}

function h38BackendBusinessOsSnapshot() {
  h38BackendOwner_();
  function count(entity, field) {
    var t=h38BackendTable_(entity), values=t.sheet.getDataRange().getDisplayValues(), headers=values[0] || [], idx=headers.indexOf(field), out={};
    values.slice(1).forEach(function(row){var key=String(row[idx] || 'Unknown'); out[key]=(out[key] || 0)+1;}); return out;
  }
  return {release:H38_BACKEND.RELEASE,requests:count('requests','Status'),fulfillment:count('fulfillment','Status'),tasks:count('tasks','Status'),externalActions:false,generatedAt:h38BackendNow_()};
}
