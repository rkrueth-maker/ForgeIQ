function doGet() {
  return ContentService.createTextOutput(JSON.stringify({service:'Highway 38 request intake',release:H38_BACKEND.RELEASE,status:'available',externalActions:false})).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var fingerprint = '', requestId = '';
  try {
    if (String(h38BackendProps_().getProperty(H38_BACKEND.PUBLIC_INTAKE_ENABLED_PROPERTY)).toLowerCase() !== 'true') throw new Error('INTAKE HOLD — public intake is disabled.');
    var raw = e && e.postData ? String(e.postData.contents || '') : '';
    if (!raw || raw.length > 30000) throw new Error('VALIDATION HOLD — invalid request size.');
    fingerprint = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw)).slice(0,32);
    var payload = JSON.parse(raw);
    var result = h38BackendCreateRequest_(payload,fingerprint);
    requestId = result.requestId;
    return h38BackendJson_({ok:true,requestId:requestId,status:result.status,message:'Request received for Owner review. No work or charge has started.'});
  } catch (error) {
    h38BackendError_('Public intake',requestId,error,fingerprint);
    return h38BackendJson_({ok:false,status:'HOLD',message:String(error.message || error)});
  }
}

function h38BackendCreateRequest_(payload, fingerprint) {
  payload = payload || {};
  if (h38BackendClean_(payload.website,100)) throw new Error('VALIDATION HOLD — automated submission rejected.');
  var email = h38BackendClean_(payload.email,320).toLowerCase();
  var name = h38BackendClean_(payload.name,200);
  var problem = h38BackendClean_(payload.problem,5000);
  if (!name || !email || email.indexOf('@') < 1 || !problem) throw new Error('VALIDATION HOLD — name, valid email, and problem are required.');
  var catalogId = h38BackendClean_(payload.catalogId,20).toUpperCase();
  if (catalogId && H38_BACKEND.PRODUCT_IDS.concat(H38_BACKEND.BUNDLE_IDS).indexOf(catalogId) < 0) throw new Error('VALIDATION HOLD — unknown product or bundle.');
  var key = h38BackendClean_(payload.idempotencyKey,100) || fingerprint;
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var existing = h38BackendFind_('requests','Idempotency Key',key);
    if (existing) return {requestId:existing['Request ID'],status:'DUPLICATE_ACCEPTED'};
    var now = h38BackendNow_(), requestId = h38BackendId_('REQ');
    h38BackendSave_('requests',{
      'Request ID':requestId,'Received Time':now,'Idempotency Key':key,'Status':'New','Approval Status':'Owner Approval Required','Owner Decision':'','Name':name,'Email':email,
      'Phone':h38BackendClean_(payload.phone,80),'Preferred Contact':h38BackendClean_(payload.preferredContact,80),'Desired Outcome':h38BackendClean_(payload.desiredOutcome,1000),
      'Product / Bundle ID':catalogId,'Problem':problem,'Finished Result':h38BackendClean_(payload.finishedResult,5000),'Files or Links':h38BackendClean_(payload.filesOrLinks,5000),
      'Project Details':h38BackendClean_(payload.details,5000),'Budget':h38BackendClean_(payload.budget,100),'Timing':h38BackendClean_(payload.timing,100),'Source':h38BackendClean_(payload.source,100) || 'website',
      'Privacy Classification':'Customer Confidential','Next Action':'Owner review and qualification','Created Time':now,'Updated Time':now
    });
    h38BackendSave_('tasks',{'Task ID':h38BackendId_('TASK'),'Task Title':'Review new customer request','Task Type':'Customer intake','Related ID':requestId,'Priority':'High','Status':'Open','Approval Requirement':'Owner Approval Required','Approval Status':'Pending','Assigned Action':'Review request; qualify or request information','Next Recommended Action':'Open request ' + requestId});
    h38BackendMirrorNewRequest_(h38BackendFind_('requests','Request ID',requestId));
    h38BackendProof_('Website intake',requestId,'Create request','PUBLIC SUBMISSION','PASS','Fingerprint=' + fingerprint,'Internal records only.');
    return {requestId:requestId,status:'OWNER_REVIEW_REQUIRED'};
  } finally { lock.releaseLock(); }
}

/** Installable Google Form response trigger. It never sends a customer message. */
function h38BackendOnFormSubmit(e) {
  var response = e && e.response, answers = {};
  if (!response) throw new Error('FORM HOLD — response event required.');
  response.getItemResponses().forEach(function(itemResponse){ answers[itemResponse.getItem().getTitle()] = itemResponse.getResponse(); });
  var raw = JSON.stringify(answers), fingerprint = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw)).slice(0,32);
  var email = String(response.getRespondentEmail() || answers.Email || '');
  return h38BackendCreateRequest_({
    idempotencyKey:'FORM-' + response.getId(), source:'approved-google-form', name:answers.Name, email:email,
    phone:answers['Phone number — optional'], preferredContact:answers['Preferred contact method'],
    desiredOutcome:answers['What would you like to have when this is finished?'],
    problem:answers['What is wrong, messy, confusing, or costing time?'],
    finishedResult:answers['What should the finished result let you do?'],
    filesOrLinks:answers['Photos, screenshots, files, videos, or links available'],
    details:[answers['Measurements, process data, tools, constraints, or important details'],answers['Family-specific details: describe the space/project, business workflow, digital tools/access limits, file collection, or manufacturing machine/process/part/cycle as applicable.']].filter(String).join('\n'),
    budget:answers['Budget range'], timing:answers['Desired timing']
  },fingerprint);
}

function h38BackendClean_(value, max) {
  var clean = String(value === undefined || value === null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim();
  if (clean.length > max) throw new Error('VALIDATION HOLD — field exceeds ' + max + ' characters.');
  return clean;
}
function h38BackendJson_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
