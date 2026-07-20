/** Business Office control plane — live credential provisioning, proof queues, and social-source validation. */

function boControlPermissionDefinition_(roleId,moduleName,actions){
  var values={'Permission ID':'PERM-'+roleId.replace(/^ROLE-/,'')+'-'+String(moduleName||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase(),'Role ID':roleId,Module:moduleName,View:'No',Create:'No',Edit:'No',Approve:'No',Post:'No',Export:'No',Admin:'No',Active:'Yes'};
  Object.keys(actions||{}).forEach(function(key){values[key]=actions[key]===true?'Yes':'No';});
  return values;
}
function boControlCredentialDefinitions_(){
  return[
    {id:'ROLE-FOREMAN',name:'Foreman',description:'Crew leadership, assigned work, field proof, receipts, and quote drafting without owner release authority.',permissions:[
      boControlPermissionDefinition_('ROLE-FOREMAN',H38_BO_SHEETS.CUSTOMERS,{View:true,Edit:true}),
      boControlPermissionDefinition_('ROLE-FOREMAN',H38_BO_SHEETS.QUOTES,{View:true,Create:true,Edit:true}),
      boControlPermissionDefinition_('ROLE-FOREMAN',H38_BO_SHEETS.WORK_ORDERS,{View:true,Create:true,Edit:true}),
      boControlPermissionDefinition_('ROLE-FOREMAN',H38_BO_SHEETS.JOBS,{View:true,Create:true,Edit:true}),
      boControlPermissionDefinition_('ROLE-FOREMAN',H38_BO_SHEETS.TIME_ENTRIES,{View:true,Create:true,Edit:true}),
      boControlPermissionDefinition_('ROLE-FOREMAN',H38_BO_SHEETS.DOCUMENTS,{View:true,Create:true,Edit:true}),
      boControlPermissionDefinition_('ROLE-FOREMAN',H38_BO_SHEETS.RECEIPTS,{View:true,Create:true,Edit:true})
    ]},
    {id:'ROLE-ESTIMATOR',name:'Estimator',description:'Customer, quote, price-book, and supporting-document access without owner send authority.',permissions:[
      boControlPermissionDefinition_('ROLE-ESTIMATOR',H38_BO_SHEETS.CUSTOMERS,{View:true,Edit:true}),
      boControlPermissionDefinition_('ROLE-ESTIMATOR',H38_BO_SHEETS.QUOTES,{View:true,Create:true,Edit:true}),
      boControlPermissionDefinition_('ROLE-ESTIMATOR',H38_BO_SHEETS.DOCUMENTS,{View:true,Create:true,Edit:true}),
      boControlPermissionDefinition_('ROLE-ESTIMATOR',H38_BO_SHEETS.SETUP_CHECKLIST,{View:true})
    ]},
    {id:'ROLE-FIELD',name:'Field Staff',description:'Assigned tasks, job instructions, time, field photos, and job-related receipt capture only.',permissions:[
      boControlPermissionDefinition_('ROLE-FIELD',H38_BO_SHEETS.WORK_ORDERS,{View:true}),
      boControlPermissionDefinition_('ROLE-FIELD',H38_BO_SHEETS.JOBS,{View:true}),
      boControlPermissionDefinition_('ROLE-FIELD',H38_BO_SHEETS.TIME_ENTRIES,{View:true,Create:true,Edit:true}),
      boControlPermissionDefinition_('ROLE-FIELD',H38_BO_SHEETS.DOCUMENTS,{View:true,Create:true}),
      boControlPermissionDefinition_('ROLE-FIELD',H38_BO_SHEETS.RECEIPTS,{View:true,Create:true})
    ]}
  ];
}
function boControlProvisionCredentials_(){
  var owner=boRequireOwner_(),createdRoles=0,permissionRows=0;
  boControlCredentialDefinitions_().forEach(function(definition){
    var existing=boReadTable_(H38_BO_SHEETS.ROLES,{includeVoided:true}).find(function(row){return row['Role ID']===definition.id;});
    boUpsertSeedRow_(H38_BO_SHEETS.ROLES,'Role ID',definition.id,{'Role ID':definition.id,'Role Name':definition.name,Description:definition.description,Active:'Yes',Status:'Active'});
    if(!existing)createdRoles+=1;
    definition.permissions.forEach(function(permission){boUpsertSeedRow_(H38_BO_SHEETS.PERMISSIONS,'Permission ID',permission['Permission ID'],permission);permissionRows+=1;});
  });
  boProof_('PROVISION FIELD CREDENTIALS','System',boGetBusinessId_(),'PASS','Roles created: '+createdRoles+'; permission rows verified: '+permissionRows,owner.Email);
  return{status:'PASS',createdRoles:createdRoles,permissionRows:permissionRows,roles:boControlCredentialDefinitions_().map(function(item){return item.name;})};
}
function boControlPendingProof_(){
  return boControlRead_('PROOF',false).filter(function(row){return row['Approval Status']!=='Approved';}).sort(function(a,b){return String(b['Captured Time']||'').localeCompare(String(a['Captured Time']||''));});
}
function boControlLiveBootstrap_(){
  var data=boControlBootstrap_(),role=data.user&&data.user.role||'',credentials={status:'NOT_REQUIRED'};
  if(data.status==='PASS'&&role==='Owner')credentials=boControlProvisionCredentials_();
  data.credentials=credentials;
  data.proofQueue=data.status==='PASS'&&role==='Owner'?boControlPendingProof_():[];
  if(role==='Owner')data.actions.push(boControlAction_('proof-review','Review Job Photos','📸','control:proof',false));
  return data;
}
function boControlApproveProofLive_(proofId,customerVisible){
  return boControlApproveProof_(proofId,customerVisible===true);
}
function boControlSocialSourceValidation_(record){
  var sourceId=boNormalizeText_(record&&record['Source Document ID']);
  if(!sourceId)return{valid:true,type:'TEXT_ONLY'};
  var document=boFindRecord_(H38_BO_SHEETS.DOCUMENTS,sourceId,{includeVoided:true}).record;
  boAssert_(document['Is Voided']!=='Yes','The selected social source document is voided.');
  var proof=boControlRead_('PROOF',false).find(function(row){return row['Document ID']===sourceId;});
  if(proof){boAssert_(proof['Approval Status']==='Approved','Owner review of the selected field photo is required before social use.');return{valid:true,type:'APPROVED_FIELD_PROOF',proofId:proof['Task Proof ID'],customerVisible:proof['Customer Visible']==='Yes'};}
  boAssert_(document['Document Type']==='Social Media Asset','Social content must use an approved field photo or a document classified as Social Media Asset.');
  boAssert_(document['Approval Status']==='Approved','Owner approval of the Social Media Asset is required.');
  return{valid:true,type:'APPROVED_SOCIAL_ASSET'};
}
function boControlSocialSaveLive_(recordId,values){
  var input=values||{};
  if(input['Source Document ID'])boControlSocialSourceValidation_(input);
  return boControlSocialSave_(recordId,input);
}
function boControlSocialActionLive_(recordId,action,notes,scheduledTime){
  var record=boControlFind_('SOCIAL',recordId),event=String(action||'');
  if(['APPROVE','SCHEDULE','PUBLISH','MARK_POSTED'].indexOf(event)>=0)boControlSocialSourceValidation_(record);
  return boControlSocialAction_(recordId,event,notes,scheduledTime);
}
function boControlApiLive(request){
  var payload=request||{},action=boNormalizeText_(payload.action),args=payload.args||{};
  if(action==='bootstrap')return boControlLiveBootstrap_();
  if(action==='provisionCredentials')return boControlProvisionCredentials_();
  if(action==='approveProof')return boControlApproveProofLive_(args.proofId,args.customerVisible===true);
  if(action==='socialSave')return boControlSocialSaveLive_(args.recordId||'',args.values||{});
  if(action==='socialAction')return boControlSocialActionLive_(args.recordId,args.action,args.notes||'',args.scheduledTime||'');
  return boControlApi(payload);
}
