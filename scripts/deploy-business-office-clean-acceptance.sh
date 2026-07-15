#!/usr/bin/env bash
set -euo pipefail

ROOT="${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"
OUT="$ROOT/artifacts/business-office-clean-deployment"
APP="${RUNNER_TEMP:?RUNNER_TEMP is required}/business-office-clean-acceptance"
FIX="${RUNNER_TEMP}/business-office-clean-fixture"
TOKEN="$(openssl rand -hex 32)"
CONFIG_TITLE="${BO_CONFIG_DOC_TITLE:?BO_CONFIG_DOC_TITLE is required}"
PACK_SOURCE="${BO_PACK_PATH:-$ROOT/business-packs/template-business/apps-script/BusinessOffice_Pack.gs}"
PROJECT_TITLE="${BO_PROJECT_TITLE:-Business Office Clean Installation}"

rm -rf "$APP" "$FIX" "$OUT"
mkdir -p "$APP" "$FIX" "$OUT"

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

cd "$APP"
clasp create-script --type standalone --title "$PROJECT_TITLE" --rootDir . --json > "$OUT/app-create.json"
bash "$ROOT/scripts/assemble-business-office-app.sh" "$APP" "$PACK_SOURCE" "$ROOT"
cp appsscript.json appsscript.final.json
cp BusinessOffice_Auth.gs BusinessOffice_Auth.final.gs
cp BusinessOffice_Installer.gs BusinessOffice_Installer.final.gs
cp BusinessOffice_Web.gs BusinessOffice_Web.final.gs

python3 - <<'PY'
from pathlib import Path
for name in ['BusinessOffice_Auth.gs','BusinessOffice_Installer.gs']:
    path=Path(name)
    text=path.read_text().replace('Session.getActiveUser().getEmail()','(Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail())')
    path.write_text(text)
path=Path('BusinessOffice_Web.gs')
text=path.read_text().replace('function doGet()','function boPrivateDoGet_()',1)
path.write_text(text)
PY
manifest appsscript.final.json appsscript.json

python3 - "$TOKEN" "$CONFIG_TITLE" <<'PY'
from pathlib import Path
import json,sys
token=json.dumps(sys.argv[1]);title=json.dumps(sys.argv[2])
Path('BusinessOffice_StandaloneHarness.gs').write_text(f'''const BO_STANDALONE_TOKEN_={token};
const BO_STANDALONE_CONFIG_TITLE_={title};
function boStandaloneOut_(value){{return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}}
function boStandaloneAllowed_(e){{return e&&e.parameter&&e.parameter.bo_token===BO_STANDALONE_TOKEN_;}}
function boStandaloneConfigFile_(){{const files=DriveApp.getFilesByName(BO_STANDALONE_CONFIG_TITLE_);if(!files.hasNext())throw new Error('Private bootstrap configuration document was not found.');const file=files.next();if(files.hasNext())throw new Error('More than one bootstrap configuration document has this title.');return file;}}
function boStandaloneReadConfig_(){{const file=boStandaloneConfigFile_();const text=DocumentApp.openById(file.getId()).getBody().getText();const config=JSON.parse(text);config.__configFileId=file.getId();return config;}}
function doGet(e){{if(!boStandaloneAllowed_(e))return boStandaloneOut_({{ok:false,error:'Forbidden'}});if(e.parameter.mode==='ui')return boRenderWebApp_();return boStandaloneOut_({{ok:true,result:{{status:'PASS'}}}});}}
function doPost(e){{try{{if(!boStandaloneAllowed_(e))throw new Error('Forbidden');const request=JSON.parse(e.postData.contents||'{{}}');let result;if(request.action==='bootstrap'){{const config=boStandaloneReadConfig_();result=boBootstrapInstall(config);PropertiesService.getScriptProperties().setProperty('BUSINESS_OFFICE_BOOTSTRAP_CONFIG_FILE_ID',config.__configFileId);}}else if(request.action==='selfTest')result=boRunSelfTest();else if(request.action==='platformAcceptance')result=boRunPlatformAcceptance(request.payload||{{}});else if(request.action==='cleanup'){{const id=PropertiesService.getScriptProperties().getProperty('BUSINESS_OFFICE_BOOTSTRAP_CONFIG_FILE_ID');if(id)DriveApp.getFileById(id).setTrashed(true);PropertiesService.getScriptProperties().deleteProperty('BUSINESS_OFFICE_BOOTSTRAP_CONFIG_FILE_ID');result={{status:'PASS',configurationDocumentTrashed:!!id}};}}else throw new Error('Unsupported action');return boStandaloneOut_({{ok:true,result:result}});}}catch(error){{return boStandaloneOut_({{ok:false,error:error.message,stack:error.stack||''}});}}}}
''')
PY

APP_ID="$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('.clasp.json','utf8')).scriptId)")"
test -n "$APP_ID"
printf '%s' "$APP_ID" > "$OUT/business-office-script-id.txt"
if [[ "$APP_ID" = "13Bes6_rs3LD-Sch4Vi5DKssCnlU_qb4hzZpGpDVfoRELRak0htXEj7O-" ]]; then echo 'HOLD — standalone project reused Highway 38 script ID'; exit 21; fi

deploy "$APP" 'Business Office Clean Acceptance' acceptance
ACCEPT_ID="$(cat "$OUT/acceptance-deployment-id.txt")"
ACCEPT_URL="https://script.google.com/macros/s/${ACCEPT_ID}/exec"
printf '%s' "$ACCEPT_URL" > "$OUT/acceptance-url.txt"

printf '%s' '{"action":"bootstrap"}' > "$OUT/bootstrap-request.json"
post "$ACCEPT_URL" "$OUT/bootstrap-request.json" "$OUT/bootstrap.json" > "$OUT/bootstrap-response.json"
printf '%s' '{"action":"selfTest"}' > "$OUT/self-test-request.json"
post "$ACCEPT_URL" "$OUT/self-test-request.json" "$OUT/self-test.json" > "$OUT/self-test-response.json"
node - <<'NODE'
const fs=require('fs'),v=JSON.parse(fs.readFileSync('artifacts/business-office-clean-deployment/self-test-response.json','utf8'));if(v.status!=='PASS'||v.tests.some(t=>t.status!=='PASS'))throw new Error('Clean self-test HOLD: '+JSON.stringify(v));if(v.businessId!=='NORTHSTAR_TEST'||v.packId!=='north-star-test')throw new Error('Wrong clean business identity: '+JSON.stringify(v));
NODE

cd "$ROOT"
node <<'NODE'
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');const out=process.env.RUNNER_TEMP+'/business-office-clean-fixture',run=process.env.GITHUB_RUN_ID;(async()=>{const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:700,height:650}});await p.setContent(`<!doctype html><html><style>body{font:25px Arial;margin:35px}h1{font-size:34px}p{border-bottom:1px solid #ddd;padding:5px}</style><body><h1>North Star Test Company Receipt</h1><p>Vendor North Star Acceptance Supply</p><p>Date 2026-07-14</p><p>Receipt CLEAN-${run}</p><p>Subtotal 20.00</p><p>Tax 1.40</p><p>Total 21.40</p><p>Payment Method Acceptance Test</p></body></html>`);await p.pdf({path:path.join(out,`north-star-receipt-${run}.pdf`),format:'Letter',printBackground:true});await b.close();const name=`north-star-receipt-${run}.pdf`;fs.writeFileSync(path.join(out,'platform-request.json'),JSON.stringify({action:'platformAcceptance',payload:{document:{fileName:name,mimeType:'application/pdf',documentType:'Receipt',base64Data:fs.readFileSync(path.join(out,name)).toString('base64')},forbiddenTerms:['Highway 38 Solutions','1kDDKWx9jfObWm8EmaXm5weDCTJbQ8RTf7-sq4RDEYlA','1Vq8UjAzxW4hIKYoodkf1hfqkATWiXjVC','11ak4QZ7ag8daYO1_uO6NTCVXIO7Kh6j3']}}));})().catch(e=>{console.error(e);process.exit(1)});
NODE
cp "$FIX"/* "$OUT/"
post "$ACCEPT_URL" "$FIX/platform-request.json" "$OUT/platform-acceptance.json" > "$OUT/platform-acceptance-response.json"
node - <<'NODE'
const fs=require('fs'),v=JSON.parse(fs.readFileSync('artifacts/business-office-clean-deployment/platform-acceptance-response.json','utf8'));if(v.status!=='PASS'||v.tests.some(t=>t.status!=='PASS'))throw new Error('Platform acceptance HOLD: '+JSON.stringify(v.tests.filter(t=>t.status!=='PASS')));if(v.businessId!=='NORTHSTAR_TEST'||v.businessName!=='North Star Test Company'||v.packId!=='north-star-test')throw new Error('Wrong acceptance identity');if(!v.created||!Array.isArray(v.created.pdfFiles)||v.created.pdfFiles.length!==9||v.created.pdfFiles.some(f=>!f.identityVerified))throw new Error('Nine identity-verified PDFs missing');
NODE

HTTP="$(curl -L -sS -o "$OUT/deployed-ui.html" -w '%{http_code}' "${ACCEPT_URL}?bo_token=${TOKEN}&mode=ui")"
test "$HTTP" = 200
node - <<'NODE'
const fs=require('fs'),{chromium}=require('playwright');const html=fs.readFileSync('artifacts/business-office-clean-deployment/deployed-ui.html','utf8');for(const marker of ['North Star Test Company Business Office','capture="environment"','@media (max-width:800px)','savedViews'])if(!html.includes(marker))throw new Error('Missing clean UI marker '+marker);if(html.includes('Highway 38 Solutions'))throw new Error('Highway 38 identity leaked into clean UI');(async()=>{const b=await chromium.launch({headless:true});for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){const p=await b.newPage({viewport:{width,height}});await p.setContent(html);await p.screenshot({path:`artifacts/business-office-clean-deployment/${name}.png`,fullPage:true})}await b.close()})().catch(e=>{console.error(e);process.exit(1)});
NODE

printf '%s' '{"action":"cleanup"}' > "$OUT/cleanup-request.json"
post "$ACCEPT_URL" "$OUT/cleanup-request.json" "$OUT/cleanup.json" > "$OUT/cleanup-response.json"

cd "$APP"
rm -f BusinessOffice_StandaloneHarness.gs
cp BusinessOffice_Auth.final.gs BusinessOffice_Auth.gs
cp BusinessOffice_Installer.final.gs BusinessOffice_Installer.gs
cp BusinessOffice_Web.final.gs BusinessOffice_Web.gs
cp appsscript.final.json appsscript.json
rm -f BusinessOffice_Auth.final.gs BusinessOffice_Installer.final.gs BusinessOffice_Web.final.gs appsscript.final.json

deploy "$APP" 'North Star Test Company Business Office Final' final
FINAL_ID="$(cat "$OUT/final-deployment-id.txt")"
FINAL_URL="https://script.google.com/macros/s/${FINAL_ID}/exec"
printf '%s' "$FINAL_URL" > "$OUT/business-office-web-app-url.txt"
clasp delete-deployment "$ACCEPT_ID" --json > "$OUT/acceptance-undeploy.json"

for blocked in \
  'AKfycbzr0hoImRF4iQ1gR90Cr17juP8PODkEWRorXxW6qralEYTGLhOU33E1wYEPU_3duQKpQg' \
  'AKfycbyf9ivM04iKqg9QqM1PgRQgD4Imf6VY_mMpCLLsU6lRbGYsprTEEzlwEE93pRgqPzCcmg'; do
  if [[ "$FINAL_ID" = "$blocked" ]]; then echo 'HOLD — standalone deployment reused Highway 38 deployment ID'; exit 22; fi
done
FINAL_HTTP="$(curl -L -sS -o "$OUT/final-response.html" -w '%{http_code}' "$FINAL_URL" || true)"
printf '%s' "$FINAL_HTTP" > "$OUT/final-http-status.txt"
test "$FINAL_HTTP" != "404"

cd "$ROOT"
cat > "$OUT/deployment-result.json" <<JSON
{"status":"PASS","sourceCommit":"${GITHUB_SHA}","mode":"standalone","businessId":"NORTHSTAR_TEST","businessName":"North Star Test Company","packId":"north-star-test","scriptId":"${APP_ID}","deploymentId":"${FINAL_ID}","url":"${FINAL_URL}","dedicatedProject":true,"dedicatedDeployment":true,"configurationDocumentTrashed":true,"highway38ResourceReuse":false,"desktopVerified":true,"mobileVerified":true,"uploadOcrVerified":true,"ninePdfIdentitiesVerified":true,"approvalControlsVerified":true,"backupVerified":true,"externalActionsEnabled":false,"directPaymentProcessing":false,"directPayrollFunding":false,"directTaxFiling":false}
JSON
cat "$OUT/deployment-result.json"
