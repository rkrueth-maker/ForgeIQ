/** Repository, installer-safe sheet access, audit logging, and generic CRUD. */
function h38PortalSpreadsheet_() {
  return SpreadsheetApp.openById(H38_PORTAL_NEXT.SPREADSHEET_ID);
}

function h38PortalAccess_() {
  var active = '';
  var effective = '';
  try { active = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (e) {}
  try { effective = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e2) {}
  var owners = H38_PORTAL_NEXT.OWNER_EMAILS.map(function(v) { return String(v).toLowerCase(); });
  return {allowed: owners.indexOf(active) >= 0 || owners.indexOf(effective) >= 0, activeUser:active || '(blank)', effectiveUser:effective || '(blank)', ownerEmails:owners};
}

function h38PortalAssertOwner_() {
  var access = h38PortalAccess_();
  if (!access.allowed) throw new Error('ACCESS HOLD — owner-only portal. Active=' + access.activeUser + ' Effective=' + access.effectiveUser);
  return access;
}

function h38PortalNow_() {
  return Utilities.formatDate(new Date(), H38_PORTAL_NEXT.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function h38PortalId_(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), H38_PORTAL_NEXT.TIMEZONE, 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

function h38PortalHeaderMap_(headers) {
  var map = {};
  headers.forEach(function(h, i) { map[String(h).trim()] = i; });
  return map;
}

function h38PortalObjectFromRow_(headers, row) {
  var out = {};
  headers.forEach(function(h, i) { out[String(h).trim()] = row[i] === undefined ? '' : row[i]; });
  return out;
}

function h38PortalInstalledStatus_() {
  var ss = h38PortalSpreadsheet_();
  var missing = [];
  Object.keys(H38_PORTAL_TABLES).forEach(function(key) {
    var spec = H38_PORTAL_TABLES[key];
    if (!ss.getSheetByName(spec.sheet)) missing.push(spec.sheet);
  });
  return {installed: missing.length === 0, missingSheets:missing, candidateRelease:H38_PORTAL_NEXT.RELEASE};
}

function h38PortalInstallCandidate(options) {
  h38PortalAssertOwner_();
  options = options || {};
  if (options.confirmation !== 'INSTALL NON-DEPLOYED CANDIDATE') throw new Error('INSTALL HOLD — exact confirmation required.');
  var ss = h38PortalSpreadsheet_();
  var created = [];
  var verified = [];
  Object.keys(H38_PORTAL_TABLES).forEach(function(key) {
    var spec = H38_PORTAL_TABLES[key];
    var sh = ss.getSheetByName(spec.sheet);
    if (!sh) {
      sh = ss.insertSheet(spec.sheet);
      sh.getRange(1, 1, 1, spec.headers.length).setValues([spec.headers]);
      sh.setFrozenRows(1);
      created.push(spec.sheet);
    } else {
      var actual = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0] : [];
      var missingHeaders = spec.headers.filter(function(h) { return actual.indexOf(h) < 0; });
      if (missingHeaders.length) throw new Error('SCHEMA HOLD — existing sheet ' + spec.sheet + ' is missing headers: ' + missingHeaders.join(', '));
      verified.push(spec.sheet);
    }
  });
  h38PortalSeedSettings_();
  h38PortalWriteProof_({jobId:'SYSTEM', source:'Portal Installer', action:'Install candidate data layer', decision:'INSTALL NON-DEPLOYED CANDIDATE', result:'PASS', evidence:'Created=' + created.join(', ') + '; Verified=' + verified.join(', '), notes:'No triggers, deployment, sends, payments, publishing, or customer delivery.'});
  return {status:'PASS', created:created, verified:verified, testMode:H38_PORTAL_NEXT.TEST_MODE, liveExternalActions:H38_PORTAL_NEXT.LIVE_EXTERNAL_ACTIONS_ENABLED};
}

function h38PortalSeedSettings_() {
  var defaults = [
    ['release',H38_PORTAL_NEXT.RELEASE,'string','system','No','Active','Candidate release identifier'],
    ['timezone',H38_PORTAL_NEXT.TIMEZONE,'string','system','No','Active','Required operating timezone'],
    ['test_mode','true','boolean','safety','No','Active','No external customer action'],
    ['live_external_actions','false','boolean','safety','No','Locked','Must remain false until explicit approval and regression testing'],
    ['metricool_mode','DISABLED','string','integration','No','Hold','Adapter built; credential and approval required'],
    ['payment_mode','MANUAL','string','integration','No','Active','Manual payment recording only'],
    ['accounting_export','CSV','string','integration','No','Active','Provider-neutral export'],
    ['catalog_status','MISMATCH_HOLD','string','catalog','No','Hold','Import exact approved catalog snapshot']
  ];
  var sh = h38PortalSpreadsheet_().getSheetByName(H38_PORTAL_TABLES.settings.sheet);
  if (sh.getLastRow() > 1) return;
  var now = h38PortalNow_();
  sh.getRange(2,1,defaults.length,H38_PORTAL_TABLES.settings.headers.length).setValues(defaults.map(function(r){ return r.concat([now]); }));
}

function h38PortalTable_(entity) {
  var spec = H38_PORTAL_TABLES[entity];
  if (!spec) throw new Error('Unknown portal entity: ' + entity);
  var sh = h38PortalSpreadsheet_().getSheetByName(spec.sheet);
  if (!sh) throw new Error('NOT INSTALLED — missing sheet ' + spec.sheet);
  return {spec:spec, sheet:sh};
}

function h38PortalList(entity, filters) {
  h38PortalAssertOwner_();
  filters = filters || {};
  var t = h38PortalTable_(entity);
  var values = t.sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = values.slice(1).filter(function(r){ return r.join('').trim() !== ''; }).map(function(r, index){ var o = h38PortalObjectFromRow_(headers,r); o._rowNumber = index + 2; o._entity = entity; return o; });
  Object.keys(filters).forEach(function(key) {
    var wanted = String(filters[key] || '').trim().toLowerCase();
    if (!wanted) return;
    rows = rows.filter(function(o){ return String(o[key] || '').toLowerCase().indexOf(wanted) >= 0; });
  });
  return rows.slice(-H38_PORTAL_NEXT.MAX_ROWS).reverse();
}

function h38PortalGet(entity, id) {
  h38PortalAssertOwner_();
  var t = h38PortalTable_(entity);
  var values = t.sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return null;
  var headers = values[0];
  var idIndex = headers.indexOf(t.spec.id);
  if (idIndex < 0) throw new Error('SCHEMA HOLD — ID header missing: ' + t.spec.id);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(id)) {
      var record = h38PortalObjectFromRow_(headers, values[i]);
      record._rowNumber = i + 1;
      record._entity = entity;
      return record;
    }
  }
  return null;
}

function h38PortalSave(entity, record) {
  h38PortalAssertOwner_();
  record = record || {};
  var t = h38PortalTable_(entity);
  var spec = t.spec;
  var now = h38PortalNow_();
  var id = String(record[spec.id] || '').trim();
  if (!id) {
    var prefix = spec.id.replace(/ ID$/,'').replace(/[^A-Za-z]/g,'').slice(0,8).toUpperCase() || 'REC';
    id = h38PortalId_(prefix);
    record[spec.id] = id;
    record['Created Time'] = now;
  }
  record['Updated Time'] = now;
  var current = h38PortalGet(entity, id);
  var row = spec.headers.map(function(h){ return record[h] !== undefined ? record[h] : (current ? current[h] : ''); });
  if (current) t.sheet.getRange(current._rowNumber,1,1,row.length).setValues([row]);
  else t.sheet.appendRow(row);
  h38PortalWriteProof_({jobId:record['Job ID'] || id, source:spec.sheet, action:(current ? 'Update ' : 'Create ') + entity, decision:'INTERNAL RECORD ACTION', result:'PASS', evidence:spec.id + '=' + id, notes:'Internal record only; no external execution.'});
  return h38PortalGet(entity,id);
}

function h38PortalDeleteToArchive(entity, id) {
  h38PortalAssertOwner_();
  var record = h38PortalGet(entity,id);
  if (!record) throw new Error('Record not found: ' + id);
  if (H38_PORTAL_STATUS[entity] && record.Status !== undefined) record.Status = 'Archived';
  else record['Archive Status'] = 'Archived';
  return h38PortalSave(entity,record);
}

function h38PortalWriteProof_(entry) {
  entry = entry || {};
  var ss = h38PortalSpreadsheet_();
  var sh = ss.getSheetByName('Proof Log');
  if (!sh) return;
  var headers = sh.getLastColumn() ? sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0] : [];
  var data = {
    'Proof ID': entry.proofId || h38PortalId_('PROOF'),
    'Timestamp': h38PortalNow_(),
    'Job ID': entry.jobId || '',
    'Queue Tab': entry.source || 'Owner Portal Next',
    'Action Type': entry.action || '',
    'Approval Status Before': entry.approvalBefore || '',
    'Rick Decision': entry.decision || '',
    'Approved By': entry.approvedBy || 'Rick / Owner Portal',
    'Source Evidence': entry.evidence || '',
    'Output Created': entry.output || '',
    'Recipient / Destination': entry.destination || '',
    'Public-Safe Check': entry.publicSafe || 'N/A',
    'Private-Data Check': entry.privateSafe || 'N/A',
    'Result': entry.result || 'PASS',
    'Created By': 'H38-OWNER-PORTAL-NEXT',
    'Notes': entry.notes || ''
  };
  if (!headers.length) return;
  sh.appendRow(headers.map(function(h){ return data[h] !== undefined ? data[h] : ''; }));
}

function h38PortalWriteError_(entry) {
  entry = entry || {};
  var ss = h38PortalSpreadsheet_();
  var sh = ss.getSheetByName('Error Log');
  if (!sh) return;
  var headers = sh.getLastColumn() ? sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0] : [];
  var data = {
    'Error ID': entry.errorId || h38PortalId_('ERR'),
    'Timestamp': h38PortalNow_(),
    'Job ID': entry.jobId || '',
    'Source Tab': entry.source || 'Owner Portal Next',
    'Error Type': entry.type || 'PORTAL_HOLD',
    'Error Description': entry.description || '',
    'Blocked Action': entry.blockedAction || '',
    'Resolution Status': entry.resolution || 'Open - Rick Review Required',
    'Owner Action Required': 'Yes',
    'Created By': 'H38-OWNER-PORTAL-NEXT',
    'Notes': entry.notes || ''
  };
  if (!headers.length) return;
  sh.appendRow(headers.map(function(h){ return data[h] !== undefined ? data[h] : ''; }));
}
