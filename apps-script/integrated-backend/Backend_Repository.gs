function h38BackendProps_() { return PropertiesService.getScriptProperties(); }
function h38BackendNow_() { return Utilities.formatDate(new Date(), H38_BACKEND.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"); }
function h38BackendId_(prefix) { return prefix + '-' + Utilities.formatDate(new Date(), H38_BACKEND.TIMEZONE, 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0,8).toUpperCase(); }

function h38BackendSpreadsheet_() {
  var id = h38BackendProps_().getProperty(H38_BACKEND.SPREADSHEET_PROPERTY);
  if (!id) throw new Error('CONFIGURATION HOLD — set ' + H38_BACKEND.SPREADSHEET_PROPERTY + '.');
  return SpreadsheetApp.openById(id);
}

function h38BackendOwner_() {
  var email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  var owners = String(h38BackendProps_().getProperty(H38_BACKEND.OWNER_EMAILS_PROPERTY) || '').split(',').map(function(v){return v.trim().toLowerCase();}).filter(String);
  if (!email || owners.indexOf(email) < 0) throw new Error('ACCESS HOLD — Owner authorization required.');
  return email;
}

function h38BackendInstall(options) {
  h38BackendOwner_();
  if (!options || options.confirmation !== 'INSTALL INTEGRATED BACKEND') throw new Error('INSTALL HOLD — exact confirmation required.');
  var ss = h38BackendSpreadsheet_(), created = [], verified = [];
  Object.keys(H38_BACKEND_TABLES).forEach(function(key) {
    var spec = H38_BACKEND_TABLES[key], sh = ss.getSheetByName(spec.sheet);
    if (!sh) {
      sh = ss.insertSheet(spec.sheet);
      sh.getRange(1,1,1,spec.headers.length).setValues([spec.headers]);
      sh.setFrozenRows(1);
      created.push(spec.sheet);
    } else {
      var actual = sh.getLastColumn() ? sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0] : [];
      var missing = spec.headers.filter(function(h){ return actual.indexOf(h) < 0; });
      if (missing.length) throw new Error('SCHEMA HOLD — ' + spec.sheet + ' missing: ' + missing.join(', '));
      verified.push(spec.sheet);
    }
  });
  h38BackendProof_('Installer','SYSTEM','Install backend','INSTALL INTEGRATED BACKEND','PASS','Created=' + created.join(', ') + '; verified=' + verified.join(', '),'No external actions enabled.');
  return {status:'PASS',release:H38_BACKEND.RELEASE,created:created,verified:verified,externalActions:false};
}

function h38BackendTable_(entity) {
  var spec = H38_BACKEND_TABLES[entity];
  if (!spec) throw new Error('Unknown entity: ' + entity);
  var sh = h38BackendSpreadsheet_().getSheetByName(spec.sheet);
  if (!sh) throw new Error('NOT INSTALLED — missing ' + spec.sheet);
  return {spec:spec,sheet:sh};
}

function h38BackendFind_(entity, field, value) {
  var t = h38BackendTable_(entity), values = t.sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return null;
  var headers = values[0], index = headers.indexOf(field);
  if (index < 0) throw new Error('SCHEMA HOLD — missing ' + field);
  for (var i=1;i<values.length;i++) if (String(values[i][index]) === String(value)) {
    var out = {_row:i+1}; headers.forEach(function(h,j){out[h]=values[i][j];}); return out;
  }
  return null;
}

function h38BackendSave_(entity, record) {
  var t = h38BackendTable_(entity), now = h38BackendNow_(), id = String(record[t.spec.id] || '');
  if (!id) throw new Error('Missing ' + t.spec.id);
  var current = h38BackendFind_(entity,t.spec.id,id);
  if (t.spec.headers.indexOf('Created Time') >= 0 && !record['Created Time']) record['Created Time'] = current ? current['Created Time'] : now;
  if (t.spec.headers.indexOf('Updated Time') >= 0) record['Updated Time'] = now;
  var row = t.spec.headers.map(function(h){ return record[h] !== undefined ? record[h] : (current ? current[h] : ''); });
  if (current) t.sheet.getRange(current._row,1,1,row.length).setValues([row]); else t.sheet.appendRow(row);
  return h38BackendFind_(entity,t.spec.id,id);
}

function h38BackendProof_(source, relatedId, action, decision, result, evidence, notes) {
  var actor = ''; try { actor = Session.getActiveUser().getEmail() || 'public-intake'; } catch (e) { actor = 'public-intake'; }
  return h38BackendSave_('proof',{'Proof ID':h38BackendId_('PROOF'),'Time':h38BackendNow_(),'Actor':actor,'Source':source,'Related ID':relatedId,'Action':action,'Decision':decision,'Result':result,'Evidence':evidence || '','Notes':notes || ''});
}

function h38BackendError_(source, relatedId, error, fingerprint) {
  try { h38BackendSave_('errors',{'Error ID':h38BackendId_('ERROR'),'Time':h38BackendNow_(),'Source':source,'Related ID':relatedId || '','Message':String(error.message || error),'Stack':String(error.stack || '').slice(0,H38_BACKEND.MAX_TEXT),'Payload Fingerprint':fingerprint || ''}); } catch (ignored) {}
}

