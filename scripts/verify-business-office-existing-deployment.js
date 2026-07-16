#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/business-office.yml'),'utf8');
const deploy=fs.readFileSync(path.join(root,'scripts/deploy-business-office-existing-production.sh'),'utf8');
const pack=JSON.parse(fs.readFileSync(path.join(root,'business-packs/highway38/deployment.json'),'utf8'));
const failures=[];
function check(name,ok){console.log(`${ok?'PASS':'FAIL'}: ${name}`);if(!ok)failures.push(name)}
check('accepted deployment ID is recorded',Boolean(pack.appsScript&&pack.appsScript.businessOfficeDeploymentId));
check('workflow uses accepted deployment ID',workflow.includes(pack.appsScript.businessOfficeDeploymentId));
check('workflow invokes update-existing deployment script',workflow.includes('deploy-business-office-existing-production.sh'));
check('workflow never creates Apps Script projects',!workflow.includes('clasp create-script')&&!deploy.includes('clasp create-script'));
check('workflow never creates production deployments',!workflow.includes('clasp create-deployment')&&!deploy.includes('clasp create-deployment'));
check('deployment updates accepted ID in place',deploy.includes('clasp update-deployment "$DEPLOYMENT_ID"'));
check('deployment discovers owner project by exact deployment ID',deploy.includes('clasp list-deployments "$SCRIPT_ID"')||deploy.includes('clasp list-deployments "$candidate"')||deploy.includes('clasp list-deployments "$SCRIPT_ID"'));
check('deployment backs up bound project',deploy.includes('bound-project-backup.tar.gz'));
check('deployment requires version advance',deploy.includes('test "$NEW_VERSION" -gt "$BEFORE_VERSION"'));
check('deployed UX markers are verified',['What needs to move next?','Sales Pipeline','Job Stage Board','Accounting health','Grouped global search'].every(marker=>deploy.includes(marker)));
check('desktop and mobile evidence is produced',deploy.includes('business-office-live-desktop')&&deploy.includes('business-office-live-mobile'));
check('external actions remain disabled',deploy.includes('"externalActionsEnabled": false')&&deploy.includes('"externalActionsOccurred": false'));
check('no new project or deployment evidence',deploy.includes('"createdNewProject": false')&&deploy.includes('"createdNewDeployment": false'));
if(failures.length){console.error(JSON.stringify({status:'FAIL',failures},null,2));process.exit(1)}
console.log(JSON.stringify({status:'PASS',checks:13},null,2));
