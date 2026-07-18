/** Highway 38 Quote Builder — commercial proposal, lifecycle, options, signatures, and controlled sharing. */

var H38_QB_COMMERCIAL = Object.freeze({
  ACTIVITY_TYPE:'Quote Commercial State',
  SHARE_ACTIVITY_TYPE:'Quote Proposal Share',
  FOLLOWUP_ACTIVITY_TYPE:'Quote Follow-up',
  VERSION:1,
  STATUSES:['Draft','Internal Review','Approved to Share','Shared','Viewed','Changes Requested','Revised','Accepted','Declined','Expired','Converted','Archived'],
  CUSTOMER_ACTIONS:['view','approve','request_changes','decline','sign'],
  EXTERNAL_ACTIONS_ENABLED:false
});

function boQuoteCommercialText_(value){return String(value==null?'':value).trim();}
function boQuoteCommercialJson_(value,fallback){try{return value?JSON.parse(value):fallback;}catch(error){return fallback;}}
function boQuoteCommercialNow_(){return boNow_ ? boNow_() : new Date().toISOString();}
function boQuoteCommercialToken_(){return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');}
function boQuoteCommercialActivityRows_(quoteId){
  var snapshot=boQuoteBuilderSnapshot_(H38_BO_SHEETS.ACTIVITY,{includeVoided:true});
  return snapshot.rows.filter(function(row){return row['Record Type']==='Quote'&&row['Record ID']===quoteId&&row['Activity Type']===H38_QB_COMMERCIAL.ACTIVITY_TYPE;})
    .sort(function(a,b){return String(b['Created Time']||'').localeCompare(String(a['Created Time']||''));});
}
function boQuoteCommercialQuote_(quoteId){
  var snapshot=boQuoteBuilderSnapshot_(H38_BO_SHEETS.QUOTES,{includeVoided:true});
  var quote=snapshot.rows.find(function(row){return row['Quote ID']===quoteId;});
  boAssert_(quote,'The selected quote was not found.');
  return quote;
}
function boQuoteCommercialCustomer_(customerId){
  if(!customerId)return {};
  var snapshot=boQuoteBuilderSnapshot_(H38_BO_SHEETS.CUSTOMERS,{includeVoided:true});
  return snapshot.rows.find(function(row){return row['Customer ID']===customerId;})||{};
}
function boQuoteCommercialDefault_(quote){
  return {
    schemaVersion:H38_QB_COMMERCIAL.VERSION,
    quoteId:quote['Quote ID'],
    quoteVersion:Number(quote['Revision Number']||1),
    lifecycleStatus:boQuoteCommercialText_(quote.Status)||'Draft',
    layout:'simple',
    approvalRule:'one_option',
    coverPhotoId:'',
    summary:boQuoteCommercialText_(quote.Scope||quote['Project Title']),
    includedWork:[],
    terms:boQuoteCommercialText_(quote.Terms||quote['Payment Terms']),
    exclusions:boQuoteCommercialText_(quote.Exclusions),
    assumptions:boQuoteCommercialText_(quote.Assumptions),
    expirationDate:boQuoteCommercialText_(quote['Expiration Date']),
    visibility:{quantity:true,unitPrice:true,lineTotal:true,tax:true,photos:true},
    options:[],
    addOns:[],
    photoLinks:[],
    customerSelection:{optionIds:[],addOnIds:[]},
    signature:null,
    followUp:{dueDate:'',nextAction:'',status:'Not Scheduled'},
    share:{token:'',createdTime:'',approvedVersion:0,channel:'',recipient:'',lastViewedTime:''},
    history:[]
  };
}
function boQuoteCommercialState_(quoteId){
  boQuoteBuilderRequireAction_('View');
  var quote=boQuoteCommercialQuote_(quoteId),rows=boQuoteCommercialActivityRows_(quoteId);
  var state=rows.length?boQuoteCommercialJson_(rows[0].Details,null):null;
  state=state||boQuoteCommercialDefault_(quote);
  state.quoteId=quoteId;
  state.quoteVersion=Number(quote['Revision Number']||state.quoteVersion||1);
  state.lifecycleStatus=state.lifecycleStatus||quote.Status||'Draft';
  state.history=Array.isArray(state.history)?state.history:[];
  return state;
}
function boQuoteCommercialAppendState_(quoteId,state,summary){
  var access=boQuoteBuilderRequireAction_('Edit');
  var activity={
    'Activity ID':boId_('QCOMM'),
    'Activity Type':H38_QB_COMMERCIAL.ACTIVITY_TYPE,
    'Record Type':'Quote',
    'Record ID':quoteId,
    Status:'Active',
    Summary:summary||'Commercial proposal state updated',
    Details:JSON.stringify(state),
    'Created By':access.user.id,
    'Created Time':boQuoteCommercialNow_()
  };
  boAppendRecord_(H38_BO_SHEETS.ACTIVITY,activity,'Quote commercial proposal state');
  boProof_('QUOTE COMMERCIAL STATE','Quote',quoteId,'PASS',summary||'State updated',access.user.email);
  return state;
}
function boQuoteCommercialSave_(payload){
  return boSafeExecute_('Save quote commercial proposal',function(){
    payload=payload||{};var quoteId=boQuoteCommercialText_(payload.quoteId);boAssert_(quoteId,'Quote ID is required.');
    var current=boQuoteCommercialState_(quoteId),next=Object.assign({},current,payload.state||{});
    next.quoteId=quoteId;next.schemaVersion=H38_QB_COMMERCIAL.VERSION;next.quoteVersion=current.quoteVersion;
    next.visibility=Object.assign({},current.visibility||{},(payload.state||{}).visibility||{});
    next.followUp=Object.assign({},current.followUp||{},(payload.state||{}).followUp||{});
    next.share=Object.assign({},current.share||{},(payload.state||{}).share||{});
    next.history=(current.history||[]).slice(-99);
    return boQuoteCommercialAppendState_(quoteId,next,'Commercial proposal saved');
  },'Quote',payload&&payload.quoteId);
}
function boQuoteCommercialAllowedTransition_(from,to){
  var map={
    'Draft':['Internal Review','Archived'],
    'Internal Review':['Draft','Approved to Share','Archived'],
    'Approved to Share':['Internal Review','Shared','Archived'],
    'Shared':['Viewed','Changes Requested','Accepted','Declined','Expired','Archived'],
    'Viewed':['Changes Requested','Accepted','Declined','Expired','Archived'],
    'Changes Requested':['Revised','Declined','Archived'],
    'Revised':['Internal Review','Approved to Share','Archived'],
    'Accepted':['Converted','Archived'],
    'Declined':['Revised','Archived'],
    'Expired':['Revised','Archived'],
    'Converted':['Archived'],
    'Archived':[]
  };
  return (map[from]||[]).indexOf(to)>=0;
}
function boQuoteCommercialTransition_(payload){
  return boSafeExecute_('Transition quote lifecycle',function(){
    payload=payload||{};var quoteId=boQuoteCommercialText_(payload.quoteId),to=boQuoteCommercialText_(payload.status);
    boAssert_(H38_QB_COMMERCIAL.STATUSES.indexOf(to)>=0,'Unsupported quote lifecycle status.');
    var state=boQuoteCommercialState_(quoteId),from=state.lifecycleStatus||'Draft';
    boAssert_(from===to||boQuoteCommercialAllowedTransition_(from,to),'Quote cannot move from '+from+' to '+to+'.');
    if(to==='Approved to Share')boRequireOwner_();
    if(to==='Shared'){
      boRequireOwner_();
      boAssert_(state.share&&state.share.approvedVersion===state.quoteVersion,'The exact quote version must be approved before sharing.');
      boAssert_(state.share.token,'A controlled proposal share token is required.');
    }
    state.lifecycleStatus=to;
    state.history=(state.history||[]).concat([{time:boQuoteCommercialNow_(),from:from,to:to,notes:boQuoteCommercialText_(payload.notes),version:state.quoteVersion,actor:boGetCurrentUser_().Email}]).slice(-100);
    try{boQuoteBuilderSaveRecord_('quotes',quoteId,{Status:to,'Customer Action':to==='Accepted'?'Accepted':to==='Declined'?'Declined':to==='Changes Requested'?'Changes Requested':undefined});}catch(ignore){}
    return boQuoteCommercialAppendState_(quoteId,state,'Lifecycle '+from+' → '+to);
  },'Quote',payload&&payload.quoteId);
}
function boQuoteCommercialPrepareShare_(payload){
  return boSafeExecute_('Prepare controlled quote sharing',function(){
    payload=payload||{};boRequireOwner_();
    var quoteId=boQuoteCommercialText_(payload.quoteId),state=boQuoteCommercialState_(quoteId),quote=boQuoteCommercialQuote_(quoteId),customer=boQuoteCommercialCustomer_(quote['Customer ID']);
    boAssert_(state.lifecycleStatus==='Approved to Share','Quote must be Approved to Share before a customer link is prepared.');
    state.share=Object.assign({},state.share||{},{token:boQuoteCommercialToken_(),createdTime:boQuoteCommercialNow_(),approvedVersion:state.quoteVersion,channel:boQuoteCommercialText_(payload.channel||'Manual Link'),recipient:boQuoteCommercialText_(payload.recipient||customer.Email||''),lastViewedTime:''});
    state.history=(state.history||[]).concat([{time:boQuoteCommercialNow_(),from:'Approved to Share',to:'Approved to Share',notes:'Controlled customer link prepared; not sent automatically.',version:state.quoteVersion,actor:boGetCurrentUser_().Email}]).slice(-100);
    boQuoteCommercialAppendState_(quoteId,state,'Controlled proposal link prepared');
    return {token:state.share.token,url:ScriptApp.getService().getUrl()+'?proposal='+encodeURIComponent(state.share.token),recipient:state.share.recipient,sendAllowed:false,notice:'Link prepared. No message was sent.'};
  },'Quote',payload&&payload.quoteId);
}
function boQuoteCommercialFindByToken_(token){
  token=boQuoteCommercialText_(token);boAssert_(token&&token.length>20,'Invalid proposal token.');
  var snapshot=boQuoteBuilderSnapshot_(H38_BO_SHEETS.ACTIVITY,{includeVoided:true});
  var rows=snapshot.rows.filter(function(row){return row['Activity Type']===H38_QB_COMMERCIAL.ACTIVITY_TYPE&&row['Record Type']==='Quote';})
    .sort(function(a,b){return String(b['Created Time']||'').localeCompare(String(a['Created Time']||''));});
  for(var i=0;i<rows.length;i++){
    var state=boQuoteCommercialJson_(rows[i].Details,null);
    if(state&&state.share&&state.share.token===token)return {quoteId:rows[i]['Record ID'],state:state};
  }
  throw new Error('This proposal link is invalid or no longer available.');
}
function boQuoteCommercialProposalDataByToken_(token,markViewed){
  var match=boQuoteCommercialFindByToken_(token),quote=boQuoteCommercialQuote_(match.quoteId),state=match.state;
  boAssert_(state.share.approvedVersion===Number(quote['Revision Number']||1),'This proposal link is locked because the quote version changed.');
  var customer=boQuoteCommercialCustomer_(quote['Customer ID']),details=boQuoteBuilderQuoteDetails_(match.quoteId),docs=boQuoteBuilderQuoteDocuments_(match.quoteId),branding=boBranding_();
  if(markViewed&&['Shared','Viewed'].indexOf(state.lifecycleStatus)>=0){
    state.lifecycleStatus='Viewed';state.share.lastViewedTime=boQuoteCommercialNow_();
    state.history=(state.history||[]).concat([{time:state.share.lastViewedTime,from:'Shared',to:'Viewed',notes:'Customer proposal opened.',version:state.quoteVersion,actor:'Customer'}]).slice(-100);
    boQuoteCommercialAppendState_(match.quoteId,state,'Customer viewed proposal');
  }
  return {quote:quote,customer:customer,details:details,state:state,branding:branding,documents:docs.filter(function(doc){return state.visibility.photos&&doc.reviewStatus!=='Internal Only';}),externalActionsEnabled:false};
}
function boQuoteCommercialCustomerAction_(token,action,payload){
  return boSafeExecute_('Customer proposal action',function(){
    action=boQuoteCommercialText_(action).toLowerCase();payload=payload||{};
    boAssert_(H38_QB_COMMERCIAL.CUSTOMER_ACTIONS.indexOf(action)>=0,'Unsupported customer proposal action.');
    var match=boQuoteCommercialFindByToken_(token),state=match.state,quote=boQuoteCommercialQuote_(match.quoteId);
    boAssert_(state.share.approvedVersion===Number(quote['Revision Number']||1),'This quote version changed. Ask the business for a new proposal link.');
    var target={approve:'Accepted',request_changes:'Changes Requested',decline:'Declined',sign:'Accepted',view:'Viewed'}[action];
    if(action==='sign'){
      var signature=boQuoteCommercialText_(payload.signatureDataUrl);boAssert_(signature.indexOf('data:image/')===0&&signature.length<250000,'Signature image is missing or too large.');
      state.signature={signerName:boQuoteCommercialText_(payload.signerName),signatureDataUrl:signature,time:boQuoteCommercialNow_(),quoteVersion:state.quoteVersion,selectedOptions:payload.optionIds||[],selectedAddOns:payload.addOnIds||[],acceptedTerms:true};
    }
    state.customerSelection={optionIds:payload.optionIds||[],addOnIds:payload.addOnIds||[]};
    state.lifecycleStatus=target;
    state.history=(state.history||[]).concat([{time:boQuoteCommercialNow_(),from:match.state.lifecycleStatus,to:target,notes:boQuoteCommercialText_(payload.notes),version:state.quoteVersion,actor:boQuoteCommercialText_(payload.signerName||'Customer')}]).slice(-100);
    boQuoteCommercialAppendState_(match.quoteId,state,'Customer action: '+target);
    try{boQuoteBuilderSaveRecord_('quotes',match.quoteId,{Status:target,'Customer Action':target});}catch(ignore){}
    return {status:target,quoteId:match.quoteId,version:state.quoteVersion,automaticJobCreated:false,automaticWorkStarted:false};
  },'Quote','customer-token');
}
function boQuoteCommercialFollowUp_(payload){
  return boSafeExecute_('Schedule quote follow-up',function(){
    payload=payload||{};var state=boQuoteCommercialState_(payload.quoteId);
    state.followUp={dueDate:boQuoteCommercialText_(payload.dueDate),nextAction:boQuoteCommercialText_(payload.nextAction),status:'Scheduled'};
    state.history=(state.history||[]).concat([{time:boQuoteCommercialNow_(),from:state.lifecycleStatus,to:state.lifecycleStatus,notes:'Follow-up scheduled: '+state.followUp.nextAction,version:state.quoteVersion,actor:boGetCurrentUser_().Email}]).slice(-100);
    return boQuoteCommercialAppendState_(payload.quoteId,state,'Follow-up scheduled; no communication sent');
  },'Quote',payload&&payload.quoteId);
}
function boQuoteCommercialRenderOwnerPreview_(quoteId){
  boQuoteBuilderRequireAction_('View');
  var state=boQuoteCommercialState_(quoteId),quote=boQuoteCommercialQuote_(quoteId),customer=boQuoteCommercialCustomer_(quote['Customer ID']);
  var template=HtmlService.createTemplateFromFile('BusinessOffice_QuoteBuilder_Proposal');
  template.proposalJson=JSON.stringify({quote:quote,customer:customer,details:boQuoteBuilderQuoteDetails_(quoteId),state:state,branding:boBranding_(),documents:boQuoteBuilderQuoteDocuments_(quoteId),preview:true,token:''});
  return template.evaluate().getContent();
}
function boRenderCustomerProposal_(token){
  var data=boQuoteCommercialProposalDataByToken_(token,true),template=HtmlService.createTemplateFromFile('BusinessOffice_QuoteBuilder_Proposal');
  data.preview=false;data.token=token;template.proposalJson=JSON.stringify(data);
  return template.evaluate().setTitle((data.quote['Project Title']||'Proposal')+' · '+(data.branding.name||'Proposal')).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL).addMetaTag('viewport','width=device-width, initial-scale=1');
}
function boCustomerProposalLoad(token){return boQuoteCommercialProposalDataByToken_(token,true);}
function boCustomerProposalAction(token,action,payload){return boQuoteCommercialCustomerAction_(token,action,payload||{});}
