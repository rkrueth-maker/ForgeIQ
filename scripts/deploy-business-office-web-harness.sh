#!/usr/bin/env bash
set -euo pipefail

ROOT="${GITHUB_WORKSPACE:?}"
OUT="$ROOT/artifacts/business-office-production-v2"
APP="$RUNNER_TEMP/h38-bo-web-harness"
SYNC="$RUNNER_TEMP/h38-bo-sync-harness"
FIX="$RUNNER_TEMP/h38-bo-fixtures"
TOKEN="$(openssl rand -hex 32)"
mkdir -p "$OUT" "$FIX"

jval(){ node -e "const v=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));process.stdout.write(String(v[process.argv[2]]??''))" "$1" "$2"; }
post(){ local url="$1" body="$2" file="$3" status; status="$(curl -L -sS -o "$file" -w '%{http_code}' -H 'Content-Type: application/json' --data-binary "@$body" "${url}?bo_token=${TOKEN}")"; printf '%s' "$status" > "${file}.status"; test "$status" = 200; node - "$file" <<'NODE'
const fs=require('fs');const v=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));if(!v.ok)throw new Error(v.error||'Harness failure');process.stdout.write(JSON.stringify(v.result));
NODE
}
manifest(){ node - "$1" "$2" <<'NODE'
const fs=require('fs');const [src,out]=process.argv.slice(2);const m=JSON.parse(fs.readFileSync(src,'utf8'));m.webapp={access:'ANYONE_ANONYMOUS',executeAs:'USER_DEPLOYING'};delete m.executionApi;fs.writeFileSync(out,JSON.stringify(m,null,2)+'\n');
NODE
}
deploy(){ local dir="$1" title="$2" key="$3"; cd "$dir"; clasp push --force --json > "$OUT/${key}-push.json"; clasp create-version "$title ${GITHUB_SHA}" --json > "$OUT/${key}-version.json"; local version="$(jval "$OUT/${key}-version.json" versionNumber)"; clasp create-deployment --versionNumber "$version" --description "$title ${GITHUB_SHA}" --json > "$OUT/${key}-deployment.json"; local id="$(jval "$OUT/${key}-deployment.json" deploymentId)"; test -n "$id"; printf '%s' "$id" > "$OUT/${key}-deployment-id.txt"; }

rm -rf "$APP"; mkdir -p "$APP"; cd "$APP"
clasp create-script --type standalone --title 'Highway 38 Business Office' --rootDir . --json > "$OUT/app-create.json"
cp "$ROOT"/apps-script/business-office/*.gs .; cp "$ROOT"/apps-script/business-office/*.html .
cp "$ROOT"/apps-script/business-office/appsscript.json appsscript.final.json
cp BusinessOffice_Auth.gs BusinessOffice_Auth.final.gs; cp BusinessOffice_Web.gs BusinessOffice_Web.final.gs
python3 - <<'PY'
from pathlib import Path
p=Path('BusinessOffice_Auth.gs');s=p.read_text().replace("Session.getActiveUser().getEmail()","(Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail())");p.write_text(s)
p=Path('BusinessOffice_Web.gs');s=p.read_text().replace('function doGet()','function boPrivateDoGet_()',1);p.write_text(s)
PY
manifest appsscript.final.json appsscript.json
python3 - "$TOKEN" <<'PY'
from pathlib import Path
import json,sys
t=json.dumps(sys.argv[1])
Path('BusinessOffice_AcceptanceHarness.gs').write_text(f'''const BO_ACCEPTANCE_TOKEN_={t};
function boHarnessOut_(v){{return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}}
function boHarnessOk_(e){{return e&&e.parameter&&e.parameter.bo_token===BO_ACCEPTANCE_TOKEN_;}}
function doGet(e){{if(!boHarnessOk_(e))return boHarnessOut_({{ok:false,error:'Forbidden'}});if(e.parameter.mode==='ui')return HtmlService.createTemplateFromFile('BusinessOffice_Index').evaluate().setTitle('Highway 38 Business Office').addMetaTag('viewport','width=device-width, initial-scale=1');return boHarnessOut_({{ok:true,result:{{status:'PASS'}}}});}}
function doPost(e){{try{{if(!boHarnessOk_(e))throw new Error('Forbidden');const r=JSON.parse(e.postData.contents||'{{}}');let x;if(r.action==='bootstrap')x=boBootstrapInstall(r.payload||{{}});else if(r.action==='selfTest')x=boRunSelfTest();else if(r.action==='liveAcceptance')x=boRunLiveAcceptance(r.payload||{{}});else throw new Error('Unsupported action');return boHarnessOut_({{ok:true,result:x}});}}catch(error){{return boHarnessOut_({{ok:false,error:error.message,stack:error.stack||''}});}}}}
''')
PY
APP_ID="$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('.clasp.json','utf8')).scriptId)")"; printf '%s' "$APP_ID" > "$OUT/business-office-script-id.txt"
deploy "$APP" 'Highway 38 Business Office Acceptance' app-acceptance
APP_ACCEPT_ID="$(cat "$OUT/app-acceptance-deployment-id.txt")"; APP_URL="https://script.google.com/macros/s/${APP_ACCEPT_ID}/exec"; printf '%s' "$APP_URL" > "$OUT/app-acceptance-url.txt"
cat > "$OUT/bootstrap-request.json" <<JSON
{"action":"bootstrap","payload":{"ownerEmail":"${H38_BO_OWNER_EMAIL}","H38_BUSINESS_OFFICE_SPREADSHEET_ID":"${H38_BO_SPREADSHEET_ID}","H38_BUSINESS_OFFICE_DEFAULT_BUSINESS_ID":"${H38_BO_BUSINESS_ID}","H38_BUSINESS_OFFICE_ROOT_FOLDER_ID":"${H38_BO_ROOT_FOLDER_ID}","H38_BUSINESS_OFFICE_DOCUMENT_FOLDER_ID":"${H38_BO_DOCUMENT_FOLDER_ID}","H38_BUSINESS_OFFICE_PDF_FOLDER_ID":"${H38_BO_PDF_FOLDER_ID}","H38_BUSINESS_OFFICE_EXPORT_FOLDER_ID":"${H38_BO_EXPORT_FOLDER_ID}","H38_BUSINESS_OFFICE_BACKUP_FOLDER_ID":"${H38_BO_BACKUP_FOLDER_ID}","H38_BACKEND_SPREADSHEET_ID":"${H38_BACKEND_SPREADSHEET_ID}"}}
JSON
post "$APP_URL" "$OUT/bootstrap-request.json" "$OUT/bootstrap.json" > "$OUT/bootstrap-response.json"
printf '%s' '{"action":"selfTest","payload":{}}' > "$OUT/self-test-request.json"; post "$APP_URL" "$OUT/self-test-request.json" "$OUT/self-test.json" > "$OUT/self-test-response.json"
node - <<'NODE'
const fs=require('fs');const v=JSON.parse(fs.readFileSync('artifacts/business-office-production-v2/self-test-response.json','utf8'));if(v.status!=='PASS'||v.tests.some(t=>t.status!=='PASS'))throw new Error('Self-test HOLD: '+JSON.stringify(v));
NODE

rm -rf "$SYNC"; mkdir -p "$SYNC"; cd "$SYNC"
clasp create-script --type standalone --title 'Highway 38 Business Office Intake Sync' --rootDir . --json > "$OUT/sync-create.json"
cp "$ROOT"/apps-script/business-office-sync/*.gs .; cp "$ROOT"/apps-script/business-office-sync/appsscript.json appsscript.final.json
python3 - <<'PY'
from pathlib import Path
p=Path('BusinessOffice_Sync.gs');s=p.read_text().replace("Session.getActiveUser().getEmail()","(Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail())");p.write_text(s)
PY
manifest appsscript.final.json appsscript.json
python3 - "$TOKEN" <<'PY'
from pathlib import Path
import json,sys
t=json.dumps(sys.argv[1])
Path('BusinessOffice_SyncHarness.gs').write_text(f'''const BO_SYNC_TOKEN_={t};function boSyncOut_(v){{return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}}function doGet(e){{return boSyncOut_({{ok:!!(e&&e.parameter&&e.parameter.bo_token===BO_SYNC_TOKEN_),result:{{status:'PASS'}}}});}}function doPost(e){{try{{if(!(e&&e.parameter&&e.parameter.bo_token===BO_SYNC_TOKEN_))throw new Error('Forbidden');const r=JSON.parse(e.postData.contents||'{{}}');let x;if(r.action==='bootstrap')x=h38BusinessOfficeBootstrapSync(r.payload||{{}});else if(r.action==='acceptance')x=h38BusinessOfficeSyncAcceptance();else throw new Error('Unsupported action');return boSyncOut_({{ok:true,result:x}});}}catch(error){{return boSyncOut_({{ok:false,error:error.message,stack:error.stack||''}});}}}}''')
PY
SYNC_ID="$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('.clasp.json','utf8')).scriptId)")"; printf '%s' "$SYNC_ID" > "$OUT/intake-sync-script-id.txt"
deploy "$SYNC" 'Highway 38 Business Office Intake Sync Acceptance' sync-acceptance
SYNC_ACCEPT_ID="$(cat "$OUT/sync-acceptance-deployment-id.txt")"; SYNC_URL="https://script.google.com/macros/s/${SYNC_ACCEPT_ID}/exec"
cat > "$OUT/sync-bootstrap-request.json" <<JSON
{"action":"bootstrap","payload":{"ownerEmail":"${H38_BO_OWNER_EMAIL}","H38_BACKEND_SPREADSHEET_ID":"${H38_BACKEND_SPREADSHEET_ID}","H38_BUSINESS_OFFICE_SPREADSHEET_ID":"${H38_BO_SPREADSHEET_ID}","H38_BUSINESS_OFFICE_DEFAULT_BUSINESS_ID":"${H38_BO_BUSINESS_ID}"}}
JSON
post "$SYNC_URL" "$OUT/sync-bootstrap-request.json" "$OUT/sync-bootstrap.json" > "$OUT/sync-bootstrap-response.json"
printf '%s' '{"action":"acceptance","payload":{}}' > "$OUT/sync-acceptance-request.json"; post "$SYNC_URL" "$OUT/sync-acceptance-request.json" "$OUT/sync-acceptance.json" > "$OUT/sync-acceptance-response.json"
node - <<'NODE'
const fs=require('fs');for(const f of ['sync-bootstrap-response.json','sync-acceptance-response.json']){const v=JSON.parse(fs.readFileSync('artifacts/business-office-production-v2/'+f,'utf8'));if(v.status!=='PASS')throw new Error(f+': '+JSON.stringify(v));}
NODE

cd "$ROOT"
node <<'NODE'
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');const out=process.env.RUNNER_TEMP+'/h38-bo-fixtures',run=process.env.GITHUB_RUN_ID;const h=(t,l)=>`<!doctype html><html><style>body{font:25px Arial;margin:35px}h1{font-size:34px}p{border-bottom:1px solid #ddd;padding:5px}</style><body><h1>${t}</h1>${l.map(x=>`<p>${x}</p>`).join('')}</body></html>`;(async()=>{const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:700,height:650}});await p.setContent(h('Highway 38 Test Supply Receipt',['Vendor Highway 38 Test Supply','Date 2026-07-14',`Receipt LIVE-${run}`,'Sales Amount 20.00','Fee 1.40','Total 21.40','Payment Method Business Card']));await p.screenshot({path:path.join(out,`receipt-${run}.jpg`),type:'jpeg',quality:60,fullPage:true});await p.setContent(h('Highway 38 Work Order',['Northwoods Sample Customer','Address Grand Rapids MN','Job Number JOB-2026-0001','Work Requested Prepare sample project plan','Assigned Employee Sample Employee','Labor 2 hours','Materials Planning packet','Due Date 2026-07-22','Status Open']));await p.screenshot({path:path.join(out,`work-order-${run}.jpg`),type:'jpeg',quality:60,fullPage:true});await p.setContent(h('Vendor Invoice',['Vendor Highway 38 Test Supply',`Invoice Number VINV-${run}`,'Date 2026-07-14','Due Date 2026-08-13','Terms Net 30','PO Reference PO-2026-0001','Subtotal 50.00','Fee 3.50','Total 53.50']));await p.pdf({path:path.join(out,`vendor-invoice-${run}.pdf`),format:'Letter',printBackground:true});await b.close();const f=(n,m)=>({fileName:n,mimeType:m,base64Data:fs.readFileSync(path.join(out,n)).toString('base64')});fs.writeFileSync(path.join(out,'payload.json'),JSON.stringify({receiptImage:f(`receipt-${run}.jpg`,'image/jpeg'),workOrderImage:f(`work-order-${run}.jpg`,'image/jpeg'),vendorInvoicePdf:f(`vendor-invoice-${run}.pdf`,'application/pdf')}));})().catch(e=>{console.error(e);process.exit(1)});
NODE
node - "$FIX/payload.json" "$OUT/live-request.json" <<'NODE'
const fs=require('fs');fs.writeFileSync(process.argv[3],JSON.stringify({action:'liveAcceptance',payload:JSON.parse(fs.readFileSync(process.argv[2],'utf8'))}));
NODE
cp "$FIX"/* "$OUT/"
post "$APP_URL" "$OUT/live-request.json" "$OUT/live-acceptance.json" > "$OUT/live-response.json"
node - <<'NODE'
const fs=require('fs');const v=JSON.parse(fs.readFileSync('artifacts/business-office-production-v2/live-response.json','utf8'));if(v.status!=='PASS'||v.tests.some(t=>t.status!=='PASS'))throw new Error('LIVE HOLD: '+JSON.stringify(v.tests.filter(t=>t.status!=='PASS')));if(!v.created||!Array.isArray(v.created.pdfFiles)||v.created.pdfFiles.length!==9)throw new Error('Nine live PDFs missing');
NODE

HTTP="$(curl -L -sS -o "$OUT/deployed-ui.html" -w '%{http_code}' "${APP_URL}?bo_token=${TOKEN}&mode=ui")"; test "$HTTP" = 200
node - <<'NODE'
const fs=require('fs'),{chromium}=require('playwright');const html=fs.readFileSync('artifacts/business-office-production-v2/deployed-ui.html','utf8');for(const m of ['Highway 38 Business Office','capture="environment"','@media (max-width:800px)','savedViews'])if(!html.includes(m))throw new Error('Missing UI marker '+m);(async()=>{const b=await chromium.launch({headless:true});for(const [n,w,h] of [['desktop',1440,1000],['mobile',390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});await p.setContent(html);await p.screenshot({path:`artifacts/business-office-production-v2/${n}.png`,fullPage:true})}await b.close()})().catch(e=>{console.error(e);process.exit(1)});
NODE

cd "$APP"; rm -f BusinessOffice_AcceptanceHarness.gs; cp BusinessOffice_Auth.final.gs BusinessOffice_Auth.gs; cp BusinessOffice_Web.final.gs BusinessOffice_Web.gs; cp appsscript.final.json appsscript.json; rm -f BusinessOffice_Auth.final.gs BusinessOffice_Web.final.gs appsscript.final.json; deploy "$APP" 'Highway 38 Business Office Final' app-final; FINAL_APP_DEPLOYMENT="$(cat "$OUT/app-final-deployment-id.txt")"; printf 'https://script.google.com/macros/s/%s/exec' "$FINAL_APP_DEPLOYMENT" > "$OUT/business-office-web-app-url.txt"; clasp delete-deployment "$APP_ACCEPT_ID" --json > "$OUT/app-acceptance-undeploy.json"
cd "$SYNC"; rm -f BusinessOffice_SyncHarness.gs; cp appsscript.final.json appsscript.json; rm -f appsscript.final.json; cp "$ROOT"/apps-script/business-office-sync/BusinessOffice_Sync.gs BusinessOffice_Sync.gs; deploy "$SYNC" 'Highway 38 Business Office Intake Sync Final' sync-final; FINAL_SYNC_DEPLOYMENT="$(cat "$OUT/sync-final-deployment-id.txt")"; clasp delete-deployment "$SYNC_ACCEPT_ID" --json > "$OUT/sync-acceptance-undeploy.json"

cd "$ROOT"; cat > "$OUT/production-deployment.json" <<JSON
{"status":"PASS","sourceCommit":"${GITHUB_SHA}","businessOfficeScriptId":"${APP_ID}","businessOfficeDeploymentId":"${FINAL_APP_DEPLOYMENT}","businessOfficeWebAppUrl":"$(cat "$OUT/business-office-web-app-url.txt")","intakeSyncScriptId":"${SYNC_ID}","intakeSyncDeploymentId":"${FINAL_SYNC_DEPLOYMENT}","spreadsheetId":"${H38_BO_SPREADSHEET_ID}","acceptanceHarnessRemoved":true,"finalExecuteAs":"USER_ACCESSING","externalActionsEnabled":false,"customerActionsOccurred":false,"paymentProcessed":false,"payrollFundsMoved":false,"taxReturnFiled":false}
JSON
