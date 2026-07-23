#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const childProcess=require('child_process');
const ROOT=path.resolve(__dirname,'..');
const PORTAL=path.join(ROOT,'apps-script','core-engine','owner-portal-next');
const BUSINESS=path.join(ROOT,'apps-script','business-office');
const EVIDENCE=path.join(ROOT,'launch-control','evidence','unified-app-architecture-verification.json');
const pass=[];
const failures=[];

function check(name,condition,detail=''){
  (condition?pass:failures).push({name,detail});
}
function read(file){return fs.readFileSync(file,'utf8');}
function exists(file){return fs.existsSync(file);}

const files={
  registry:path.join(PORTAL,'Portal_Module_Registry.js'),
  unified:path.join(PORTAL,'Portal_Unified.js'),
  index:path.join(PORTAL,'Portal_Index.html'),
  raw:path.join(PORTAL,'Portal_RawIncludes.js'),
  shell:path.join(PORTAL,'Portal_UX_Client_Shell.html'),
  experienceCore:path.join(PORTAL,'Portal_Experience_Client_Core.html'),
  workspace:path.join(PORTAL,'Portal_Experience_Client_Workspace.html'),
  boot:path.join(PORTAL,'Portal_UX_Client_Boot.html'),
  styles:path.join(PORTAL,'Portal_Product_Styles.html'),
  client:path.join(PORTAL,'Portal_Product_Client.html'),
  publicPortal:path.join(ROOT,'portal.html'),
  manifest:path.join(BUSINESS,'BusinessOffice_ClientManifest.gs'),
  obsoletePolish:path.join(BUSINESS,'BusinessOffice_AI_Native_UX_Client.html'),
  obsoleteControl:path.join(BUSINESS,'BusinessOffice_ControlPlane_Client.html'),
  obsoleteControlLive:path.join(BUSINESS,'BusinessOffice_ControlPlane_Live_Client.html'),
  obsoleteApps:path.join(BUSINESS,'BusinessOffice_Modular_Suite.html'),
  rules:path.join(ROOT,'docs','architecture','UNIFIED_APP_CHANGE_RULES.md'),
  agents:path.join(ROOT,'AGENTS.md'),
  assetManifest:path.join(ROOT,'scripts','config','approved-public-assets.json'),
  assemblyVerifier:path.join(ROOT,'scripts','verify-unified-source-assembly.js')
};
const legacyPortalUi=[
  'Portal_ControlPlane_Client.html','Portal_ControlPlane_Live_Client.html','Portal_ControlPlane_Styles.html',
  'Portal_ProductApps_Client.html','Portal_ProductCenter_Client.html','Portal_ProductCenter_Styles.html','Portal_Product_Unification_Styles.html'
].map(name=>path.join(PORTAL,name));

Object.entries(files).forEach(([name,file])=>{
  if(name.startsWith('obsolete'))return;
  check(name+' exists',exists(file),path.relative(ROOT,file));
});

if(failures.length===0){
  const registrySource=read(files.registry);
  const unifiedSource=read(files.unified);
  const indexSource=read(files.index);
  const rawSource=read(files.raw);
  const shellSource=read(files.shell);
  const experienceCoreSource=read(files.experienceCore);
  const workspaceSource=read(files.workspace);
  const bootSource=read(files.boot);
  const styleSource=read(files.styles);
  const clientSource=read(files.client);
  const publicPortalSource=read(files.publicPortal);
  const manifestSource=read(files.manifest);
  const rulesSource=read(files.rules);
  const agentsSource=read(files.agents);

  try{new vm.Script(registrySource,{filename:'Portal_Module_Registry.js'});check('module registry syntax',true);}catch(error){check('module registry syntax',false,error.message);}
  try{new vm.Script(unifiedSource,{filename:'Portal_Unified.js'});check('unified bootstrap syntax',true);}catch(error){check('unified bootstrap syntax',false,error.message);}
  try{new vm.Script(shellSource,{filename:'Portal_UX_Client_Shell.html'});check('unified shell client syntax',true);}catch(error){check('unified shell client syntax',false,error.message);}
  try{new vm.Script(experienceCoreSource+'\n'+workspaceSource+'\n'+bootSource,{filename:'Portal_Client_Foundation.html'});check('portal client foundation syntax',true);}catch(error){check('portal client foundation syntax',false,error.message);}
  try{new vm.Script(clientSource,{filename:'Portal_Product_Client.html'});check('product client syntax',true);}catch(error){check('product client syntax',false,error.message);}

  const context={};
  try{
    vm.createContext(context);
    new vm.Script(registrySource).runInContext(context);
    const groups=context.h38PortalModuleRegistry_('quoteBuilder');
    check('registry returns groups',Array.isArray(groups)&&groups.length>=7,String(groups&&groups.length));
    const groupIds=[];
    const routeKeys=[];
    (groups||[]).forEach(group=>{
      groupIds.push(group.id);
      check('group '+group.id+' has label and items',Boolean(group.id&&group.label&&Array.isArray(group.items)&&group.items.length),group.label||'');
      group.items.forEach(item=>{
        routeKeys.push(item.key);
        check('module '+item.key+' has required metadata',Boolean(item.key&&item.label&&item.icon&&item.type&&item.module&&item.gate&&item.keywords),JSON.stringify(item));
        check('module '+item.key+' has valid type',['native','business'].includes(item.type),item.type);
        check('business route '+item.key+' uses bo prefix',item.type!=='business'||item.key.startsWith('bo:'),item.key);
        check('native route '+item.key+' is not bo prefixed',item.type!=='native'||!item.key.startsWith('bo:'),item.key);
      });
    });
    check('group IDs are unique',new Set(groupIds).size===groupIds.length,groupIds.join(','));
    check('route keys are unique',new Set(routeKeys).size===routeKeys.length,routeKeys.join(','));
    check('required spaces exist',['Today','Customers','Work','Money','Documents','Growth','Office'].every(label=>groups.some(group=>group.label===label)),groups.map(group=>group.label).join(','));
    check('Office replaces Control group',groups.some(group=>group.id==='office'&&group.label==='Office')&&!groups.some(group=>group.id==='control'||group.label==='Control'),groupIds.join(','));
    check('enabled apps are direct workspaces',['bo:requests','bo:customers','bo:quotes','bo:workOrders','bo:jobs','bo:invoices','bo:payments','bo:expenses','bo:documents','bo:reports'].every(key=>routeKeys.includes(key)),routeKeys.join(','));
    check('Office exposes app management',routeKeys.includes('moduleManager')&&groups.find(group=>group.id==='office').items.some(item=>item.key==='moduleManager'&&item.label==='Apps & Modules'));
    check('core routes exist',['today','bo:assignedTasks','proof','errors'].every(key=>routeKeys.includes(key)),routeKeys.join(','));
    check('legacy product controls route is absent',!routeKeys.includes('bo:setup'),routeKeys.join(','));
  }catch(error){
    check('registry evaluates',false,error.stack||error.message);
  }

  check('bootstrap reads central registry',/h38PortalModuleRegistry_\(/.test(unifiedSource));
  check('bootstrap exposes module index',/moduleIndex:moduleIndex/.test(unifiedSource));
  check('bootstrap does not hard-code group array',!/var\s+groups\s*=\s*\[/.test(unifiedSource));
  check('portal loads product styles',indexSource.includes("h38PortalRawInclude_('Portal_Product_Styles')"));
  check('portal loads product client',indexSource.includes("h38PortalRawInclude_('Portal_Product_Client')"));
  check('portal has one top bar',(indexSource.match(/id="ownerTopbar"/g)||[]).length===1);
  check('portal has one navigation host',(indexSource.match(/id="nav"/g)||[]).length===1);
  check('portal keeps approved logo host',(indexSource.match(/id="h38PortalLogo"/g)||[]).length===1);
  check('legacy portal UI files are deleted',legacyPortalUi.every(file=>!exists(file)),legacyPortalUi.filter(exists).map(file=>path.basename(file)).join(','));
  check('legacy portal UI is not included',!/(Portal_ControlPlane|Portal_ProductApps|Portal_ProductCenter|Portal_Product_Unification)/.test(indexSource+rawSource));
  check('retired routes redirect into unified workspaces',/control:'today'/.test(shellSource)&&/'bo:setup':'moduleManager'/.test(shellSource)&&/route\.indexOf\('app:'\)===0/.test(shellSource));
  check('legacy experience core no longer owns navigation or routing',!/(function\s+renderNav\s*\(|function\s+refresh\s*\(|function\s+show\s*\(|Command Center)/.test(experienceCoreSource));
  check('settings no longer renders retired catalog panel',/function\s+renderSettings\s*\(/.test(workspaceSource)&&!/BOOT(?:&&BOOT)?\.catalog|<h2>Catalog<\/h2>|System Settings & Safety/.test(workspaceSource));
  check('workspace no longer starts a competing refresh',!/\nrefresh\(\);?\s*$/.test(workspaceSource));
  check('hash changes synchronize the visible workspace',/addEventListener\('hashchange'/.test(bootSource)&&/h38SyncWorkspaceFromHash/.test(bootSource)&&/await show\(requested\)/.test(bootSource));
  check('public portal is one automatic unified gateway',/location\.replace\(target\)/.test(publicPortalSource)&&/Opening Highway 38 Business Office/.test(publicPortalSource)&&!/Choose where to open|Enter Command Center|Enter Business Office|class="choices"/.test(publicPortalSource));
  check('public portal preserves deep-link compatibility',/upload:'documents'/.test(publicPortalSource)&&/'business-office':'requests'/.test(publicPortalSource)&&/encodeURIComponent\(requested\)/.test(publicPortalSource));
  check('obsolete polish include removed',!indexSource.includes('BusinessOffice_AI_Native_UX_Client')&&!manifestSource.includes('BusinessOffice_AI_Native_UX_Client'));
  check('legacy Business Office override clients inactive',!manifestSource.includes('BusinessOffice_ControlPlane_Client')&&!manifestSource.includes('BusinessOffice_ControlPlane_Live_Client')&&!manifestSource.includes('BusinessOffice_Modular_Suite'));
  check('obsolete Business Office UI files deleted',!exists(files.obsoletePolish)&&!exists(files.obsoleteControl)&&!exists(files.obsoleteControlLive)&&!exists(files.obsoleteApps));
  check('design system owns all major components',['#ownerTopbar','.nav-group-items','#view','.tablewrap','.drawer-panel','#h38-ai-panel','@media(max-width:800px)'].every(marker=>styleSource.includes(marker)),styleSource.length+' bytes');
  check('product client connects render lifecycle',/h38ProductConnectRenderLifecycle/.test(clientSource)&&/h38AfterSurfaceRender/.test(clientSource));
  check('product client provides contextual AI',/h38ProductPrompts/.test(clientSource)&&/data-h38-ai-prompt/.test(clientSource));
  check('product client provides shared loading state',/h38ProductLoadingState/.test(clientSource)&&/data-h38-product-loading/.test(clientSource));
  check('change rules lock logo',/logo is locked/i.test(rulesSource)&&/may not be redrawn/i.test(rulesSource));
  check('change rules require registry',/Portal_Module_Registry\.js/.test(rulesSource));
  check('change rules require deployment authority',/Deploy Unified Owner Portal/.test(rulesSource));
  check('existing asset authority remains',/Approved Asset Authority/.test(agentsSource)&&/controlled binary/.test(agentsSource));
  check('approved asset manifest remains present',exists(files.assetManifest));

  const assembly=childProcess.spawnSync(process.execPath,[files.assemblyVerifier],{cwd:ROOT,encoding:'utf8'});
  if(assembly.stdout)process.stdout.write(assembly.stdout);
  if(assembly.stderr)process.stderr.write(assembly.stderr);
  check('deterministic unified source assembly',assembly.status===0,'exit '+assembly.status);
}

const evidence={
  status:failures.length?'FAIL':'PASS',
  generatedAt:new Date().toISOString(),
  architecture:'single-shell-office-registry-v3.2',
  logoLocked:true,
  passed:pass.length,
  failed:failures.length,
  pass,
  failures
};
fs.mkdirSync(path.dirname(EVIDENCE),{recursive:true});
fs.writeFileSync(EVIDENCE,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
process.exit(failures.length?1:0);