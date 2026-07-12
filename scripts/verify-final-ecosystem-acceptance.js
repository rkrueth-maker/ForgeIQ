#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const childProcess=require('child_process');
const crypto=require('crypto');

const ROOT=path.resolve(__dirname,'..');
const PACKAGE_FILE=path.join(ROOT,'launch-control','final-acceptance-package.json');
const EVIDENCE_DIR=path.join(ROOT,'launch-control','evidence');
fs.mkdirSync(EVIDENCE_DIR,{recursive:true});
const passes=[];
const failures=[];
const check=(name,condition,detail='')=>(condition?passes:failures).push({name,detail});
const exists=rel=>fs.existsSync(path.join(ROOT,rel));
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const sha=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');

function runVerifier(relative){
  const file=path.join(ROOT,relative);
  if(!fs.existsSync(file))return {file:relative,status:'MISSING',exitCode:null,stdout:'',stderr:''};
  const result=childProcess.spawnSync(process.execPath,[file],{cwd:ROOT,encoding:'utf8',env:process.env,maxBuffer:20*1024*1024});
  return {file:relative,status:result.status===0?'PASS':'FAIL',exitCode:result.status,stdout:(result.stdout||'').slice(-5000),stderr:(result.stderr||'').slice(-5000)};
}

function localTarget(url){
  const base='https://rkrueth-maker.github.io/highway-38-solutions/';
  if(!url.startsWith(base))return null;
  const relative=url.slice(base.length).split(/[?#]/)[0];
  return relative||'index.html';
}

function main(){
  const requiredFiles=[
    'launch-control/final-acceptance-package.json',
    'launch-control/FINAL_ACCEPTANCE.md',
    'final-acceptance.html',
    'ecosystem-status.html',
    'revenue-operations-status.html',
    'customer-portal.html',
    'business-concept-builder.html',
    'proof.html',
    'free-tools.html',
    'products.html',
    'sitemap.xml',
    'catalog-data.js',
    'core-engine/product/config/core-engine.default.json',
    'core-engine/product/business-concept-builder/business-concept-core.js',
    'core-engine/customer-portal/README.md',
    'core-engine/revenue-operations/config/provider-activation.json',
    'core-engine/revenue-operations/config/social-content-plan-30-day.json',
    'proof-system/status.json'
  ];
  requiredFiles.forEach(file=>check(`required artifact: ${file}`,exists(file)));

  const pkg=JSON.parse(fs.readFileSync(PACKAGE_FILE,'utf8'));
  check('final package schema',pkg.schemaVersion===1&&pkg.release==='complete-ecosystem-acceptance-2026-07-12');
  check('master and integration issues exact',pkg.masterIssue===31&&pkg.integrationIssue===37);
  check('overall decision is conditional GO',pkg.overallDecision==='CONDITIONAL_GO'&&/HOLD/.test(pkg.decisionMeaning));
  check('scope accounting blocks reduction and fake completion',pkg.scopeAccounting.scopeReduced===false&&pkg.scopeAccounting.silentOmissions===false&&pkg.scopeAccounting.fakeCompletion===false&&pkg.scopeAccounting.criticalControlsWaived===false&&pkg.scopeAccounting.exactBlockersRetained===true);
  check('six workstreams exact',JSON.stringify(pkg.workstreams.map(item=>item.issue))===JSON.stringify([32,33,34,35,36,37]));
  check('every workstream has decision and rollback',pkg.workstreams.every(item=>item.decision&&item.rollback));
  check('workstreams record commits and evidence',pkg.workstreams.every(item=>item.acceptanceCommit||item.ownerPortalCommit||item.builderCommit||item.sourceCommit));

  const requiredComponents={
    'Public website and customer path':'GO',
    'Owner Portal':'GO',
    'Customer Portal production activation':'HOLD',
    'Business Concept Builder':'GO',
    'Transferable Business OS':'GO',
    'Private PST and photo source processing':'HOLD',
    'Revenue and contract records':'GO',
    'Accounting':'GO',
    'Social content bank':'GO',
    'Production payment links and processing':'HOLD',
    'Advertising spend':'HOLD'
  };
  const componentMap=new Map(pkg.componentDecisions.map(item=>[item.component,item]));
  for(const [name,decision] of Object.entries(requiredComponents))check(`component decision: ${name}`,componentMap.get(name)?.decision===decision,componentMap.get(name)?.decision||'missing');
  check('component matrix includes at least twenty decisions',pkg.componentDecisions.length>=20,String(pkg.componentDecisions.length));

  check('Owner Portal record preserves exact existing bound project',pkg.workstreams[1].ownerPortal.boundScriptId==='13Bes6_rs3LD-Sch4Vi5DKssCnlU_qb4hzZpGpDVfoRELRak0htXEj7O-'&&pkg.workstreams[1].ownerPortal.deploymentId==='AKfycbzr0hoImRF4iQ1gR90Cr17juP8PODkEWRorXxW6qralEYTGLhOU33E1wYEPU_3duQKpQg');
  check('Owner Portal version and self-test accepted',pkg.workstreams[1].ownerPortal.deploymentVersion===9&&pkg.workstreams[1].ownerPortal.selfTest==='PASS');
  check('no standalone or second deployment recorded',pkg.workstreams[1].ownerPortal.standaloneProjectCreated===false&&pkg.workstreams[1].ownerPortal.secondDeploymentCreated===false);
  check('Owner Portal external actions locked',pkg.workstreams[1].ownerPortal.externalActionsEnabled===false);
  check('customer records remain unexposed',pkg.workstreams[1].customerPortal.recordsExposed===false&&pkg.workstreams[1].customerPortal.status.startsWith('HOLD'));

  check('public URLs list is complete',pkg.livePublicUrls.length>=16,String(pkg.livePublicUrls.length));
  for(const url of pkg.livePublicUrls){
    const target=localTarget(url);
    check(`public URL target: ${url}`,target&&exists(target),target||'not a recognized site URL');
  }
  check('public final acceptance URL included',pkg.livePublicUrls.includes('https://rkrueth-maker.github.io/highway-38-solutions/final-acceptance.html'));

  const blockerIds=pkg.exactRemainingBlockers.map(item=>item.id);
  check('exact blockers are numerous and unique',blockerIds.length>=15&&new Set(blockerIds).size===blockerIds.length,String(blockerIds.length));
  check('every blocker has one exact next step',pkg.exactRemainingBlockers.every(item=>item.component&&item.blocker&&item.nextStep&&item.nextStep.length>20));
  for(const prefix of ['CUSTOMER-','PST-','PHOTO-','PROOF-','EMAIL-','PAYMENT-','ACCOUNTING-','SOCIAL-','COMMERCIAL-','OWNER-'])check(`blocker group ${prefix}`,blockerIds.some(id=>id.startsWith(prefix)));

  check('all external actions locked or disabled',Object.values(pkg.externalActionState).every(value=>['LOCKED','DISABLED'].includes(value)));
  check('bulk and retry disabled',pkg.externalActionState.bulkExecution==='DISABLED'&&pkg.externalActionState.automaticRetry==='DISABLED');
  check('privacy decision passes',pkg.privacyDecision.status==='PASS'&&Object.entries(pkg.privacyDecision).filter(([key])=>key!=='status').every(([,value])=>value===false));
  check('no external actions occurred',pkg.externalActionsOccurred===false);

  check('six or more rollback records',pkg.rollbackRegister.length>=6,String(pkg.rollbackRegister.length));
  check('every rollback has reference and method',pkg.rollbackRegister.every(item=>item.component&&item.reference&&item.method));
  check('complete public rollback reference preserved',pkg.rollbackRegister.some(item=>item.reference==='3bd325f'));
  check('acceptance requirements all recorded',Object.values(pkg.acceptanceRequirements).every(Boolean));

  const catalog=read('catalog-data.js');
  const productIds=new Set(catalog.match(/H38-P\d{3}/g)||[]);
  const bundleIds=new Set(catalog.match(/H38-B\d{3}/g)||[]);
  check('catalog contains exact 15 products',productIds.size===15,[...productIds].sort().join(','));
  check('catalog contains exact 9 bundles',bundleIds.size===9,[...bundleIds].sort().join(','));
  check('product IDs are contiguous',Array.from({length:15},(_,i)=>`H38-P${String(i+1).padStart(3,'0')}`).every(id=>productIds.has(id)));
  check('bundle IDs are contiguous',Array.from({length:9},(_,i)=>`H38-B${String(i+1).padStart(3,'0')}`).every(id=>bundleIds.has(id)));

  const providerConfig=json('core-engine/revenue-operations/config/provider-activation.json');
  check('provider configuration remains fail-closed',providerConfig.controls.externalActionsEnabled===false&&providerConfig.controls.selectedRecordOnly===true&&providerConfig.controls.bulkExecution===false&&providerConfig.controls.automaticRetry===false);
  check('provider slots remain non-live',providerConfig.providers.length===6&&providerConfig.providers.every(item=>item.liveExecution===false&&item.exactConnectionStep));
  check('payment security remains hosted and raw-card-free',providerConfig.paymentSecurity.providerHostedCardEntryRequired===true&&providerConfig.paymentSecurity.rawCardDataAllowed===false);

  const social=json('core-engine/revenue-operations/config/social-content-plan-30-day.json');
  check('social content bank contains 30 days',social.days.length===30&&new Set(social.days.map(item=>item.day)).size===30);
  check('five approved social platforms',JSON.stringify(social.approvedPlatforms)===JSON.stringify(['facebook','instagram','linkedin','google-business-profile','youtube']));
  check('social publishing remains disabled',social.publishingControls.externalPublishingEnabled===false&&social.externalActionsOccurred===false);

  const proofStatus=json('proof-system/status.json');
  check('private proof source blockers remain truthful',proofStatus.status==='PIPELINE_READY_PRIVATE_SOURCE_BLOCKED'&&proofStatus.privateSourcePublished===false&&proofStatus.externalActionsOccurred===false);

  const finalHtml=read('final-acceptance.html');
  check('final acceptance page has title and viewport',/<title>[^<]+<\/title>/i.test(finalHtml)&&/<meta[^>]+name="viewport"/i.test(finalHtml));
  check('final acceptance page states conditional decision',finalHtml.includes('conditional GO')&&finalHtml.includes('External actions locked'));
  check('final acceptance page does not expose private Owner Portal identifiers',!finalHtml.includes(pkg.workstreams[1].ownerPortal.boundScriptId)&&!finalHtml.includes(pkg.workstreams[1].ownerPortal.deploymentId));
  check('public acceptance page excludes private-source names',!/(?:\bClow\b|\bCSC\b|backup\.pst|rkrueth@gmail\.com)/i.test(finalHtml));
  check('public acceptance page has no form or network action',!/<form\b/i.test(finalHtml)&&!/(fetch\(|XMLHttpRequest|sendBeacon)/.test(finalHtml));
  for(const match of finalHtml.matchAll(/href="([^"]+)"/g)){
    const href=match[1];
    if(/^(?:https?:|mailto:|tel:|#)/.test(href))continue;
    const target=href.split(/[?#]/)[0];
    if(target)check(`final page local link: ${target}`,exists(target));
  }

  const verifierFiles=[
    'scripts/verify-complete-ecosystem-launch.js',
    'scripts/verify-public-ecosystem-tools.js',
    'scripts/verify-business-os-productization.js',
    'scripts/verify-business-concept-builder.js',
    'scripts/verify-proof-evidence-system.js',
    'scripts/verify-revenue-operations-core.js',
    'scripts/verify-revenue-growth-activation.js'
  ];
  const verifierRuns=verifierFiles.map(runVerifier);
  verifierRuns.forEach(result=>check(`integrated verifier: ${result.file}`,result.status==='PASS',result.status==='MISSING'?'missing':result.stderr||result.stdout));

  const evidence={
    release:pkg.release,
    status:failures.length?'HOLD':'PASS',
    generatedAt:new Date().toISOString(),
    sourceBaseline:pkg.sourceBaseline,
    overallDecision:pkg.overallDecision,
    passed:passes.length,
    failed:failures.length,
    workstreams:pkg.workstreams.map(item=>({issue:item.issue,name:item.name,decision:item.decision})),
    components:{total:pkg.componentDecisions.length,go:pkg.componentDecisions.filter(item=>item.decision==='GO').length,hold:pkg.componentDecisions.filter(item=>item.decision==='HOLD').length},
    blockers:pkg.exactRemainingBlockers.length,
    livePublicUrls:pkg.livePublicUrls.length,
    rollbackPoints:pkg.rollbackRegister.length,
    externalActionsOccurred:false,
    integratedVerifierRuns:verifierRuns.map(result=>({file:result.file,status:result.status,exitCode:result.exitCode})),
    packageDigest:sha(pkg),
    passes,
    failures
  };
  fs.writeFileSync(path.join(EVIDENCE_DIR,'final-ecosystem-acceptance-verification.json'),JSON.stringify(evidence,null,2)+'\n');
  fs.writeFileSync(path.join(EVIDENCE_DIR,'final-ecosystem-acceptance-package.json'),JSON.stringify(pkg,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
  process.exit(failures.length?1:0);
}

try{main();}catch(error){
  const crash={status:'CRASH',generatedAt:new Date().toISOString(),error:error.message,stack:error.stack,externalActionsOccurred:false};
  fs.writeFileSync(path.join(EVIDENCE_DIR,'final-ecosystem-acceptance-verification.json'),JSON.stringify(crash,null,2)+'\n');
  console.error(JSON.stringify(crash,null,2));
  process.exit(1);
}
