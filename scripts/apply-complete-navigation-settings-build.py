from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one exact match, found {count}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, lambda match: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected one regex match, found {count}')
    return updated


# Canonical module contract: keep Quotes as the visible customer-record workspace,
# keep Quote Builder hidden as the creation/editing capability, and make the
# Settings label match its page.
contract_path = 'apps-script/business-office/BusinessOffice_ModuleContract.gs'
contract = read(contract_path)
contract = replace_once(
    contract,
    "boUnifiedModule_('settings','Settings','office','native','settings','settings','⚙','preferences configuration'",
    "boUnifiedModule_('settings','Settings & Safety','office','native','settings','settings','⚙','preferences safety configuration'",
    'settings navigation label'
)
contract = replace_once(
    contract,
    "boUnifiedModule_('quoteBuilder','Quote Builder','work','capability',''",
    "boUnifiedModule_('quoteBuilder','Quote Builder','sales','capability',''",
    'Quote Builder capability group'
)
write(contract_path, contract)


# Business Office record workspace: Quotes is the browse/review surface. The
# dedicated Quote Builder is only used for explicit create/edit actions.
client_path = 'apps-script/core-engine/owner-portal-next/Portal_Business_Client.html'
client = read(client_path)
client = replace_once(
    client,
    "function boNativeCanCreate(module){return ['reports','approvals'].indexOf(module)<0;}\nfunction boNativeCanEdit(module){return ['reports','approvals'].indexOf(module)<0;}",
    "function boNativeQuoteBuilderEnabled(){return typeof h38QuoteBuilderAddonEnabled==='function'&&h38QuoteBuilderAddonEnabled();}\nfunction boNativeCanCreate(module){if(module==='quotes'&&boNativeQuoteBuilderEnabled())return false;return ['reports','approvals'].indexOf(module)<0;}\nfunction boNativeCanEdit(module){if(module==='quotes'&&boNativeQuoteBuilderEnabled())return false;return ['reports','approvals'].indexOf(module)<0;}",
    'quote create/edit ownership'
)
client = replace_once(
    client,
    "quotes:'Review scope, price, assumptions, exclusions, turnaround, revisions, and approval state.',",
    "quotes:'Browse, search, and review quote records, status, customer, totals, and approval state. Use Quote Builder only when creating or editing the proposal.',",
    'quote workspace help'
)
module_actions = r"""function boNativeModuleActions(module){
  var actions=[];
  if(module==='documents')actions.push('<button class="btn primary" type="button" onclick="openBusinessUpload()">Upload PDF / Take Picture</button>');
  if(module==='quotes'&&boNativeQuoteBuilderEnabled()){
    actions.push('<button class="btn primary" type="button" onclick="h38OpenNewQuote(\'\')">New Quote</button>');
    actions.push('<button class="btn" type="button" onclick="h38OpenQuoteBuilder({view:\'dashboard\',returnModule:\'quotes\'})">Open Quote Builder</button>');
  }else if(boNativeCanCreate(module)){
    actions.push('<button class="btn primary" type="button" onclick="openBusinessRecordForm('+boNativeJs(module)+',\'\')">New record</button>');
  }
  if((module==='accounting'||module==='reports')&&typeof accountingCsv==='function')actions.push('<button class="btn" type="button" onclick="accountingCsv()">Export Accounting CSV</button>');
  return actions.join('');
}
function boNativeRecordActions(module,recordId){
  if(module==='quotes'&&boNativeQuoteBuilderEnabled())return '<button class="btn primary" type="button" onclick="h38EditQuoteInBuilder('+boNativeJs(recordId)+')">Edit in Quote Builder</button>';
  return boNativeCanEdit(module)?'<button class="btn primary" type="button" onclick="openBusinessRecordForm('+boNativeJs(module)+','+boNativeJs(recordId)+')">Edit record</button>':'';
}
function boNativeRenderModule(data){
  var def=data.definition,module=data.module,view=document.getElementById('view');
  view.innerHTML='<div class="bo-native-head"><div><div class="ux-eyebrow">Business Office · '+esc((H38_UNIFIED&&H38_UNIFIED.packageName)||'Installed package')+'</div><h1>'+esc(def.title)+'</h1><p class="muted">'+esc(boNativeHelp(module))+'</p></div><div class="bo-native-actions">'+boNativeModuleActions(module)+'</div></div><div class="bo-native-toolbar"><input id="boNativeSearch" aria-label="Search '+esc(def.title)+'" placeholder="Search '+esc(def.title.toLowerCase())+'" value="'+attr(BO_NATIVE.query)+'" onkeydown="if(event.key===\'Enter\')businessSearchCurrent()"><button class="btn" type="button" onclick="businessSearchCurrent()">Search</button><button class="btn" type="button" onclick="businessClearSearch()">Clear</button><button class="btn" type="button" onclick="boNativeRefreshModule('+boNativeJs(module)+')">Refresh</button></div><div class="bo-native-status"><span class="pill blue">'+esc(data.count||0)+' records</span><span class="pill amber">Owner approval required</span><span class="pill gray">External actions locked</span></div><div class="bo-native-boundary">'+esc(data.boundary||'Customer sends, payments, posting, payroll export, tax finalization, and delivery remain approval gated.')+'</div>'+boNativeRenderTable(data);
}
"""
client = regex_once(
    client,
    r"function boNativeRenderModule\(data\)\{.*?\n\}\n(?=async function renderBusinessModule)",
    module_actions,
    'Business Office module actions'
)
record_workspace = r"""async function openBusinessRecord(module,recordId){
  var drawer=document.getElementById('drawer'),body=document.getElementById('drawerBody');
  drawer.classList.add('open');body.innerHTML='<div class="card">Loading record workspace…</div>';
  try{
    var workspace=await call('h38PortalBusinessWorkspace',[module,recordId]);
    BO_NATIVE.workspace=workspace;
    var definition=BO_NATIVE.data&&BO_NATIVE.data.module===module?BO_NATIVE.data.definition:null;
    if(!definition){var moduleData=await call('h38PortalBusinessModule',[module,{limit:1}]);definition=moduleData.definition;}
    body.innerHTML='<div class="ux-drawer-content"><div class="ux-drawer-head"><div><div class="ux-eyebrow">'+esc(definition.title)+'</div><h1>'+esc(boNativeTitle(workspace.primary,definition))+'</h1><p class="muted">'+esc(recordId)+'</p></div><div class="toolbar"><button class="btn" type="button" onclick="closeDrawer()">Close</button>'+boNativeRecordActions(module,recordId)+'</div></div><div class="bo-native-boundary">'+esc(workspace.boundary||'External actions remain approval gated.')+'</div>'+boNativeSummary(workspace.summary)+'<div class="tabs"><button class="tab active" type="button" onclick="boNativeWorkspaceTab(\'details\')">Details</button><button class="tab" type="button" onclick="boNativeWorkspaceTab(\'related\')">Related</button><button class="tab" type="button" onclick="boNativeWorkspaceTab(\'timeline\')">Timeline</button></div><div id="boNativeWorkspacePanel">'+boNativeFieldsGrid(workspace.primary)+'</div></div>';
  }catch(error){body.innerHTML='<div class="owner-safe-error"><b>Record workspace on hold.</b><p>'+esc(error.message||error)+'</p><p>No record or external system was changed.</p></div>';}
}
"""
client = regex_once(
    client,
    r"async function openBusinessRecord\(module,recordId\)\{.*?\n\}\n(?=function boNativeWorkspaceTab)",
    record_workspace,
    'quote record viewer actions'
)
write(client_path, client)


# Settings is configuration and safety. System Health owns installation,
# integrations, blockers, and diagnostics. Accounting export belongs to Money.
workspace_path = 'apps-script/core-engine/owner-portal-next/Portal_Experience_Client_Workspace.html'
workspace = read(workspace_path)
settings = r"""function renderSettings(){
  let application={package:H38_UNIFIED&&H38_UNIFIED.packageName||'Installed Business Package',architecture:H38_UNIFIED&&H38_UNIFIED.architectureVersion||'Unified application',role:H38_UNIFIED&&H38_UNIFIED.user&&H38_UNIFIED.user.role||'User',externalActions:'LOCKED'};
  let safety=BOOT&&BOOT.safety||{};
  let protection={records:'Preserved',proofLog:'Preserved',errorLog:'Preserved',backups:'Required',destructiveActions:'Owner confirmation required'};
  document.getElementById('view').innerHTML=`<div class="ux-page-head"><div><div class="ux-eyebrow">Office configuration</div><h1>Settings & Safety</h1><div class="muted">Application preferences, role context, safety locks, and data-protection boundaries. Live diagnostics and integrations are in System Health.</div></div><button class="btn" onclick="show('systemHealth')">Open System Health</button></div><h2>Application</h2>${structuredCards(application)}<h2>Safety controls</h2>${structuredCards(safety)}<h2>Data protection</h2>${structuredCards(protection)}<h2>Configuration</h2><div class="toolbar"><button class="btn" onclick="show('moduleManager')">Apps & Modules</button><button class="btn" onclick="show('setupWizard')">Business Setup</button><button class="btn" onclick="show('userAccess')">Users & Roles</button><button class="btn" onclick="show('backupCenter')">Backups</button></div>`;
}
"""
workspace = regex_once(workspace, r"function renderSettings\(\)\{.*?\n(?=function diagnosticHtml)", settings, 'Settings and Safety renderer')
write(workspace_path, workspace)

views_path = 'apps-script/core-engine/owner-portal-next/Portal_Experience_Client_Views.html'
views = read(views_path)
system_health = r"""function renderSystemHealth(data){
  let install=data.installed||{},catalog=data.catalog||{},safety=data.safety||{};
  document.getElementById('view').innerHTML=`<div class="ux-page-head"><div><div class="ux-eyebrow">Live diagnostics</div><h1>System Health</h1><div class="muted">Installation state, integration health, blockers, diagnostics, and hard-rule verification.</div></div><button class="btn" id="selfTestButton" onclick="selfTest()">Run non-destructive self-test</button></div>${metricCards([{label:'Installation',value:install.installed?'INSTALLED':'HOLD',detail:install.reason||''},{label:'Catalog',value:catalog.status||'HOLD',detail:'15 products and 9 bundles remain controlled'},{label:'Integration blockers',value:array(data.blockers).length,detail:'Exact provider/approval blockers'},{label:'External actions',value:safety.liveExternalActions?'ON':'LOCKED',detail:'Selected-record approval remains mandatory'}])}<h2>Installation details</h2>${structuredCards(install)}<h2>Integration health</h2><div class="card">${healthRows(data.integrations)}</div><h2>Hard-rule safety</h2>${recordFields(safety)}<div class="toolbar"><button class="btn" onclick="show('errors')">Error Log</button><button class="btn" onclick="show('proof')">Proof Log</button><button class="btn" onclick="show('settings')">Settings & Safety</button></div><div id="selfTestResult" class="card muted">Self-test has not been run.</div>`;
}
"""
views = regex_once(views, r"function renderSystemHealth\(data\)\{.*?\n(?=function renderHelp)", system_health, 'System Health renderer')
write(views_path, views)


# Keep the complete audit in both Business Office and commercial verification.
package_path = 'package.json'
package_text = read(package_path)
package_text = replace_once(
    package_text,
    'node scripts/verify-quote-builder-business-office-routing.js && node scripts/verify-complete-ecosystem.js',
    'node scripts/verify-quote-builder-business-office-routing.js && node scripts/audit-complete-navigation-and-settings.js && node scripts/verify-complete-ecosystem.js',
    'commercial audit chain'
)
package_text = replace_once(
    package_text,
    '"test:business-office": "node scripts/verify-navigation-cache-performance.js && node scripts/verify-one-shot-ux.js',
    '"test:business-office": "node scripts/audit-complete-navigation-and-settings.js && node scripts/verify-navigation-cache-performance.js && node scripts/verify-one-shot-ux.js',
    'Business Office audit chain'
)
write(package_path, package_text)
