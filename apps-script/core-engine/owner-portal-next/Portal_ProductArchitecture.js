/**
 * H38 product architecture foundation.
 *
 * This file adds a read-only pack and legacy-alias view over the existing module
 * system. It does not enable, disable, migrate, delete, purchase, deploy, send,
 * post, export, file, or otherwise execute an external action.
 */
var H38_PRODUCT_ARCHITECTURE_VERSION_ = '2026.07.21-phase1';

function h38PortalProductArchitectureAllRoles_() {
  var roles = [];
  try {
    if (typeof boRoleNames_ === 'function') roles = roles.concat(boRoleNames_() || []);
  } catch (error) {}
  try {
    if (typeof H38_BO !== 'undefined' && H38_BO.ROLES) roles = roles.concat(Array.prototype.slice.call(H38_BO.ROLES));
  } catch (error) {}
  roles = roles.concat(['Owner','Administrator','Foreman','Employee','Bookkeeper','Payroll','Viewer','Staff','Estimator','Field Staff','Customer']);
  return roles.map(function(role){return String(role || '').trim();}).filter(Boolean).filter(function(role,index,list){return list.indexOf(role) === index;});
}

function h38PortalProductArchitectureSupplementalMeta_() {
  return {
    h38Ai:{label:'H38 AI',purpose:'Analyze, explain, draft, coach, and recommend without executing protected system changes.',dependencies:[],roles:['Owner','Administrator','Foreman','Employee','Bookkeeper','Payroll','Viewer','Staff','Estimator','Field Staff'],virtual:true},
    quoteBuilder:{label:'Quote Builder',purpose:'Photo-supported quotes, price-book items, templates, terms, revisions, and approval gates.',dependencies:['customers','quotes','documents'],roles:['Owner','Administrator','Foreman','Staff','Estimator'],virtual:true},
    customerPortal:{label:'Customer Portal',purpose:'Customer quote review, approvals, changes, files, messages, and project history.',dependencies:['customers','quotes','jobs','invoices','documents'],roles:['Owner','Administrator','Staff','Estimator','Customer'],virtual:true},
    equipment:{label:'Equipment',purpose:'Equipment records, assignment, inspections, maintenance, documents, and job cost.',dependencies:['jobs'],roles:['Owner','Administrator','Foreman','Employee','Field Staff','Staff'],virtual:false}
  };
}

function h38PortalProductArchitectureModuleEnabled_(moduleKey) {
  if (moduleKey === 'h38Ai') {
    try { return !!PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY'); } catch (error) { return false; }
  }
  if (moduleKey === 'customerPortal') {
    try {
      return (typeof boBusinessAppEnabled_ !== 'function' || boBusinessAppEnabled_('customer-portal')) &&
        (typeof boModuleEnabled_ !== 'function' || (boModuleEnabled_('customers') && boModuleEnabled_('quotes') && boModuleEnabled_('documents')));
    } catch (error) { return false; }
  }
  if (moduleKey === 'quoteBuilder') {
    try { return typeof boModuleEnabled_ !== 'function' || (boModuleEnabled_('quoteBuilder') && boModuleEnabled_('quotes')); } catch (error) { return false; }
  }
  try { return typeof boModuleEnabled_ !== 'function' || boModuleEnabled_(moduleKey); } catch (error) { return false; }
}

function h38PortalProductArchitectureRecordCount_(moduleKey) {
  try {
    if (moduleKey === 'h38Ai' && typeof boAiEvents_ === 'function') return (boAiEvents_() || []).length;
    if (moduleKey === 'customerPortal') moduleKey = 'customers';
    if (moduleKey === 'quoteBuilder') moduleKey = 'quotes';
    if (typeof h38PortalApplicationRecordCount_ === 'function') return h38PortalApplicationRecordCount_(moduleKey);
  } catch (error) {}
  return 0;
}

function h38PortalProductArchitecturePackMembership_(moduleKey) {
  var catalog = typeof boGetProductPackCatalog_ === 'function' ? boGetProductPackCatalog_() : [];
  return catalog.filter(function(pack){return (pack.modules || []).indexOf(moduleKey) >= 0;}).map(function(pack){return pack.key;});
}

function h38PortalProductArchitectureModuleSnapshot_(moduleKey, managerByKey, access) {
  var current = managerByKey[moduleKey] || null;
  var supplemental = h38PortalProductArchitectureSupplementalMeta_()[moduleKey] || null;
  var standard = null;
  try {
    var meta = typeof h38PortalApplicationModuleMeta_ === 'function' ? h38PortalApplicationModuleMeta_() : {};
    standard = meta[moduleKey] || null;
  } catch (error) {}
  var definition = standard || supplemental || {label:moduleKey,purpose:'Existing module preserved through the pack architecture.',dependencies:[],roles:['Owner']};
  var roles = current && current.roles ? current.roles.slice() : [];
  if (!roles.length && supplemental && supplemental.roles) roles = supplemental.roles.slice();
  if (!roles.length && typeof h38PortalApplicationRolesForModule_ === 'function') {
    try { roles = h38PortalApplicationRolesForModule_(moduleKey) || []; } catch (error) {}
  }
  if (!roles.length) roles = ['Owner'];
  roles = roles.filter(function(role,index,list){return list.indexOf(role) === index;});
  var enabled = current ? current.enabled !== false : h38PortalProductArchitectureModuleEnabled_(moduleKey);
  var currentRole = access && access.role ? access.role : 'Owner';
  return {
    key:moduleKey,
    label:current && current.label || definition.label || moduleKey,
    purpose:current && current.purpose || definition.purpose || '',
    available:true,
    enabled:enabled,
    installed:enabled,
    essential:current ? current.essential === true : moduleKey === 'h38Ai' ? false : false,
    dependencies:(current && current.dependencies || definition.dependencies || []).slice(),
    roles:roles,
    roleVisibility:roles.slice(),
    canView:current ? current.canView !== false : !!(access && (access.ownerMode || roles.indexOf(currentRole) >= 0)),
    recordCount:current && Number(current.recordCount) || h38PortalProductArchitectureRecordCount_(moduleKey),
    recordsPreserved:true,
    lastUsed:current && current.lastUsed || '',
    lastUsedBy:current && current.lastUsedBy || '',
    packMembership:h38PortalProductArchitecturePackMembership_(moduleKey),
    virtual:!!(supplemental && supplemental.virtual)
  };
}

function h38PortalProductArchitecturePackSnapshot_(definition, moduleByKey) {
  var modules = (definition.modules || []).map(function(moduleKey){return moduleByKey[moduleKey];}).filter(Boolean);
  var availableModules = modules.filter(function(module){return module.available;});
  var enabledModules = availableModules.filter(function(module){return module.enabled;});
  var included = definition.includedWithEveryInstallation === true;
  var state = included ? 'included' : !availableModules.length ? 'unavailable' : !enabledModules.length ? 'available' : enabledModules.length === availableModules.length ? 'installed' : 'partial';
  var roles = [];
  modules.forEach(function(module){roles = roles.concat(module.roles || []);});
  roles = roles.concat(definition.roleExperiences || []).filter(function(role,index,list){return list.indexOf(role) === index;});
  return {
    key:definition.key,
    name:definition.name,
    kind:definition.kind,
    category:definition.category || (definition.kind === 'addon' ? 'specialist-add-ons' : 'product-packs'),
    includedWithEveryInstallation:included,
    installed:included || enabledModules.length > 0,
    installedState:state,
    dependencies:(definition.dependencies || []).slice(),
    capabilities:(definition.capabilities || []).slice(),
    roleExperiences:(definition.roleExperiences || []).slice(),
    roleVisibility:roles,
    moduleCount:modules.length,
    availableModuleCount:availableModules.length,
    enabledModuleCount:enabledModules.length,
    includedModules:modules,
    recordsPreserved:true,
    ownerApprovalRequiredForChanges:true,
    automaticChangesAllowed:false
  };
}

function h38PortalProductArchitectureLegacyRoutes_() {
  return [
    'today','bo:assignedTasks','approvalsCenter','calendarCenter','bo:requests','bo:customers','bo:messaging','bo:smsConsent',
    'bo:quotes','bo:workOrders','bo:jobs','bo:time','bo:equipment','bo:vendors','bo:purchaseOrders','bo:vendorBills','bo:receipts',
    'bo:expenses','bo:invoices','bo:payments','bo:accounting','bo:payroll','bo:tax','bo:documents','bo:messageTemplates','bo:reports',
    'growth','websiteCenter','social','advertising','moduleManager','setupWizard','userAccess','backupCenter','bo:setup','bo:employees',
    'bo:contractors','proof','errors','systemHealth','settings','help'
  ];
}

function h38PortalProductArchitecture() {
  var access = h38PortalRequireUnifiedUser_();
  var manager = typeof h38PortalModuleManager === 'function' ? h38PortalModuleManager() : {modules:[]};
  var managerByKey = {};
  (manager.modules || []).forEach(function(module){managerByKey[module.key] = module;});
  var definitions = typeof boGetProductPackCatalog_ === 'function' ? boGetProductPackCatalog_() : [];
  var moduleKeys = [];
  definitions.forEach(function(pack){moduleKeys = moduleKeys.concat(pack.modules || []);});
  Object.keys(managerByKey).forEach(function(moduleKey){moduleKeys.push(moduleKey);});
  moduleKeys = moduleKeys.filter(function(moduleKey,index,list){return list.indexOf(moduleKey) === index;});
  var moduleByKey = {};
  moduleKeys.forEach(function(moduleKey){moduleByKey[moduleKey] = h38PortalProductArchitectureModuleSnapshot_(moduleKey,managerByKey,access);});
  var packs = definitions.map(function(definition){return h38PortalProductArchitecturePackSnapshot_(definition,moduleByKey);});
  var aliases = typeof boGetLegacyProductPackAliasMap_ === 'function' ? boGetLegacyProductPackAliasMap_() : {};
  var legacyProducts = typeof boGetBusinessAppCatalog_ === 'function' ? boGetBusinessAppCatalog_().map(function(product){
    var alias = aliases[product.key] || {primaryPack:'',packKeys:[],preserveLegacyRoute:true};
    return Object.assign({},product,{primaryPack:alias.primaryPack,packKeys:(alias.packKeys || []).slice(),legacyRoutePreserved:alias.preserveLegacyRoute !== false});
  }) : [];
  return {
    status:'PASS',
    phase:'product-architecture-foundation',
    version:H38_PRODUCT_ARCHITECTURE_VERSION_,
    ownerMode:access.ownerMode,
    canManage:access.ownerMode === true,
    user:{id:access.user['User ID'],email:access.user.Email,displayName:access.user['Display Name'],role:access.role},
    allRoles:h38PortalProductArchitectureAllRoles_(),
    packs:packs,
    moduleAvailability:moduleByKey,
    legacyAliases:aliases,
    legacyProducts:legacyProducts,
    legacyRoutes:h38PortalProductArchitectureLegacyRoutes_(),
    legacyRoutesPreserved:true,
    existingRecordsPreserved:true,
    migrationMode:'alias-only',
    ownerApprovalRequiredForChanges:true,
    automaticInstallOrEnable:false,
    sourceCodeChangesByAi:false,
    externalActionsOccurred:false
  };
}

function h38PortalResolveLegacyProduct(legacyProductKey) {
  h38PortalRequireUnifiedUser_();
  var key = typeof boNormalizeText_ === 'function' ? boNormalizeText_(legacyProductKey) : String(legacyProductKey || '').trim();
  var alias = typeof boResolveLegacyProductPack_ === 'function' ? boResolveLegacyProductPack_(key) : null;
  var product = null;
  if (typeof boGetBusinessAppCatalog_ === 'function') product = boGetBusinessAppCatalog_().filter(function(item){return item.key === key;})[0] || null;
  var packCatalog = typeof boGetProductPackCatalog_ === 'function' ? boGetProductPackCatalog_() : [];
  var packs = alias ? packCatalog.filter(function(pack){return (alias.packKeys || []).indexOf(pack.key) >= 0;}) : [];
  return {status:alias ? 'PASS' : 'HOLD',legacyProductKey:key,legacyProduct:product,alias:alias,packs:packs,legacyRoutePreserved:!!(alias && alias.preserveLegacyRoute),existingRecordsPreserved:true,externalActionsOccurred:false};
}
