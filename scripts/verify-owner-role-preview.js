#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const oneShot=read('apps-script/core-engine/owner-portal-next/Portal_OneShot_Client.html');
const fieldRoles=read('apps-script/core-engine/owner-portal-next/Portal_Field_Roles_Client.html');
const client=read('apps-script/core-engine/owner-portal-next/Portal_RolePreview_Client.html');
const userAccess=read('apps-script/core-engine/owner-portal-next/Portal_UserAccess_Client.html');
const styles=read('apps-script/core-engine/owner-portal-next/Portal_RolePreview_Styles.html');
const index=read('apps-script/core-engine/owner-portal-next/Portal_Index.html');
const raw=read('apps-script/core-engine/owner-portal-next/Portal_RawIncludes.js');
const failures=[];
function check(name,condition,detail=''){if(condition)console.log(`PASS: ${name}`);else{console.error(`FAIL: ${name}${detail?` — ${detail}`:''}`);failures.push(name);}}
check('preview buttons are visible',userAccess.includes('Preview Foreman')&&userAccess.includes('Preview Employee'));
check('preview client loads after field roles',index.indexOf("h38PortalRawInclude_('Portal_RolePreview_Client')")>index.indexOf("h38PortalRawInclude_('Portal_Field_Roles_Client')"));
check('preview styles are included',index.includes("h38PortalRawInclude_('Portal_RolePreview_Styles')"));
check('preview fragments are allowlisted',raw.includes("'Portal_RolePreview_Client'")&&raw.includes("'Portal_RolePreview_Styles'"));
check('preview is explicitly read only',client.includes('Owner role preview is read-only')&&client.includes('No user was created, no permission changed'));
check('preview is temporary per tab',client.includes('sessionStorage.setItem')&&client.includes('sessionStorage.removeItem'));
check('preview supports exit',client.includes('h38ExitRolePreview')&&styles.includes('h38-role-preview-banner'));
check('brand guard accepts role-specific portal label',oneShot.includes('function h38ExpectedPortalBrand()')&&oneShot.includes("release.textContent!==h38ExpectedPortalBrand()"));
for(const [name,source] of [['owner dashboard client',oneShot],['field roles client',fieldRoles],['role preview client',client]]){
  try{new Function(source);check(name+' parses',true);}catch(error){check(name+' parses',false,error.message);}
}

const storage={};
const classNames=new Set();
let mutationCount=0;
const release={dataset:{},title:'',_text:'production-build',_observers:[]};
Object.defineProperty(release,'textContent',{get(){return this._text;},set(value){this._text=String(value);mutationCount+=1;if(mutationCount>20)throw new Error('Brand observer loop detected.');this._observers.slice().forEach(callback=>callback([]));}});
const packageNode={textContent:'Installed Business Package'};
const documentStub={
  readyState:'complete',
  body:{classList:{add:name=>classNames.add(name),remove:name=>classNames.delete(name)}},
  addEventListener(){},
  getElementById(id){if(id==='release')return release;if(id==='packageName')return packageNode;return null;},
  querySelector(){return null;},
  createElement(){return {className:'',innerHTML:'',remove(){},set id(value){this._id=value;},get id(){return this._id;}};}
};
function MutationObserver(callback){this.callback=callback;}
MutationObserver.prototype.observe=function(target){target._observers.push(this.callback);};
let baseCalls=[];
const sandbox={
  console,Promise,Error,String,Array,Object,RegExp,JSON,Date,Intl,Number,Boolean,Math,MutationObserver,
  H38_UNIFIED:{ownerMode:true,user:{role:'Owner'},groups:[{id:'today',label:'Today',items:[{key:'today',label:'Home'},{key:'userAccess',label:'Users'}]}]},
  H38_APP_MODULE_MANAGER:{modules:[]},H38_UX:{},EXPERIENCE:{},BOOT:{},CURRENT:'userAccess',document:documentStub,
  sessionStorage:{getItem:key=>storage[key]||null,setItem:(key,value)=>{storage[key]=String(value);},removeItem:key=>{delete storage[key];}},
  call(name,args){baseCalls.push(name);return Promise.resolve({name,args});},
  renderNav(){return true;},refresh(){return Promise.resolve(true);},
  h38AppRouteAllowed(){return true;},h38AppModuleKeyFromRoute(route){return route==='today'?'commandCenter':String(route||'').replace(/^bo:/,'');},h38AppModuleState(){return null;},
  uxRows:value=>Array.isArray(value)?value:[],esc:value=>String(value),attr:value=>String(value),notice(){},show(){return Promise.resolve(true);},
  h38RoleMetric(){return'';},h38OwnerAttentionStrip(){return'';},h38NextUpGroups(){return'';},uxTaskList(){return'';},uxActivity(){return'';},h38DashboardApprovals(){return'';},openUxPreset(){},h38OpenOwnerAi(){},h38OpenOwnerQuickQuote(){}
};
sandbox.window=sandbox;
(async()=>{
  try{
    vm.createContext(sandbox);
    new vm.Script(oneShot,{filename:'Portal_OneShot_Client.html'}).runInContext(sandbox);
    new vm.Script(fieldRoles,{filename:'Portal_Field_Roles_Client.html'}).runInContext(sandbox);
    new vm.Script(client,{filename:'Portal_RolePreview_Client.html'}).runInContext(sandbox);
    check('owner begins outside preview',sandbox.h38FieldClientRole()==='Owner'&&release.textContent==='Owner Portal');
    await sandbox.h38StartRolePreview('Foreman');
    check('owner can enter Foreman preview',sandbox.h38RolePreviewActive()&&sandbox.h38FieldClientRole()==='Foreman');
    check('Foreman preview persists for the tab',storage.h38OwnerRolePreview==='Foreman');
    check('Foreman portal branding stabilizes',release.textContent==='Foreman Portal'&&mutationCount<10,`label=${release.textContent} mutations=${mutationCount}`);
    let mutationBlocked=false;try{await sandbox.call('h38PortalUserAccessSave',[{}]);}catch(error){mutationBlocked=/read-only/.test(error.message);}check('mutations are blocked during preview',mutationBlocked);
    await sandbox.call('h38PortalUnifiedBootstrap');check('read calls remain available',baseCalls.includes('h38PortalUnifiedBootstrap'));
    await sandbox.h38ExitRolePreview();sandbox.h38NormalizeBrand();
    check('exit restores owner role and stable brand',!sandbox.h38RolePreviewActive()&&sandbox.h38FieldClientRole()==='Owner'&&!storage.h38OwnerRolePreview&&release.textContent==='Owner Portal'&&mutationCount<14,`label=${release.textContent} mutations=${mutationCount}`);
  }catch(error){check('role preview runtime simulation',false,error.stack||error.message);}
  console.log(`RESULT: ${failures.length?'HOLD':'PASS'} — ${failures.length} failure(s)`);
  process.exit(failures.length?1:0);
})();