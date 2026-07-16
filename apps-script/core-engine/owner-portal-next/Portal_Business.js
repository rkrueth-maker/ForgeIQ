/** Native Business Office adapter for the unified Highway 38 application. */

function h38PortalBusinessBootstrap() {
  h38PortalAssertOwner_();
  boGetCurrentUser_();
  var definitions = boGetModuleDefinitions_();
  var modules = [];
  Object.keys(definitions).forEach(function (key) {
    if (boModuleEnabled_(key)) modules.push({ key:key, label:definitions[key].title || key });
  });
  return {
    status:'PASS',
    modules:modules,
    definitions:definitions,
    boundary:boApprovalNotice_(),
    externalActionsEnabled:false,
    ownerApprovalRequired:true
  };
}

function h38PortalBusinessModule(moduleKey, options) {
  h38PortalAssertOwner_();
  boGetCurrentUser_();
  moduleKey = boNormalizeText_(moduleKey);
  boAssertModuleEnabled_(moduleKey);
  var definitions = boGetModuleDefinitions_();
  var definition = definitions[moduleKey];
  boAssert_(definition, 'Business Office module is not supported: ' + moduleKey);
  var opts = options || {};
  var rows = boListRecords(moduleKey, {
    query:boNormalizeText_(opts.query),
    filters:opts.filters || {},
    limit:Math.min(Number(opts.limit || 250), 1000),
    includeVoided:opts.includeVoided === true
  });
  return {
    status:'PASS',
    module:moduleKey,
    definition:definition,
    rows:rows,
    count:rows.length,
    boundary:boApprovalNotice_(),
    externalActionsEnabled:false,
    ownerApprovalRequired:true
  };
}

function h38PortalBusinessWorkspace(moduleKey, recordId) {
  h38PortalAssertOwner_();
  boGetCurrentUser_();
  boAssertModuleEnabled_(moduleKey);
  return boUxWorkspace_(moduleKey, recordId);
}

function h38PortalBusinessSave(moduleKey, recordId, values) {
  h38PortalAssertOwner_();
  boGetCurrentUser_();
  boAssertModuleEnabled_(moduleKey);
  var saved = boSaveRecord(moduleKey, recordId || '', values || {});
  return {
    status:'PASS',
    module:moduleKey,
    record:saved,
    externalActionsOccurred:false,
    boundary:boApprovalNotice_()
  };
}

function h38PortalBusinessSaveFromDocument(moduleKey, recordId, values, documentId) {
  h38PortalAssertOwner_();
  boGetCurrentUser_();
  moduleKey = boNormalizeText_(moduleKey);
  documentId = boNormalizeText_(documentId);
  boAssertModuleEnabled_(moduleKey);
  boAssertModuleEnabled_('documents');
  boAssert_(documentId, 'The uploaded source document is missing.');

  var definitions = boGetModuleDefinitions_();
  var definition = definitions[moduleKey];
  boAssert_(definition, 'Business Office module is not supported: ' + moduleKey);
  var documentRecord = boFindRecord_(H38_BO_SHEETS.DOCUMENTS, documentId, { includeVoided:true }).record;
  var payload = Object.assign({}, values || {});
  var fields = definition.fields || [];
  var evidenceNote = 'Started from source document ' + documentId + (documentRecord['File Name'] ? ' (' + documentRecord['File Name'] + ')' : '') + '.';

  if (fields.indexOf('Document ID') >= 0 && !payload['Document ID']) payload['Document ID'] = documentId;
  if (fields.indexOf('Source') >= 0 && !payload.Source) payload.Source = 'Photo / PDF upload';
  if (fields.indexOf('Approval Status') >= 0 && !payload['Approval Status']) payload['Approval Status'] = 'Owner Review Required';
  if (fields.indexOf('Next Action') >= 0 && !payload['Next Action']) payload['Next Action'] = 'Review uploaded evidence';
  if (fields.indexOf('OCR Status') >= 0 && !payload['OCR Status']) payload['OCR Status'] = documentRecord['OCR State'] || 'Not Started';
  if (fields.indexOf('Notes') >= 0) payload.Notes = [boNormalizeText_(payload.Notes), evidenceNote].filter(Boolean).join(' | ');

  var saved = boSaveRecord(moduleKey, recordId || '', payload);
  var savedId = boNormalizeText_(saved[definition.primaryKey]);
  boUpdateRecord_(H38_BO_SHEETS.DOCUMENTS, documentId, {
    'Source Type': definition.title || moduleKey,
    'Source ID': savedId,
    'Review Status': documentRecord['Review Status'] || 'Needs Review'
  }, 'Link uploaded evidence to Business Office record');
  boProof_('LINK_SOURCE_DOCUMENT', definition.title || moduleKey, savedId, 'PASS', 'Linked source document ' + documentId + ' without external action.', boGetActiveEmail_());

  return {
    status:'PASS',
    module:moduleKey,
    record:saved,
    documentId:documentId,
    sourceLinked:true,
    externalActionsOccurred:false,
    boundary:boApprovalNotice_()
  };
}

function h38PortalBusinessSearch(query) {
  h38PortalAssertOwner_();
  boGetCurrentUser_();
  return boUxGlobalSearch_(query);
}

function h38PortalBusinessDashboard() {
  h38PortalAssertOwner_();
  boGetCurrentUser_();
  return boUxDashboard_();
}

function h38PortalBusinessUpload(payload) {
  h38PortalAssertOwner_();
  boGetCurrentUser_();
  boAssertModuleEnabled_('documents');
  var document = boUploadDocument(payload || {});
  return {
    status:'PASS',
    document:document,
    externalActionsOccurred:false,
    boundary:boApprovalNotice_()
  };
}
