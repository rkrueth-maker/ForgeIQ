/** Mirrors selected internal records into the existing Owner Portal sheets. */
function h38BackendPortalTable_(entity) {
  var spec=H38_PORTAL_MIRROR_TABLES[entity], sh=spec && h38BackendSpreadsheet_().getSheetByName(spec.sheet);
  if(!spec||!sh) throw new Error('PORTAL HOLD — missing ' + (spec ? spec.sheet : entity));
  var headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
  return {spec:spec,sheet:sh,headers:headers};
}

function h38BackendPortalFind_(entity,field,value) {
  var t=h38BackendPortalTable_(entity), values=t.sheet.getDataRange().getDisplayValues(), idx=t.headers.indexOf(field);
  if(idx<0)throw new Error('PORTAL SCHEMA HOLD — missing '+field);
  for(var i=1;i<values.length;i++)if(String(values[i][idx])===String(value)){var out={_row:i+1};t.headers.forEach(function(h,j){out[h]=values[i][j];});return out;}
  return null;
}

function h38BackendPortalSave_(entity,record) {
  var t=h38BackendPortalTable_(entity), id=record[t.spec.id], current=h38BackendPortalFind_(entity,t.spec.id,id), now=h38BackendNow_();
  if(!id)throw new Error('PORTAL HOLD — missing '+t.spec.id);
  if(t.headers.indexOf('Created Time')>=0&&!record['Created Time'])record['Created Time']=current?current['Created Time']:now;
  if(t.headers.indexOf('Updated Time')>=0)record['Updated Time']=now;
  var row=t.headers.map(function(h){return record[h]!==undefined?record[h]:(current?current[h]:'');});
  if(current)t.sheet.getRange(current._row,1,1,row.length).setValues([row]);else t.sheet.appendRow(row);
  return h38BackendPortalFind_(entity,t.spec.id,id);
}

function h38BackendMirrorNewRequest_(request) {
  var lead=h38BackendPortalFind_('leads','Email',request.Email), leadId=lead?lead['Lead ID']:h38BackendId_('LEAD');
  h38BackendPortalSave_('leads',{'Lead ID':leadId,'Name':request.Name,'Email':request.Email,'Phone':request.Phone,'Preferred Contact':request['Preferred Contact'],'Lead Source':'Website request','First Contact Date':request['Received Time'],'Status':'New','Product / Bundle ID':request['Product / Bundle ID'],'Next Action':'Owner reviews request '+request['Request ID'],'Privacy Classification':'Customer Confidential','Notes':'Backend Request ID='+request['Request ID']});
  var taskId=h38BackendId_('TASK');
  h38BackendPortalSave_('tasks',{'Task ID':taskId,'Task Title':'Review website request','Task Type':'Customer intake','Product / Bundle ID':request['Product / Bundle ID'],'Priority':'High','Status':'Open','Approval Requirement':'Owner Approval Required','Approval Status':'Rick Review Required / Owner Approval Required','Assigned Action':'APPROVE_TASK','Source System':'Integrated Backend','Source Sheet':'Backend Requests','Last Update':h38BackendNow_(),'Next Recommended Action':'Review request '+request['Request ID'],'Notes':'Lead ID='+leadId+'; Request ID='+request['Request ID']});
  request['Lead ID']=leadId; request['Next Action']='Owner Portal task '+taskId; h38BackendSave_('requests',request);
  return {leadId:leadId,taskId:taskId};
}

function h38BackendPromoteApprovedRequest_(request) {
  var customer=h38BackendPortalFind_('customers','Email',request.Email), customerId=customer?customer['Customer ID']:h38BackendId_('CUSTOMER'), jobId=request['Job ID']||h38BackendId_('JOB');
  h38BackendPortalSave_('customers',{'Customer ID':customerId,'Name':request.Name,'Email':request.Email,'Phone':request.Phone,'Preferred Contact':request['Preferred Contact'],'Lead Source':'Website request','First Contact Date':request['Received Time'],'Customer Status':'Active','Privacy Classification':'Customer Confidential','Notes':'Created from '+request['Request ID']});
  h38BackendPortalSave_('jobs',{'Job ID':jobId,'Customer ID':customerId,'Customer Name':request.Name,'Product / Bundle ID':request['Product / Bundle ID'],'Scope':request['Finished Result'],'Inputs Received':'Partial','Intake Complete':'No','Missing Information':'Owner review required','Payment Requirement':'Catalog controlled','Payment Status':'Not requested','Start Authorization':'HOLD','Job Stage':'Intake','Revisions Used':'0','Revision Allowance':'Catalog controlled','QA Status':'Not started','Approval Status':'Owner Approval Required','Final Delivery Status':'BLOCKED — OWNER APPROVAL REQUIRED','Notes':'Backend Request ID='+request['Request ID']});
  request['Customer ID']=customerId;request['Job ID']=jobId;h38BackendSave_('requests',request);
  return request;
}

function h38BackendMirrorFulfillment_(record) {
  var job=h38BackendPortalFind_('jobs','Job ID',record['Job ID']); if(!job)return null;
  job['Job Stage']=record.Status;job['Inputs Received']=record['Inputs Complete'];job['Payment Status']=record['Payment Status'];job['Start Authorization']=record['Start Authorization'];job['Deliverables']=record.Deliverables;job['Revisions Used']=record['Revisions Used'];job['Revision Allowance']=record['Revision Allowance'];job['QA Status']=record['QA Status'];job['Final Delivery Status']=record['Final Delivery Status'];
  return h38BackendPortalSave_('jobs',job);
}

