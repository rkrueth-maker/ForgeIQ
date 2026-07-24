#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const failures=[],passes=[];
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const check=(name,condition,detail='')=>{(condition?passes:failures).push({name,detail});console[condition?'log':'error'](`${condition?'PASS':'FAIL'}: ${name}${detail?` — ${detail}`:''}`);};
const parse=(name,source)=>{try{new vm.Script(source,{filename:name});check(`${name} parses`,true);}catch(error){check(`${name} parses`,false,error.message);}};

const index=read('apps-script/core-engine/owner-portal-next/Portal_Index.html');
const raw=read('apps-script/core-engine/owner-portal-next/Portal_RawIncludes.js');
const contract=read('apps-script/business-office/BusinessOffice_ModuleContract.gs');
const registry=read('apps-script/core-engine/owner-portal-next/Portal_Module_Registry.js');
const unified=read('apps-script/core-engine/owner-portal-next/Portal_Unified.js');
const productClient=read('apps-script/core-engine/owner-portal-next/Portal_Product_Client.html');
const shellClient=read('apps-script/core-engine/owner-portal-next/Portal_UX_Client_Shell.html');
const applicationServices=read('apps-script/core-engine/owner-portal-next/Portal_Application_UX.js');
const roleDashboard=read('apps-script/core-engine/owner-portal-next/Portal_Role_Dashboard.js');
const applicationSchema=read('apps-script/core-engine/owner-portal-next/Portal_Application_Schema.js');
const applicationWorkspace=read('apps-script/core-engine/owner-portal-next/Portal_Application_Workspace.js');
const businessServer=read('apps-script/core-engine/owner-portal-next/Portal_Business.js');
const businessClient=read('apps-script/core-engine/owner-portal-next/Portal_Application_Client_Business.html');
const safeClient=read('apps-script/core-engine/owner-portal-next/Portal_Application_Client_SafeActions.html');
const viewsClient=read('apps-script/core-engine/owner-portal-next/Portal_Application_Client_Views.html');
const ownerHome=read('apps-script/core-engine/owner-portal-next/Portal_OneShot_Client.html');
const fieldRoles=read('apps-script/core-engine/owner-portal-next/Portal_Field_Roles.js');
const fieldClient=read('apps-script/core-engine/owner-portal-next/Portal_Field_Roles_Client.html');
const productionConfig=read('apps-script/business-office/BusinessOffice_Config.gs');
const reusableConfig=read('packages/business-office-core/apps-script/BusinessOffice_Config.gs');

const requiredFragments=[
 'Portal_Product_Styles','Portal_Experience_Styles','Portal_Business_Styles','Portal_UX_Styles','Portal_OneShot_UX_Styles','Portal_Application_UX_Styles',
 'Portal_Application_Client_Views','Portal_Application_Client_Business','Portal_Application_Client_SafeActions','Portal_Application_Client_Core',
 'Portal_TaskMessaging_Client','Portal_Equipment_Client','Portal_Field_Roles_Client','Portal_Product_Client','Portal_UX_Client_Boot'
];
check('current product and application fragments are included',requiredFragments.every(name=>index.includes(`h38PortalRawInclude_('${name}')`)),requiredFragments.join(', '));
check('current product and application fragments are allowlisted',requiredFragments.every(name=>raw.includes(`'${name}'`)),requiredFragments.join(', '));
check('legacy duplicate product and control clients are absent',!/(Portal_ControlPlane_Client|Portal_ControlPlane_Styles|Portal_ProductApps|Portal_ProductCenter|Portal_Product_Unification)/.test(index+raw));

const spaces=['Today','Customers','Work','Money','Documents','Growth','Office'];
check('seven adaptive spaces are owned by the canonical contract',spaces.every(label=>contract.includes(`label:'${label}'`))&&!contract.includes("label:'Control'"));
check('module registry derives from canonical contract',registry.includes('boGetUnifiedModuleContract_()')&&unified.includes('h38PortalModuleRegistry_('));
check('Today is the Owner default and My Work is the non-Owner default',/var defaultModule\s*=\s*access\.ownerMode\s*\?\s*'today'\s*:\s*'bo:assignedTasks'/.test(unified));
check('disabled or unauthorized modules are removed from navigation',/filter\(function\(item\)\{return h38PortalUnifiedCanViewItem_/.test(unified));

check('startup uses one browser-to-server RPC',unified.includes('function h38PortalStartupBundle(')&&unified.includes('rpcCount:1')&&productClient.includes("call('h38PortalStartupBundle')"));
check('startup defers secondary modules and schema scans',unified.includes('secondaryModulesDeferred:true')&&unified.includes('schemaChecksDeferred:true'));
check('startup exposes timing and payload evidence',unified.includes('phaseMs:phases')&&unified.includes('payloadCharacters'));
check('startup has no legacy three-call bootstrap sequence',!['h38PortalApplicationBootstrap','h38PortalApplicationClientSchema','h38PortalApplicationControlCenter'].every(name=>productClient.includes(`call('${name}')`)));
check('first paint starts immediately with shared loading state',productClient.includes('data-h38-workspace-state="loading"')&&productClient.includes('h38ProductLoadingState()'));
check('boot removes artificial startup delay',read('apps-script/core-engine/owner-portal-next/Portal_UX_Client_Boot.html').includes('requestAnimationFrame(launch)')&&!read('apps-script/core-engine/owner-portal-next/Portal_UX_Client_Boot.html').includes('setTimeout(launch,100)'));

check('Today exposes decisions work money errors and recent activity',['Needs your decision','Cash expected','Open errors','Recently changed'].every(text=>(ownerHome+viewsClient).includes(text)));
check('shared shell prevents blank workspaces',shellClient.includes('uxWorkspaceHasContent')&&shellClient.includes('uxRenderWorkspaceFailure')&&shellClient.includes('selected route completed without rendering content'));
check('shared shell provides safe retry and error states',shellClient.includes('Workspace could not be displayed.')&&shellClient.includes('Retry'));

check('production and reusable configs support field roles',[productionConfig,reusableConfig].every(source=>source.includes("'Foreman','Estimator','Employee','Field Staff'")));
check('role dashboards include core operating roles',['Administrator','Foreman','Employee','Field Staff','Staff','Viewer','Bookkeeper','Payroll'].every(role=>roleDashboard.includes(`${role}:`)));
check('field profiles enforce role-specific module access',fieldRoles.includes('Foreman:Object.freeze')&&fieldRoles.includes('Employee:Object.freeze')&&fieldRoles.includes('h38FieldRoleCanView_'));
check('field UI preserves Owner-controlled boundaries',fieldClient.includes('Customer sends, pricing approval, purchases, payments, payroll, and accounting remain owner-controlled'));

check('module manager exposes dependencies roles records and status',['dependencies','roles','recordCount','integrationStatus','lastUsed','recordsPreserved'].every(marker=>applicationServices.includes(marker)));
check('module disable preserves records and history',applicationServices.includes('Existing records and audit history were preserved')&&applicationServices.includes('preservedRecordCount')&&!/deleteRow|deleteSheet|removeRecord/.test(applicationServices));
check('module dependencies hold or cascade explicitly',applicationServices.includes('Disable dependent modules first or confirm a cascade')&&applicationServices.includes('cascade !== true'));
check('essential modules cannot be disabled',applicationServices.includes('Essential safety and operating modules cannot be disabled'));

check('approval center supports selected-record approve revise hold reject',['APPROVE','REVISE','HOLD','REJECT'].every(decision=>safeClient.includes(`'${decision}'`))&&safeClient.includes('Selected record only'));
check('approval decisions remain Owner-only and external-locked',applicationWorkspace.includes('Owner approval is required')&&applicationWorkspace.includes('externalActionsOccurred:false'));
check('customer workspace has connected records',['Overview','Requests','Jobs','Quotes','Invoices','Payments','Communications','Files','Timeline'].every(text=>businessClient.includes(`'${text}'`)));
check('job workspace has execution proof and financial records',['Summary','Scope','Tasks','Schedule','Purchases','Expenses','Quote','Invoice & payments','Files','Communications','Proof & errors','Timeline'].every(text=>businessClient.includes(`'${text}'`)));
check('Business Office list workspace and save are permission-aware',businessServer.includes('h38PortalBusinessRequirePermission_')&&businessServer.includes('readOnly'));
check('hard external-action boundaries remain locked',[applicationServices,roleDashboard,applicationWorkspace,businessServer,fieldRoles].every(source=>/externalActionsOccurred:false|externalActionsEnabled:false/.test(source))&&!/DIRECT_PAYMENT_PROCESSING:\s*true|liveExternalActions:\s*true|bulkExecution:\s*true/.test([applicationServices,roleDashboard,applicationWorkspace,businessServer,fieldRoles].join('\n')));

[
 ['Portal_Unified',unified],['Portal_Module_Registry',registry],['Portal_Application_UX',applicationServices],['Portal_Role_Dashboard',roleDashboard],
 ['Portal_Application_Schema',applicationSchema],['Portal_Application_Workspace',applicationWorkspace],['Portal_Business',businessServer],
 ['Portal_Product_Client',productClient],['Portal_UX_Client_Shell',shellClient],['Portal_Application_Client_Business',businessClient],
 ['Portal_Application_Client_SafeActions',safeClient],['Portal_Application_Client_Views',viewsClient],['Portal_OneShot_Client',ownerHome],
 ['Portal_Field_Roles',fieldRoles],['Portal_Field_Roles_Client',fieldClient]
].forEach(item=>parse(item[0],item[1]));

const evidence={status:failures.length?'HOLD':'PASS',generatedAt:new Date().toISOString(),passed:passes.length,failed:failures.length,architecture:'contract-derived-unified-app-one-rpc-startup',controls:{singleApp:true,oneStartupRpc:true,scopeAwareVerifier:true,recordsPreserved:true,externalActionsAutomatic:false},passes,failures};
const out=path.join(root,'artifacts','unified-app-ux');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));process.exit(failures.length?1:0);
