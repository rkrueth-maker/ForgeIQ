#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const pass=[];
const failures=[];
function check(name,condition,detail=''){(condition?pass:failures).push({name,detail});console[condition?'log':'error'](`${condition?'PASS':'FAIL'}: ${name}${detail?` — ${detail}`:''}`);}
function file(relative){return path.join(root,relative);}
function exists(relative){return fs.existsSync(file(relative));}
function read(relative){return fs.readFileSync(file(relative),'utf8');}

const required={
  agents:'AGENTS.md',
  governance:'docs/architecture/WEBSITE_AND_WEB_APP_CHANGE_GOVERNANCE.md',
  appRules:'docs/architecture/UNIFIED_APP_CHANGE_RULES.md',
  websiteRules:'docs/architecture/PUBLIC_WEBSITE_CHANGE_RULES.md',
  moduleContract:'apps-script/business-office/BusinessOffice_ModuleContract.gs',
  actionContract:'apps-script/business-office/BusinessOffice_ActionContract.gs',
  moduleRegistry:'apps-script/core-engine/owner-portal-next/Portal_Module_Registry.js',
  siteShell:'assets/js/h38-site-v2.js',
  siteStyles:'assets/css/h38-site-v2.css',
  routeRegistry:'scripts/config/public-website-routes.json',
  approvedAssets:'scripts/config/approved-public-assets.json',
  imagePlacements:'scripts/config/approved-public-image-placements.json',
  pagesWorkflow:'.github/workflows/pages.yml',
  appWorkflow:'.github/workflows/deploy-owner-portal-hard-rule-production.yml',
  governanceWorkflow:'.github/workflows/change-governance.yml',
  websiteVerifier:'scripts/verify-public-website-architecture.js',
  appVerifier:'scripts/verify-unified-app-architecture.js'
};
Object.entries(required).forEach(([name,relative])=>check(`${name} exists`,exists(relative),relative));

if(failures.length===0){
  const agents=read(required.agents);
  const governance=read(required.governance);
  const appRules=read(required.appRules);
  const websiteRules=read(required.websiteRules);
  const pagesWorkflow=read(required.pagesWorkflow);
  const appWorkflow=read(required.appWorkflow);
  const governanceWorkflow=read(required.governanceWorkflow);
  const websiteVerifier=read(required.websiteVerifier);
  const appVerifier=read(required.appVerifier);
  const moduleContract=read(required.moduleContract);
  const actionContract=read(required.actionContract);
  const moduleRegistry=read(required.moduleRegistry);
  const shell=read(required.siteShell);
  const routes=JSON.parse(read(required.routeRegistry));
  const placements=JSON.parse(read(required.imagePlacements));

  check('root rules apply to every chat and change',/every chat, agent, branch, pull request, direct commit, automation, module, application, and public website change/i.test(agents));
  check('root rules reference combined governance',agents.includes('WEBSITE_AND_WEB_APP_CHANGE_GOVERNANCE.md'));
  check('root rules identify canonical module contract',agents.includes('BusinessOffice_ModuleContract.gs'));
  check('root rules identify canonical action contract',agents.includes('BusinessOffice_ActionContract.gs'));
  check('root rules identify canonical public shell',agents.includes('assets/js/h38-site-v2.js')&&agents.includes('assets/css/h38-site-v2.css'));
  check('root rules identify canonical image placement manifest',agents.includes('scripts/config/approved-public-image-placements.json'));
  check('root rules require governance verification',agents.includes('node scripts/verify-change-governance.js'));

  ['Classify the change before editing','Required change intake','Adding to the public website','Adding to the authenticated web app','Deleting or retiring','Prohibited additions','Performance requirements','Mandatory verification','Deployment authority','Definition of done'].forEach(marker=>check(`governance section: ${marker}`,governance.includes(marker)));
  check('governance locks logo and image binaries',/logo and approved website image binaries are locked/i.test(governance));
  check('governance preserves records and deployment IDs',governance.includes('deployment IDs')&&governance.includes('Proof Log')&&governance.includes('audit history'));
  check('governance blocks duplicate architecture',/another authenticated application shell/.test(governance)&&/another public-site shell/.test(governance)&&/duplicate schemas/.test(governance));
  check('governance requires one app startup RPC',/one browser-to-server startup RPC/.test(governance));
  check('governance names both deployment authorities',governance.includes('.github/workflows/pages.yml')&&governance.includes('.github/workflows/deploy-owner-portal-hard-rule-production.yml'));

  check('app rules reference governance verifier',appRules.includes('node scripts/verify-change-governance.js'));
  check('website rules reference governance verifier',websiteRules.includes('node scripts/verify-change-governance.js'));
  check('website rules use only canonical placement manifest',websiteRules.includes('scripts/config/approved-public-image-placements.json')&&!websiteRules.includes('public-image-placement-manifest.json'));
  check('duplicate image placement manifest is absent',!exists('scripts/config/public-image-placement-manifest.json'));

  check('module contract is canonical',/function\s+boGetUnifiedModuleContract_\s*\(/.test(moduleContract));
  check('action contract is canonical',/function\s+boGetActionContract_\s*\(|function\s+boModulesForApiAction_\s*\(/.test(actionContract));
  check('module registry derives from contract',/boGetUnifiedModuleContract_\(/.test(moduleRegistry));
  check('public shell owns one registry',/navigation\s*:\s*\[/.test(shell)&&/footer\s*:\s*\[/.test(shell));
  check('public route registry has primary routes',Array.isArray(routes.primary)&&routes.primary.length>=7,String(routes.primary&&routes.primary.length));
  check('image placement manifest locks runtime source changes',placements.runtimeRules&&placements.runtimeRules.mayChangeImageSource===false&&placements.runtimeRules.mayInsertRepresentativeImages===false&&placements.runtimeRules.mayUseFallbackImage===false);

  check('governance workflow runs on pull requests',/pull_request:/.test(governanceWorkflow));
  check('governance workflow watches canonical rule and contract files',['AGENTS.md','docs/architecture/**','BusinessOffice_ModuleContract.gs','BusinessOffice_ActionContract.gs','approved-public-image-placements.json','public-website-routes.json'].every(marker=>governanceWorkflow.includes(marker)));
  check('governance workflow runs the verifier',governanceWorkflow.includes('node scripts/verify-change-governance.js'));
  check('Pages production workflow runs the website architecture verifier',pagesWorkflow.includes('node scripts/verify-public-website-architecture.js'));
  check('website architecture verifier runs governance first',websiteVerifier.includes("verify-change-governance.js"));
  check('Business Office production workflow runs the app architecture verifier',appWorkflow.includes('node scripts/verify-unified-app-architecture.js'));
  check('app architecture verifier runs governance first',appVerifier.includes("verify-change-governance.js"));
}

const evidence={status:failures.length?'HOLD':'PASS',generatedAt:new Date().toISOString(),policy:'website-and-web-app-governance-v1',passed:pass.length,failed:failures.length,pass,failures};
const out=file('artifacts/change-governance');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
process.exit(failures.length?1:0);
