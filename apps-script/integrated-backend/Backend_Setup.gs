function h38BackendInstallFormTrigger(options) {
  h38BackendOwner_(); options=options||{};
  if(options.confirmation!=='INSTALL APPROVED FORM TRIGGER')throw new Error('INSTALL HOLD — exact confirmation required.');
  var formId=h38BackendProps_().getProperty(H38_BACKEND.INTAKE_FORM_ID_PROPERTY);
  if(!formId)throw new Error('CONFIGURATION HOLD — set '+H38_BACKEND.INTAKE_FORM_ID_PROPERTY+'.');
  var existing=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='h38BackendOnFormSubmit';});
  if(existing.length)return {status:'ALREADY_INSTALLED',triggerCount:existing.length};
  ScriptApp.newTrigger('h38BackendOnFormSubmit').forForm(FormApp.openById(formId)).onFormSubmit().create();
  h38BackendProof_('Installer','SYSTEM','Install approved form trigger','INSTALL APPROVED FORM TRIGGER','PASS','Form ID fingerprint='+formId.slice(-8),'One approved form trigger; no customer send.');
  return {status:'PASS',triggerCount:1};
}

function h38BackendActivationStatus() {
  h38BackendOwner_(); var props=h38BackendProps_();
  return {release:H38_BACKEND.RELEASE,spreadsheetConfigured:!!props.getProperty(H38_BACKEND.SPREADSHEET_PROPERTY),ownerConfigured:!!props.getProperty(H38_BACKEND.OWNER_EMAILS_PROPERTY),formConfigured:!!props.getProperty(H38_BACKEND.INTAKE_FORM_ID_PROPERTY),publicWebIntakeEnabled:String(props.getProperty(H38_BACKEND.PUBLIC_INTAKE_ENABLED_PROPERTY)).toLowerCase()==='true',formTriggerCount:ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='h38BackendOnFormSubmit';}).length,externalActions:false};
}
