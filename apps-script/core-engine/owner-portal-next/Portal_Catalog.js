/** Approved catalog import, validation, and mismatch hold. */
function h38PortalCatalogStatus_() {
  var installed = h38PortalInstalledStatus_();
  if (!installed.installed) return {status:'HOLD', reason:'Portal candidate is not installed.', products:0, bundles:0, missingProducts:H38_PORTAL_NEXT.REQUIRED_PRODUCTS, missingBundles:H38_PORTAL_NEXT.REQUIRED_BUNDLES};
  var rows = h38PortalList('catalog',{});
  var products = rows.filter(function(r){ return r['Record Type'] === 'Product'; });
  var bundles = rows.filter(function(r){ return r['Record Type'] === 'Bundle'; });
  var ids = rows.map(function(r){ return r['Catalog ID']; });
  var missingProducts = H38_PORTAL_NEXT.REQUIRED_PRODUCTS.filter(function(id){ return ids.indexOf(id) < 0; });
  var missingBundles = H38_PORTAL_NEXT.REQUIRED_BUNDLES.filter(function(id){ return ids.indexOf(id) < 0; });
  var incomplete = rows.filter(function(r){ return !r.Name || !r.Price || !r['Payment Classification'] || !r['Revision Allowance'] || !r['SOP Reference']; }).map(function(r){ return r['Catalog ID']; });
  var ok = missingProducts.length === 0 && missingBundles.length === 0 && incomplete.length === 0 && products.length === 15 && bundles.length === 9;
  return {status:ok ? 'PASS' : 'HOLD', reason:ok ? 'Approved 15-product / 9-bundle snapshot loaded.' : 'Catalog Mismatch Hold', products:products.length, bundles:bundles.length, missingProducts:missingProducts, missingBundles:missingBundles, incomplete:incomplete};
}

function h38PortalImportCatalogPayload(payload, confirmation) {
  h38PortalAssertOwner_();
  if (confirmation !== 'IMPORT APPROVED CATALOG SNAPSHOT') throw new Error('CATALOG HOLD — exact confirmation required.');
  if (typeof payload === 'string') payload = JSON.parse(payload);
  if (!payload || !Array.isArray(payload.products) || !Array.isArray(payload.bundles)) throw new Error('CATALOG HOLD — payload must contain products and bundles arrays.');
  var all = payload.products.map(function(p){ return h38PortalCatalogRow_(p,'Product'); }).concat(payload.bundles.map(function(b){ return h38PortalCatalogRow_(b,'Bundle'); }));
  var ids = all.map(function(r){ return r['Catalog ID']; });
  var missingProducts = H38_PORTAL_NEXT.REQUIRED_PRODUCTS.filter(function(id){ return ids.indexOf(id) < 0; });
  var missingBundles = H38_PORTAL_NEXT.REQUIRED_BUNDLES.filter(function(id){ return ids.indexOf(id) < 0; });
  var extra = ids.filter(function(id){ return H38_PORTAL_NEXT.REQUIRED_PRODUCTS.indexOf(id) < 0 && H38_PORTAL_NEXT.REQUIRED_BUNDLES.indexOf(id) < 0; });
  if (all.length !== 24 || missingProducts.length || missingBundles.length || extra.length) throw new Error('CATALOG MISMATCH HOLD — expected exact H38-P001..P015 and H38-B001..B009. Missing products=' + missingProducts.join(',') + ' Missing bundles=' + missingBundles.join(',') + ' Extra=' + extra.join(','));
  all.forEach(function(r){
    if (!r.Name || !Number(r.Price) || !r['Payment Classification'] || !r['Revision Allowance'] || !r['SOP Reference']) throw new Error('CATALOG HOLD — incomplete controlled fields for ' + r['Catalog ID']);
  });
  var sh = h38PortalTable_('catalog').sheet;
  if (sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();
  var headers = H38_PORTAL_TABLES.catalog.headers;
  var now = h38PortalNow_();
  var values = all.map(function(r){ r['Created Time']=now; r['Updated Time']=now; return headers.map(function(h){ return r[h] || ''; }); });
  sh.getRange(2,1,values.length,headers.length).setValues(values);
  h38PortalInvalidateReadCache_('catalog');
  h38PortalSetSetting_('catalog_status','SYNCHRONIZED','Active','Exact 15-product / 9-bundle snapshot imported.');
  h38PortalWriteProof_({jobId:'CATALOG',source:'Portal Catalog',action:'Import approved catalog snapshot',decision:confirmation,result:'PASS',evidence:'Products=15 Bundles=9; Source hash=' + (payload.sourceHash || ''),notes:'Catalog values imported without altering public catalog or live website.'});
  return h38PortalCatalogStatus_();
}

function h38PortalCatalogRow_(item,type) {
  var id = String(item.id || item.catalogId || '').trim();
  var paymentText = String(item.payment || item.paymentWording || '').trim();
  var classification = String(item.paymentClassification || '').trim();
  if (!classification) classification = /50%|deposit/i.test(paymentText) ? 'Deposit required' : /full payment/i.test(paymentText) ? 'Full payment before fulfillment' : 'Controlled payment rule';
  var componentIds = item.products || item.components || [];
  return {
    'Catalog ID':id,
    'Record Type':type,
    'Name':item.name || '',
    'Family':item.familyLabel || item.family || '',
    'Price':item.price,
    'Payment Classification':classification,
    'Payment Wording':paymentText,
    'Turnaround':item.turnaround || '',
    'Revision Allowance':item.revisions || item.revisionAllowance || '',
    'Scope Limits':Array.isArray(item.scope) ? item.scope.join(' | ') : (item.scope || (componentIds.length ? 'Components: ' + componentIds.join(', ') : '')),
    'SOP Reference':item.sopReference || (type === 'Product' ? 'H38-PROD-SOP-' + id.slice(-3) : 'H38-BUNDLE-SOP-' + id.slice(-3)),
    'Customer Template IDs':Array.isArray(item.customerTemplateIds) ? item.customerTemplateIds.join(', ') : (item.customerTemplateIds || ''),
    'Website Link':item.url || item.requestUrl || '',
    'Sample Link':item.sampleUrl || '',
    'Source Hash':item.sourceHash || '',
    'Sync Status':'Synchronized',
    'Notes':type === 'Bundle' ? 'Components: ' + componentIds.join(', ') : (item.summary || '')
  };
}

function h38PortalSetSetting_(key,value,status,notes) {
  var existing = h38PortalGet('settings',key);
  return h38PortalSave('settings',{
    'Setting Key':key,
    'Setting Value':value,
    'Value Type':'string',
    'Category':existing ? existing.Category : 'system',
    'Secret':'No',
    'Status':status || 'Active',
    'Notes':notes || ''
  });
}

function h38PortalCatalogRecord_(id) {
  var status = h38PortalCatalogStatus_();
  if (status.status !== 'PASS') throw new Error('CATALOG MISMATCH HOLD — approved synchronized catalog is required.');
  var rec = h38PortalGet('catalog',id);
  if (!rec) throw new Error('CATALOG MISMATCH HOLD — record not found: ' + id);
  return rec;
}
