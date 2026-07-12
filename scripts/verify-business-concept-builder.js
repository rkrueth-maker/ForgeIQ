#!/usr/bin/env node
'use strict';

const fs=require('fs');
const os=require('os');
const path=require('path');
const vm=require('vm');
const childProcess=require('child_process');
const core=require('../core-engine/product/business-concept-builder/business-concept-core.js');
const product=require('../core-engine/product/lib/business-os-product.js');

const ROOT=path.resolve(__dirname,'..');
const EVIDENCE_DIR=path.join(ROOT,'launch-control','evidence');
fs.mkdirSync(EVIDENCE_DIR,{recursive:true});
const passes=[];
const failures=[];
const check=(name,condition,detail='')=>(condition?passes:failures).push({name,detail});
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');
const readJson=relative=>JSON.parse(read(relative));
const exists=relative=>fs.existsSync(path.join(ROOT,relative));
function expectThrow(name,fn,contains){try{fn();failures.push({name,detail:'Expected an error but none was thrown.'});}catch(error){check(name,!contains||String(error.message).includes(contains),error.message);}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}

function run(){
  const requiredFiles=[
    'business-concept-builder.html',
    'business-concept-builder.js',
    'core-engine/product/business-concept-builder/README.md',
    'core-engine/product/business-concept-builder/business-concept-core.js',
    'core-engine/product/business-concept-builder/schema/business-concept-input.schema.json',
    'core-engine/product/business-concept-builder/schema/business-concept-package.schema.json',
    'core-engine/product/business-concept-builder/examples/synthetic-workshop-planning.input.json',
    'scripts/generate-business-concept-package.js'
  ];
  for(const file of requiredFiles)check(`required artifact: ${file}`,exists(file));

  const inputSchema=readJson('core-engine/product/business-concept-builder/schema/business-concept-input.schema.json');
  const outputSchema=readJson('core-engine/product/business-concept-builder/schema/business-concept-package.schema.json');
  const sampleInput=readJson('core-engine/product/business-concept-builder/examples/synthetic-workshop-planning.input.json');
  check('input schema requires all hard-rule categories',core.REQUIRED_INPUT_FIELDS.every(field=>inputSchema.required.includes(field)),JSON.stringify(inputSchema.required));
  check('output schema requires every owner-review section',['businessSummary','customerProblemSegments','offers','productLadder','pricingLogic','freeLeadMagnet','addOns','recurringContracts','sitemap','pageOutlines','intakeQuestions','productRecords','sopList','businessOSConfiguration','businessPackDraft','launchPlan30Days','socialThemes','socialDrafts','expenseCategories','risks','missingInformation','decisions','tasks','records'].every(field=>outputSchema.required.includes(field)));
  check('sample contains physical/digital/local/online model field',Array.isArray(sampleInput.businessModels)&&sampleInput.businessModels.length>=1);

  const generatedAt='2026-07-12T12:00:00.000Z';
  const packageData=core.generatePackage(sampleInput,{generatedAt});
  const packageErrors=core.validatePackage(packageData);
  check('generated package validates',packageErrors.length===0,packageErrors.join(' '));
  check('generated metadata is owner-review only',packageData.metadata.status==='OWNER_REVIEW_REQUIRED'&&packageData.metadata.selfApproved===false&&packageData.metadata.automaticExternalActions===false&&packageData.metadata.externalActionsOccurred===false);
  check('business summary preserves all required input domains',packageData.businessSummary.ownerSkills.length===5&&packageData.businessSummary.customers.length===3&&packageData.businessSummary.assetsEquipment.length===5&&packageData.businessSummary.businessModels.length===3&&packageData.businessSummary.currentSystems.length===1&&packageData.businessSummary.expansionIdeas.length===1);
  check('customer/problem segments generated from input',packageData.customerProblemSegments.length===sampleInput.customers.length&&packageData.customerProblemSegments.every(segment=>segment.primaryProblem===sampleInput.primaryProblem));
  check('complete five-level offer ladder generated',packageData.offers.length===5&&['Free','Starter','Core','Premium','Recurring'].every(level=>packageData.offers.some(offer=>offer.level===level)));
  check('pricing logic is calculated from capacity and goal',packageData.pricingLogic.assumptions.hoursPerWeek===20&&packageData.pricingLogic.assumptions.monthlyRevenueGoal===6000&&packageData.pricingLogic.ranges.starter[0]===150&&packageData.pricingLogic.ranges.core[0]===600);
  check('free lead magnet and conversion path generated',packageData.freeLeadMagnet.name.includes('readiness checklist')&&packageData.freeLeadMagnet.conversionPath.includes('starter snapshot'));
  check('add-ons and recurring contracts generated',packageData.addOns.length===6&&packageData.recurringContracts.length===2);
  check('sitemap and page outlines adapt to selected models',packageData.sitemap.includes('Service Area')&&packageData.sitemap.includes('Online Delivery')&&packageData.sitemap.includes('Downloads and Tools')&&!packageData.sitemap.includes('Products or Equipment')&&packageData.pageOutlines['Online Delivery']);
  check('intake is comprehensive and model-aware',packageData.intakeQuestions.length>=14&&packageData.intakeQuestions.some(question=>question.includes('file formats'))&&packageData.intakeQuestions.some(question=>question.includes('service-area')));
  check('product records are unique structured drafts',packageData.productRecords.length===5&&new Set(packageData.productRecords.map(record=>record.id)).size===5&&packageData.productRecords.every(record=>record.status==='DRAFT'&&record.ownerApprovalRequired===true&&record.externalActionsEnabled===false));
  check('SOP package generated',packageData.sopList.length===20&&packageData.sopList.every(item=>item.selectedRecordOnly===true&&item.externalActionsEnabled===false));
  check('30-day plan references created tasks',packageData.launchPlan30Days.length===5&&packageData.launchPlan30Days.flatMap(phase=>phase.taskIds).length===25);
  check('social themes and drafts generated',packageData.socialThemes.length===6&&packageData.socialDrafts.length===6&&packageData.socialDrafts.every(item=>item.status==='DRAFT_OWNER_REVIEW'&&item.externalActionsEnabled===false));
  check('expense categories and allocations generated',packageData.expenseCategories.length===16&&packageData.expenseCategories.some(item=>item.planningAllocation!==null));
  check('risks, missing information, and decisions generated',packageData.risks.length>=10&&packageData.missingInformation.length>=8&&packageData.decisions.length===10);
  check('25 Tasks created with valid dependencies and locked execution',packageData.tasks.length===25&&packageData.tasks.every(task=>task.status==='NEEDS_OWNER_REVIEW'&&task.selectedRecordOnly===true&&task.bulkExecution===false&&task.externalActionsEnabled===false));
  check('records aggregate all generated record types',packageData.records.products.length===packageData.productRecords.length&&packageData.records.tasks.length===packageData.tasks.length&&packageData.records.sops.length===packageData.sopList.length);

  const modifiedInput=JSON.parse(JSON.stringify(sampleInput));
  modifiedInput.businessName='South Shore Digital Operations';
  modifiedInput.customers=['independent service businesses'];
  modifiedInput.primaryProblem='Leads, quotes, jobs, and files are disconnected';
  modifiedInput.primaryOutcome='A controlled lead-to-delivery operating workflow';
  modifiedInput.businessModels=['digital','online'];
  const modifiedPackage=core.generatePackage(modifiedInput,{generatedAt});
  check('generator is data-dependent, not static sample text',modifiedPackage.metadata.inputDigest!==packageData.metadata.inputDigest&&modifiedPackage.businessSummary.name!==packageData.businessSummary.name&&modifiedPackage.productRecords[0].id!==packageData.productRecords[0].id&&modifiedPackage.customerProblemSegments.length===1&&modifiedPackage.offers[2].name===modifiedInput.primaryOutcome);

  const sensitiveInput=JSON.parse(JSON.stringify(sampleInput));
  sensitiveInput.currentSystems+=' password=synthetic-secret sk_live_SYNTHETIC123456 4111111111111111';
  const sensitivePackage=core.generatePackage(sensitiveInput,{generatedAt});
  const sensitiveText=JSON.stringify(sensitivePackage);
  check('sensitive-looking strings are redacted',sensitivePackage.metadata.redactionsApplied>=3&&!sensitiveText.includes('synthetic-secret')&&!sensitiveText.includes('sk_live_SYNTHETIC123456')&&!sensitiveText.includes('4111111111111111')&&sensitiveText.includes('REDACTED-SENSITIVE'));
  expectThrow('incomplete concept is rejected',()=>core.generatePackage({businessName:'X',idea:'tiny'}, {generatedAt}),'Working business name');

  const osConfig=packageData.businessOSConfiguration;
  check('tenant separation is locked',osConfig.tenant.mode==='isolated'&&osConfig.tenant.crossTenantReads===false&&osConfig.tenant.crossTenantWrites===false);
  check('selected-record, duplicate, proof, and error controls preserved',osConfig.controls.selectedRecordOnly===true&&osConfig.controls.bulkExecution===false&&osConfig.controls.automaticRetry===false&&osConfig.controls.duplicateProtection===true&&osConfig.controls.proofLogRequired===true&&osConfig.controls.errorLogRequired===true);
  check('all provider slots are present and locked',['catalog','payment','email','accounting','social','website','storage','calendar'].every(slot=>osConfig.providers.some(provider=>provider.slot===slot&&provider.executionState==='LOCKED'&&provider.credentialState==='NOT_CONFIGURED')));
  check('all external feature flags remain disabled',core.EXTERNAL_FLAGS.every(flag=>packageData.businessPackDraft.featureFlags[flag]===false));
  check('Business Pack draft does not self-enable actions',packageData.businessPackDraft.externalActionsEnabled===false&&packageData.businessPackDraft.support.selectedRecordOnly===true&&packageData.businessPackDraft.support.customerFacingApprovalRequired===true);

  const engineConfig=readJson('core-engine/product/config/core-engine.default.json');
  const license=readJson('core-engine/product/licenses/example-evaluation-license.json');
  check('generated Business Pack validates with transferable engine',product.validateBusinessPack(packageData.businessPackDraft).length===0,product.validateBusinessPack(packageData.businessPackDraft).join(' '));
  const effective=product.compileInstallation(engineConfig,packageData.businessPackDraft,{license,tenantKey:packageData.businessPackDraft.defaultTenantKey,tenantName:packageData.businessSummary.name,tier:packageData.businessPackDraft.defaultTier,releaseChannel:'development',environment:'test'});
  check('generated Business Pack compiles into isolated test configuration',effective.tenant.key===packageData.businessPackDraft.defaultTenantKey&&effective.environment==='test'&&effective.externalActionsEnabled===false&&effective.controls.externalActionsEnabled===false);
  check('compiled installation preserves all external locks',core.EXTERNAL_FLAGS.every(flag=>effective.featureFlags[flag]===false)&&Object.values(effective.providers).every(provider=>provider.executionState==='LOCKED'&&provider.ownerReleaseRequired===true));

  const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'business-concept-builder-'));
  const installDir=path.join(tempRoot,'test-install');
  const install=product.installBusinessOs({engineConfig,businessPack:packageData.businessPackDraft,license,outputDir:installDir,tenantKey:packageData.businessPackDraft.defaultTenantKey,tenantName:packageData.businessSummary.name,tier:packageData.businessPackDraft.defaultTier,releaseChannel:'development',environment:'test'});
  check('installer creates test tenant, logs, and private storage',existsTemp(path.join(installDir,'effective-config.json'))&&existsTemp(path.join(installDir,install.effective.tenant.namespace,'logs','proof-log.jsonl'))&&existsTemp(path.join(installDir,install.effective.tenant.namespace,'logs','error-log.jsonl'))&&existsTemp(path.join(installDir,install.effective.tenant.namespace,'private-files')));
  const dataRoot=path.join(installDir,install.effective.tenant.namespace,'data');
  fs.writeFileSync(path.join(dataRoot,'tasks.json'),JSON.stringify(packageData.tasks,null,2)+'\n','utf8');
  fs.writeFileSync(path.join(dataRoot,'products.json'),JSON.stringify(packageData.productRecords,null,2)+'\n','utf8');
  fs.writeFileSync(path.join(dataRoot,'contracts.json'),JSON.stringify(packageData.recurringContracts,null,2)+'\n','utf8');
  check('generated Tasks and records materialize only inside selected test tenant',JSON.parse(fs.readFileSync(path.join(dataRoot,'tasks.json'),'utf8')).length===25&&JSON.parse(fs.readFileSync(path.join(dataRoot,'products.json'),'utf8')).length===5&&path.resolve(dataRoot).startsWith(path.resolve(installDir,install.effective.tenant.namespace)));
  const backupFile=path.join(tempRoot,'backup.json');
  product.createBackup(installDir,backupFile);
  const restoreDir=path.join(tempRoot,'restored');
  const restored=product.restoreBackup(backupFile,restoreDir);
  check('backup and restore preserve tenant and records',restored.effective.tenant.key===effective.tenant.key&&JSON.parse(fs.readFileSync(path.join(restoreDir,effective.tenant.namespace,'data','tasks.json'),'utf8')).length===25);
  const tampered=JSON.parse(fs.readFileSync(backupFile,'utf8'));
  tampered.payload.effective.tenant.key='tampered';
  const tamperedFile=path.join(tempRoot,'tampered.json');
  writeJson(tamperedFile,tampered);
  expectThrow('tampered backup is rejected',()=>product.restoreBackup(tamperedFile,path.join(tempRoot,'tampered-restore')),'integrity');

  const cliOut=path.join(tempRoot,'cli-output');
  const cliResult=childProcess.spawnSync(process.execPath,[path.join(ROOT,'scripts/generate-business-concept-package.js'),'--input',path.join(ROOT,'core-engine/product/business-concept-builder/examples/synthetic-workshop-planning.input.json'),'--output',cliOut,'--generated-at',generatedAt],{encoding:'utf8'});
  check('CLI generation exits successfully',cliResult.status===0,cliResult.stderr||cliResult.stdout);
  const expectedBase='north-ridge-workshop-planning';
  const cliFiles=[`${expectedBase}-business-concept-package.json`,`${expectedBase}-owner-review-brief.md`,`${expectedBase}-created-tasks.csv`,`${expectedBase}-business-pack.draft.json`,`${expectedBase}-business-os-config.draft.json`,'generation-manifest.json'];
  check('CLI writes complete owner-review file set',cliFiles.every(file=>fs.existsSync(path.join(cliOut,file))),cliFiles.filter(file=>!fs.existsSync(path.join(cliOut,file))).join(', '));
  const cliPackage=JSON.parse(fs.readFileSync(path.join(cliOut,`${expectedBase}-business-concept-package.json`),'utf8'));
  check('CLI package matches core generator digest and counts',cliPackage.metadata.inputDigest===packageData.metadata.inputDigest&&cliPackage.tasks.length===25&&cliPackage.productRecords.length===5);
  check('Tasks CSV contains selected-record and external-action controls',fs.readFileSync(path.join(cliOut,`${expectedBase}-created-tasks.csv`),'utf8').includes('selected_record_only')&&fs.readFileSync(path.join(cliOut,`${expectedBase}-created-tasks.csv`),'utf8').includes('false'));

  const transferableCore=read('core-engine/product/business-concept-builder/business-concept-core.js');
  check('transferable core contains no Highway 38 terminology',!/Highway 38|H38-/i.test(transferableCore));
  check('transferable core contains no network execution',!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|https\.request\s*\(|axios\s*\(/.test(transferableCore));
  check('transferable core parses in browser-style VM',browserParse(transferableCore));
  const browserHtml=read('business-concept-builder.html');
  const browserJs=read('business-concept-builder.js');
  check('browser page exposes every hard-rule input',core.REQUIRED_INPUT_FIELDS.every(field=>browserHtml.includes(`name="${field}"`)||field==='businessModels'&&browserHtml.includes('name="businessModels"')));
  check('browser page loads shared core before UI wrapper',browserHtml.indexOf('business-concept-core.js')<browserHtml.indexOf('business-concept-builder.js'));
  check('browser downloads JSON, Markdown, Tasks, Business Pack, and OS config',browserJs.includes('download-json')&&browserJs.includes('download-md')&&browserJs.includes('download-tasks')&&browserJs.includes('download-pack')&&browserJs.includes('download-config'));
  check('browser package generation remains local',!/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(browserJs));
  check('browser has no automatic external form action',!/<form[^>]+action=/i.test(browserHtml));

  const sampleEvidence={
    status:'OWNER_REVIEW_REQUIRED',
    generatedAt,
    package:packageData,
    materializedRecords:{products:packageData.productRecords.length,tasks:packageData.tasks.length,contracts:packageData.recurringContracts.length,sops:packageData.sopList.length,socialDrafts:packageData.socialDrafts.length,risks:packageData.risks.length,decisions:packageData.decisions.length},
    installer:{tenant:effective.tenant,environment:effective.environment,tier:effective.tier,releaseChannel:effective.releaseChannel,externalActionsEnabled:effective.externalActionsEnabled},
    externalActionsOccurred:false
  };
  writeJson(path.join(EVIDENCE_DIR,'business-concept-builder-sample-package.json'),sampleEvidence);
  fs.writeFileSync(path.join(EVIDENCE_DIR,'business-concept-builder-created-tasks.csv'),core.tasksCsv(packageData),'utf8');

  const evidence={
    status:failures.length?'HOLD':'PASS',
    generatedAt:new Date().toISOString(),
    version:core.VERSION,
    passed:passes.length,
    failed:failures.length,
    outputs:{segments:packageData.customerProblemSegments.length,offers:packageData.offers.length,products:packageData.productRecords.length,addOns:packageData.addOns.length,contracts:packageData.recurringContracts.length,sitemapPages:packageData.sitemap.length,intakeQuestions:packageData.intakeQuestions.length,sops:packageData.sopList.length,tasks:packageData.tasks.length,socialDrafts:packageData.socialDrafts.length,expenseCategories:packageData.expenseCategories.length,risks:packageData.risks.length,decisions:packageData.decisions.length},
    controls:{ownerReviewRequired:true,selectedRecordOnly:true,bulkExecution:false,automaticRetry:false,tenantIsolation:true,duplicateProtection:true,proofLogRequired:true,errorLogRequired:true,externalActionsEnabled:false,selfApproval:false},
    externalActionsOccurred:false,
    passes,
    failures
  };
  writeJson(path.join(EVIDENCE_DIR,'business-concept-builder-verification.json'),evidence);
  fs.rmSync(tempRoot,{recursive:true,force:true});
  console.log(JSON.stringify(evidence,null,2));
  process.exit(failures.length?1:0);

  function existsTemp(file){return fs.existsSync(file);}
  function browserParse(source){try{const context={globalThis:{}};vm.createContext(context);vm.runInContext(source,context,{filename:'business-concept-core.js'});return Boolean(context.globalThis.BusinessConceptCore);}catch(error){failures.push({name:'browser parse error',detail:error.message});return false;}}
}

try{run();}catch(error){console.error(error);process.exit(1);}
