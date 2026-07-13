/** Hard-rule Owner Portal operating surfaces. No external action is enabled here. */
var H38_PORTAL_SAVED_VIEWS_KEY = 'H38_PORTAL_SAVED_VIEWS_V1';
var H38_PORTAL_SAVED_VIEW_LIMIT = 20;


function h38PortalInclude_(fileName) {
  var allowed = [
    'Portal_Experience_Styles',
    'Portal_Experience_Client_Core',
    'Portal_Experience_Client_Views',
    'Portal_Experience_Client_Workspace'
  ];
  if (allowed.indexOf(String(fileName || '')) < 0) throw new Error('Portal include is not allowed.');
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
}

function h38PortalExperienceControlCenter() {
  h38PortalAssertOwner_();
  var installed = h38PortalInstalledStatus_();
  var tasks = h38PortalTaskProjection_({});
  var reports = installed.installed ? h38PortalReportSummary_() : {};
  var today = h38PortalToday_();
  var integrations = h38PortalIntegrationStatus_();
  var openTasks = tasks.filter(function(task){ return !h38PortalTaskTerminal_(task.status); });
  var dueToday = openTasks.filter(function(task){ return task.dueDate && task.dueDate <= today; });
  var decisions = openTasks.filter(function(task){
    return /review|required|approval|hold|revise|reject|decision/i.test([
      task.status, task.approvalStatus, task.approvalRequirement, task.decision
    ].join(' '));
  });
  var activeWork = openTasks.filter(function(task){
    return /open|progress|ready|production|qa|review|waiting|scope|quote/i.test([
      task.status, task.type, task.nextAction
    ].join(' '));
  });
  var invoices = installed.installed ? h38PortalList('invoices',{}) : [];
  var leads = installed.installed ? h38PortalList('leads',{}) : [];
  var social = installed.installed ? h38PortalList('social',{}) : [];
  var advertising = installed.installed ? h38PortalList('advertising',{}) : [];
  var website = installed.installed ? h38PortalList('website',{}) : [];
  var calendar = installed.installed ? h38PortalList('calendar',{}) : [];
  var blockers = integrations.filter(function(item){ return !/AVAILABLE|READY/i.test(item.status); });

  return {
    generatedAt:h38PortalNow_(),
    today:today,
    views:{
      today:{tasks:dueToday.slice(0,75),openCount:openTasks.length,overdueCount:dueToday.filter(function(task){return task.dueDate < today;}).length},
      decisions:{tasks:decisions.slice(0,100),count:decisions.length},
      activeWork:{tasks:activeWork.slice(0,100),count:activeWork.length},
      money:{
        summary:reports,
        invoices:invoices.filter(function(row){return !/Paid|Cancelled|Written off/i.test(row.Status || '');}).slice(0,75)
      },
      growth:{
        summary:{leads:leads.length,socialDrafts:social.filter(function(row){return !/Published|Archived|Cancelled/i.test(row.Status || '');}).length,advertisingPlans:advertising.filter(function(row){return !/Complete|Rejected|Archived/i.test(row.Status || '');}).length},
        leads:leads.slice(0,50),social:social.slice(0,30),advertising:advertising.slice(0,30)
      },
      website:{records:website.filter(function(row){return !/Complete|Rejected|Rolled back/i.test(row.Status || '');}).slice(0,75)},
      systemHealth:{
        installed:installed,
        catalog:installed.installed ? h38PortalCatalogStatus_() : {status:'HOLD'},
        integrations:integrations,
        blockers:blockers,
        safety:{ownerOnly:true,selectedRecordOnly:true,bulkExecution:false,automaticRetry:false,liveExternalActions:false,triggers:false}
      },
      calendar:{records:calendar.slice(0,150)}
    },
    quickCreate:['task','lead','customer','job','quote','invoice','payment','expense','communication','social','advertising','website','calendar'],
    externalActionsOccurred:false
  };
}

function h38PortalCustomerWorkspace(customerId) {
  h38PortalAssertOwner_();
  customerId = h38PortalExperienceId_(customerId,'Customer ID');
  var customer = h38PortalGet('customers',customerId);
  if (!customer) throw new Error('Customer not found: ' + customerId);
  var relatedTasks = h38PortalTaskProjection_({customerId:customerId});
  var task = relatedTasks[0] || {
    taskId:'CUSTOMER-360-' + customerId,
    title:'Customer 360: ' + (customer.Name || customer.Business || customerId),
    type:'Customer 360',customerId:customerId,customer:customer.Name || customer.Business || '',jobId:'',catalogId:'',
    priority:'Normal',status:customer['Customer Status'] || 'Active',approvalStatus:'',assignedAction:'',sourceSystem:'Portal Customers',
    sourceSheet:'Portal Customers',sourceRow:customer._rowNumber,nextAction:'Review customer, linked work, money, communication, and next action.',notes:customer.Notes || '',_entity:'workspace'
  };
  var workspace = h38PortalBuildWorkspace_(task,'',customerId,'');
  workspace.customer = customer;
  workspace.focus = {entity:'customers',id:customerId,record:customer};
  workspace.relatedTasks = relatedTasks;
  workspace.summary = h38PortalWorkspaceSummary_(workspace);
  return workspace;
}

function h38PortalSavedViews() {
  h38PortalAssertOwner_();
  return h38PortalSavedViewsRead_();
}

function h38PortalSaveView(view) {
  h38PortalAssertOwner_();
  var clean = h38PortalNormalizeSavedView_(view || {});
  var views = h38PortalSavedViewsRead_().filter(function(item){ return item.id !== clean.id; });
  views.unshift(clean);
  views = views.slice(0,H38_PORTAL_SAVED_VIEW_LIMIT);
  PropertiesService.getUserProperties().setProperty(H38_PORTAL_SAVED_VIEWS_KEY,JSON.stringify(views));
  h38PortalWriteProof_({jobId:'OWNER-PORTAL',source:'Owner Portal Saved Views',action:'Save owner view',decision:'INTERNAL OWNER ACTION',result:'PASS - NO EXTERNAL ACTION',evidence:clean.id,notes:'Saved filters only. No customer send, payment, publication, deployment, or external action.'});
  return {status:'PASS',view:clean,views:views,externalActionOccurred:false};
}

function h38PortalDeleteSavedView(viewId) {
  h38PortalAssertOwner_();
  viewId = h38PortalExperienceId_(viewId,'Saved view ID');
  var views = h38PortalSavedViewsRead_().filter(function(item){ return item.id !== viewId; });
  PropertiesService.getUserProperties().setProperty(H38_PORTAL_SAVED_VIEWS_KEY,JSON.stringify(views));
  return {status:'PASS',views:views,externalActionOccurred:false};
}

function h38PortalHelpCenter() {
  h38PortalAssertOwner_();
  return {
    title:'Owner Portal Help & SOP Access',
    rules:[
      'Work from the selected record only. Never run an ambiguous bulk action.',
      'Customer-facing sends, payment requests, publishing, ad spend, delivery, merges, and deployments stay locked unless separately released.',
      'Use Needs Rick’s Decision for approvals and HOLD items.',
      'Use Proof Log for completed evidence and Error Log for failures or uncertain results.',
      'Do not retry an uncertain provider result automatically.',
      'Keep test, demo, and production records unmistakably separated.'
    ],
    sections:[
      {name:'Today',purpose:'Due, overdue, and current operating work.',sop:'Review priority, due date, blocking issue, and next recommended action.'},
      {name:'Needs Rick’s Decision',purpose:'Owner approvals, revisions, holds, and rejections.',sop:'Open one task, review its full workspace, then record one decision.'},
      {name:'Customer 360',purpose:'Customer, jobs, quotes, invoices, payments, communication, proof, and errors.',sop:'Open the customer record and use linked sections before creating a new record.'},
      {name:'Job 360',purpose:'Scope, inputs, payment, production, QA, revision, approval, delivery, and follow-up.',sop:'Use the Job workspace as the operating record for the selected job.'},
      {name:'System Health',purpose:'Catalog, installation, adapters, external-action locks, and blocker visibility.',sop:'Run the non-destructive self-test after deployment or configuration changes.'}
    ],
    sourceReferences:['Operations Manual','docs/operating-system/developer/FILE_MAP.md','apps-script/core-engine/owner-portal-next/RUNTIME_TEST_RUNBOOK.md','apps-script/core-engine/owner-portal-next/PRODUCTION_INSTALL.md'],
    externalActionsOccurred:false
  };
}

function h38PortalExperienceId_(value,label) {
  var text = String(value || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/.test(text) || text.indexOf('..') >= 0) throw new Error(label + ' is invalid.');
  return text;
}

function h38PortalExperienceText_(value,maxLength) {
  var text = String(value == null ? '' : value).trim();
  if (text.length > maxLength) text = text.slice(0,maxLength);
  return text.replace(/[\u0000-\u001f\u007f]/g,' ');
}

function h38PortalSavedViewsRead_() {
  var raw = PropertiesService.getUserProperties().getProperty(H38_PORTAL_SAVED_VIEWS_KEY) || '[]';
  try {
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0,H38_PORTAL_SAVED_VIEW_LIMIT).map(function(item){
      try { return h38PortalNormalizeSavedView_(item); } catch (error) { return null; }
    }).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function h38PortalNormalizeSavedView_(view) {
  var allowedModules = H38_PORTAL_NEXT.MODULES.concat(['today','decisions','active','money','growth','websiteCenter','systemHealth','help']);
  var moduleName = h38PortalExperienceText_(view.module || 'tasks',40);
  if (allowedModules.indexOf(moduleName) < 0) throw new Error('Saved view module is not allowed.');
  var filters = view.filters && typeof view.filters === 'object' && !Array.isArray(view.filters) ? view.filters : {};
  var cleanFilters = {};
  ['query','status','priority','sort','viewMode'].forEach(function(key){
    if (filters[key] != null) cleanFilters[key] = h38PortalExperienceText_(filters[key],120);
  });
  var id = view.id ? h38PortalExperienceId_(view.id,'Saved view ID') : 'VIEW-' + Utilities.getUuid();
  return {
    id:id,
    name:h38PortalExperienceText_(view.name || 'Saved view',80),
    module:moduleName,
    filters:cleanFilters,
    createdAt:h38PortalExperienceText_(view.createdAt || h38PortalNow_(),40),
    updatedAt:h38PortalNow_()
  };
}
