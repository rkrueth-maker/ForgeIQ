#!/usr/bin/env bash
set -euo pipefail

ROOT="${GITHUB_WORKSPACE:?}"
EVIDENCE="$ROOT/artifacts/business-office-production-v2"
APP="$RUNNER_TEMP/h38-business-office-v2"
SYNC="$RUNNER_TEMP/h38-business-office-sync-v2"
FIXTURES="$EVIDENCE/fixtures"
mkdir -p "$EVIDENCE" "$APP" "$SYNC" "$FIXTURES"

json_response_check() {
  local file="$1"
  node - "$file" <<'NODE'
const fs=require('fs');const file=process.argv[2];const value=JSON.parse(fs.readFileSync(file,'utf8'));
if(value.error) throw new Error(file+': '+JSON.stringify(value.error));
if(value.response===undefined) throw new Error(file+': missing response');
console.log(JSON.stringify(value.response));
NODE
}

cd "$APP"
clasp create-script --type standalone --title "Highway 38 Business Office" --rootDir . --json > "$EVIDENCE/app-create.json"
cp "$ROOT"/apps-script/business-office/*.gs .
cp "$ROOT"/apps-script/business-office/*.html .
cp "$ROOT"/apps-script/business-office/appsscript.json .
APP_SCRIPT_ID="$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('.clasp.json','utf8')).scriptId)")"
printf '%s' "$APP_SCRIPT_ID" > "$EVIDENCE/app-script-id.txt"
clasp push --force --json > "$EVIDENCE/app-push.json"
clasp create-version "Highway 38 Business Office ${GITHUB_SHA}" --json > "$EVIDENCE/app-version.json"
APP_VERSION="$(node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('$EVIDENCE/app-version.json','utf8')).versionNumber))")"
clasp create-deployment --versionNumber "$APP_VERSION" --description "Highway 38 Business Office ${GITHUB_SHA}" --json > "$EVIDENCE/app-deployment.json"
APP_DEPLOYMENT_ID="$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('$EVIDENCE/app-deployment.json','utf8')).deploymentId)")"
printf '%s' "$APP_DEPLOYMENT_ID" > "$EVIDENCE/app-deployment-id.txt"
printf 'https://script.google.com/macros/s/%s/exec' "$APP_DEPLOYMENT_ID" > "$EVIDENCE/web-app-url.txt"

BOOTSTRAP_PARAMS="$(node - <<'NODE'
process.stdout.write(JSON.stringify([{
  ownerEmail:process.env.H38_BO_OWNER_EMAIL,
  H38_BUSINESS_OFFICE_SPREADSHEET_ID:process.env.H38_BO_SPREADSHEET_ID,
  H38_BUSINESS_OFFICE_DEFAULT_BUSINESS_ID:process.env.H38_BO_BUSINESS_ID,
  H38_BUSINESS_OFFICE_ROOT_FOLDER_ID:process.env.H38_BO_ROOT_FOLDER_ID,
  H38_BUSINESS_OFFICE_DOCUMENT_FOLDER_ID:process.env.H38_BO_DOCUMENT_FOLDER_ID,
  H38_BUSINESS_OFFICE_PDF_FOLDER_ID:process.env.H38_BO_PDF_FOLDER_ID,
  H38_BUSINESS_OFFICE_EXPORT_FOLDER_ID:process.env.H38_BO_EXPORT_FOLDER_ID,
  H38_BUSINESS_OFFICE_BACKUP_FOLDER_ID:process.env.H38_BO_BACKUP_FOLDER_ID,
  H38_BACKEND_SPREADSHEET_ID:process.env.H38_BACKEND_SPREADSHEET_ID
}]));
NODE
)"
clasp run-function boBootstrapInstall --params "$BOOTSTRAP_PARAMS" --json > "$EVIDENCE/bootstrap.json"
clasp run-function boRunSelfTest --nondev --json > "$EVIDENCE/self-test.json"
json_response_check "$EVIDENCE/bootstrap.json" > "$EVIDENCE/bootstrap-response.json"
json_response_check "$EVIDENCE/self-test.json" > "$EVIDENCE/self-test-response.json"
node - <<'NODE'
const fs=require('fs');const self=JSON.parse(fs.readFileSync('artifacts/business-office-production-v2/self-test-response.json','utf8'));
if(self.status!=='PASS'||self.tests.some(t=>t.status!=='PASS')) throw new Error('Self-test HOLD: '+JSON.stringify(self));
NODE

cd "$SYNC"
clasp create-script --type standalone --title "Highway 38 Business Office Intake Sync" --rootDir . --json > "$EVIDENCE/sync-create.json"
cp "$ROOT"/apps-script/business-office-sync/*.gs .
cp "$ROOT"/apps-script/business-office-sync/appsscript.json .
SYNC_SCRIPT_ID="$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('.clasp.json','utf8')).scriptId)")"
printf '%s' "$SYNC_SCRIPT_ID" > "$EVIDENCE/sync-script-id.txt"
clasp push --force --json > "$EVIDENCE/sync-push.json"
clasp create-version "Highway 38 Business Office Intake Sync ${GITHUB_SHA}" --json > "$EVIDENCE/sync-version.json"
SYNC_VERSION="$(node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('$EVIDENCE/sync-version.json','utf8')).versionNumber))")"
clasp create-deployment --versionNumber "$SYNC_VERSION" --description "Highway 38 Business Office Intake Sync ${GITHUB_SHA}" --json > "$EVIDENCE/sync-deployment.json"
SYNC_DEPLOYMENT_ID="$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('$EVIDENCE/sync-deployment.json','utf8')).deploymentId)")"
printf '%s' "$SYNC_DEPLOYMENT_ID" > "$EVIDENCE/sync-deployment-id.txt"
SYNC_PARAMS="$(node - <<'NODE'
process.stdout.write(JSON.stringify([{
  ownerEmail:process.env.H38_BO_OWNER_EMAIL,
  H38_BACKEND_SPREADSHEET_ID:process.env.H38_BACKEND_SPREADSHEET_ID,
  H38_BUSINESS_OFFICE_SPREADSHEET_ID:process.env.H38_BO_SPREADSHEET_ID,
  H38_BUSINESS_OFFICE_DEFAULT_BUSINESS_ID:process.env.H38_BO_BUSINESS_ID
}]));
NODE
)"
clasp run-function h38BusinessOfficeBootstrapSync --params "$SYNC_PARAMS" --json > "$EVIDENCE/sync-bootstrap.json"
clasp run-function h38BusinessOfficeSyncAcceptance --nondev --json > "$EVIDENCE/sync-acceptance.json"
json_response_check "$EVIDENCE/sync-bootstrap.json" > "$EVIDENCE/sync-bootstrap-response.json"
json_response_check "$EVIDENCE/sync-acceptance.json" > "$EVIDENCE/sync-acceptance-response.json"
node - <<'NODE'
const fs=require('fs');for(const file of ['sync-bootstrap-response.json','sync-acceptance-response.json']){const value=JSON.parse(fs.readFileSync('artifacts/business-office-production-v2/'+file,'utf8'));if(value.status!=='PASS')throw new Error(file+': '+JSON.stringify(value));}
NODE

cd "$ROOT"
node - <<'NODE'
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const out=path.resolve('artifacts/business-office-production-v2/fixtures'),run=process.env.GITHUB_RUN_ID;
const html=(title,lines)=>`<!doctype html><html><style>body{font:30px Arial;margin:70px;background:white;color:black}h1{font-size:40px}p{padding:8px;border-bottom:1px solid #ccc}</style><body><h1>${title}</h1>${lines.map(x=>`<p>${x}</p>`).join('')}</body></html>`;
(async()=>{const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1200,height:1500}});
await page.setContent(html('HIGHWAY 38 TEST SUPPLY RECEIPT',['Vendor Highway 38 Test Supply','Date 2026-07-14',`Receipt LIVE-${run}`,'Materials 20.00','Tax 1.40','Total 21.40','Payment Method Business Card']));await page.screenshot({path:path.join(out,`receipt-${run}.png`),fullPage:true});
await page.setContent(html('HIGHWAY 38 WORK ORDER',['Northwoods Sample Customer','Address Grand Rapids MN','Job Number JOB-2026-0001','Work Requested Prepare sample project plan','Assigned Employee Sample Employee','Labor 2 hours','Materials Planning packet','Due Date 2026-07-22','Status Open']));await page.screenshot({path:path.join(out,`work-order-${run}.png`),fullPage:true});
await page.setContent(html('VENDOR INVOICE',['Vendor Highway 38 Test Supply',`Invoice Number VINV-${run}`,'Date 2026-07-14','Due Date 2026-08-13','Terms Net 30','PO Reference PO-2026-0001','Subtotal 50.00','Tax 3.50','Total 53.50']));await page.pdf({path:path.join(out,`vendor-invoice-${run}.pdf`),format:'Letter',printBackground:true});await browser.close();
const fixture=(file,mime)=>({fileName:file,mimeType:mime,base64Data:fs.readFileSync(path.join(out,file)).toString('base64')});
fs.writeFileSync(path.join(out,'params.json'),JSON.stringify([{receiptImage:fixture(`receipt-${run}.png`,'image/png'),workOrderImage:fixture(`work-order-${run}.png`,'image/png'),vendorInvoicePdf:fixture(`vendor-invoice-${run}.pdf`,'application/pdf')}]))
})().catch(e=>{console.error(e);process.exit(1)});
NODE

LIVE_PARAMS="$(cat "$FIXTURES/params.json")"
cd "$APP"
clasp run-function boRunLiveAcceptance --params "$LIVE_PARAMS" --nondev --json > "$EVIDENCE/live-acceptance.json"
json_response_check "$EVIDENCE/live-acceptance.json" > "$EVIDENCE/live-result.json"
node - <<'NODE'
const fs=require('fs');const live=JSON.parse(fs.readFileSync('artifacts/business-office-production-v2/live-result.json','utf8'));
if(live.status!=='PASS'||live.tests.some(t=>t.status!=='PASS')) throw new Error('Live acceptance HOLD: '+JSON.stringify(live));
if(!live.created||!Array.isArray(live.created.pdfFiles)||live.created.pdfFiles.length!==9) throw new Error('Nine live Apps Script PDFs were not generated.');
NODE

clasp run-function boGetRenderedWebAppHtml --nondev --json > "$EVIDENCE/rendered-html.json"
json_response_check "$EVIDENCE/rendered-html.json" > "$EVIDENCE/rendered-html-response.json"
cd "$ROOT"
node - <<'NODE'
const fs=require('fs'),{chromium}=require('playwright');const html=JSON.parse(fs.readFileSync('artifacts/business-office-production-v2/rendered-html-response.json','utf8'));
for(const marker of ['Highway 38 Business Office','capture="environment"','@media (max-width:800px)','savedViews']) if(!html.includes(marker)) throw new Error('Missing deployed UI marker: '+marker);
fs.writeFileSync('artifacts/business-office-production-v2/deployed-web-app.html',html);
(async()=>{const browser=await chromium.launch({headless:true});for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){const page=await browser.newPage({viewport:{width,height}});await page.setContent(html,{waitUntil:'domcontentloaded'});await page.screenshot({path:`artifacts/business-office-production-v2/${name}.png`,fullPage:true});}await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
NODE

cat > "$EVIDENCE/deployment-summary.json" <<JSON
{"status":"PASS","sourceCommit":"${GITHUB_SHA}","businessOfficeScriptId":"${APP_SCRIPT_ID}","businessOfficeDeploymentId":"${APP_DEPLOYMENT_ID}","businessOfficeWebAppUrl":"https://script.google.com/macros/s/${APP_DEPLOYMENT_ID}/exec","intakeSyncScriptId":"${SYNC_SCRIPT_ID}","intakeSyncDeploymentId":"${SYNC_DEPLOYMENT_ID}","spreadsheetId":"${H38_BO_SPREADSHEET_ID}","externalActionsEnabled":false,"customerActionsOccurred":false,"paymentProcessed":false,"payrollFundsMoved":false,"taxReturnFiled":false}
JSON
