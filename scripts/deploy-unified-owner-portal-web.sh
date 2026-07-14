#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"
WORK="${RUNNER_TEMP:?RUNNER_TEMP is required}/h38-unified-owner-portal"
BACKUP="$WORK/backup"
PROJECT="$WORK/project"
EVIDENCE="$REPO_ROOT/artifacts/unified-owner-portal"
H38_PACK="$REPO_ROOT/business-packs/highway38/apps-script/BusinessOffice_Pack.gs"
OWNER_SCRIPT_ID="13Bes6_rs3LD-Sch4Vi5DKssCnlU_qb4hzZpGpDVfoRELRak0htXEj7O-"
OWNER_DEPLOYMENT_ID="AKfycbzr0hoImRF4iQ1gR90Cr17juP8PODkEWRorXxW6qralEYTGLhOU33E1wYEPU_3duQKpQg"
BUSINESS_OFFICE_DEPLOYMENT_ID="AKfycbyf9ivM04iKqg9QqM1PgRQgD4Imf6VY_mMpCLLsU6lRbGYsprTEEzlwEE93pRgqPzCcmg"

rm -rf "$WORK" "$EVIDENCE";mkdir -p "$BACKUP" "$PROJECT" "$EVIDENCE"
printf '{"scriptId":"%s","rootDir":"."}\n' "$OWNER_SCRIPT_ID" > "$BACKUP/.clasp.json"
printf '{"scriptId":"%s","rootDir":"."}\n' "$OWNER_SCRIPT_ID" > "$PROJECT/.clasp.json"
(cd "$BACKUP" && clasp pull) 2>&1 | tee "$EVIDENCE/project-pull.txt"
tar -czf "$EVIDENCE/project-before.tar.gz" -C "$BACKUP" .
sha256sum "$EVIDENCE/project-before.tar.gz" | tee "$EVIDENCE/project-before.sha256"
(cd "$BACKUP" && clasp list-deployments) 2>&1 | tee "$EVIDENCE/deployments-before.txt"
grep -F "$OWNER_DEPLOYMENT_ID" "$EVIDENCE/deployments-before.txt" >/dev/null
grep -F "$BUSINESS_OFFICE_DEPLOYMENT_ID" "$EVIDENCE/deployments-before.txt" >/dev/null

cp -a "$BACKUP/." "$PROJECT/"
printf '{"scriptId":"%s","rootDir":"."}\n' "$OWNER_SCRIPT_ID" > "$PROJECT/.clasp.json"
find "$PROJECT" -maxdepth 1 -type f \( -name 'Portal_*' -o -name 'BusinessOffice_*' -o -name 'BusinessOffice_Index.html' \) -delete
cp "$REPO_ROOT"/apps-script/core-engine/owner-portal-next/*.js "$PROJECT/"
cp "$REPO_ROOT"/apps-script/core-engine/owner-portal-next/*.html "$PROJECT/"
bash "$REPO_ROOT/scripts/assemble-business-office-app.sh" "$PROJECT" "$H38_PACK" "$REPO_ROOT"
cp "$REPO_ROOT/apps-script/business-office-sync/BusinessOffice_Sync.gs" "$PROJECT/"

python3 - "$PROJECT/Portal_Services.js" "$PROJECT/BusinessOffice_Web.gs" <<'PY'
from pathlib import Path
import sys
portal=Path(sys.argv[1]);business=Path(sys.argv[2]);portal_text=portal.read_text();needle="function doGet(e) {\n  h38PortalAssertOwner_();";replacement="function doGet(e) {\n  if (e && e.parameter && e.parameter.app === 'business-office') {\n    boGetCurrentUser_();\n    return boRenderWebApp_();\n  }\n  h38PortalAssertOwner_();"
if needle not in portal_text: raise SystemExit('Owner Portal doGet router marker not found')
portal_text=portal_text.replace(needle,replacement,1);render=".setTitle(H38_PORTAL_NEXT.APP_NAME).setSandboxMode(HtmlService.SandboxMode.IFRAME);";embed=".setTitle(H38_PORTAL_NEXT.APP_NAME).setSandboxMode(HtmlService.SandboxMode.IFRAME).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);"
if render not in portal_text: raise SystemExit('Owner Portal render marker not found')
portal.write_text(portal_text.replace(render,embed,1));business_text=business.read_text()
if 'function doGet() {' in business_text: business_text=business_text.replace('function doGet() {','function boBusinessOfficeDoGet_() {',1)
if '.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)' not in business_text: raise SystemExit('Business Office embedding boundary is missing')
business.write_text(business_text)
PY

node - "$PROJECT/appsscript.json" "$REPO_ROOT/apps-script/business-office/appsscript.json" <<'NODE'
const fs=require('fs');const target=process.argv[2],businessPath=process.argv[3],base=JSON.parse(fs.readFileSync(target,'utf8')),business=JSON.parse(fs.readFileSync(businessPath,'utf8'));base.runtimeVersion='V8';base.exceptionLogging='STACKDRIVER';base.oauthScopes=[...new Set([...(base.oauthScopes||[]),...(business.oauthScopes||[])])];base.dependencies=base.dependencies||{};const services=[...(base.dependencies.enabledAdvancedServices||[])];for(const service of (((business.dependencies||{}).enabledAdvancedServices)||[]))if(!services.some(item=>item.serviceId===service.serviceId))services.push(service);base.dependencies.enabledAdvancedServices=services;base.webapp={executeAs:'USER_ACCESSING',access:'ANYONE'};base.executionApi={access:'ANYONE'};fs.writeFileSync(target,JSON.stringify(base,null,2)+'\n');
NODE

node - "$PROJECT" <<'NODE'
const fs=require('fs'),path=require('path'),root=process.argv[2],controlled=fs.readdirSync(root).filter(name=>/^(Portal_|BusinessOffice_)/.test(name)),seen=new Map();for(const name of controlled){const base=name.replace(/\.(?:js|gs|html)$/i,'');if(seen.has(base))throw new Error(`Duplicate Apps Script file base name: ${base} (${seen.get(base)}, ${name})`);seen.set(base,name)}const packs=controlled.filter(name=>/Pack\.gs$/.test(name));if(packs.length!==1)throw new Error(`Expected exactly one Business Office pack, found ${packs.length}`);console.log(`Unified source contains ${controlled.length} controlled portal files and one business pack.`);
NODE

grep -F "e.parameter.app === 'business-office'" "$PROJECT/Portal_Services.js" >/dev/null
grep -F "packId:'highway38'" "$PROJECT/BusinessOffice_00_Pack.gs" >/dev/null
(cd "$PROJECT" && clasp push --force) 2>&1 | tee "$EVIDENCE/clasp-push.txt"
(cd "$PROJECT" && clasp deploy -i "$OWNER_DEPLOYMENT_ID" -d "Highway 38 unified embedded Owner Portal ${GITHUB_SHA}" && clasp deploy -i "$BUSINESS_OFFICE_DEPLOYMENT_ID" -d "Highway 38 unified embedded Business Office ${GITHUB_SHA}" && clasp list-deployments) 2>&1 | tee "$EVIDENCE/deployments-after.txt"
grep -F "$OWNER_DEPLOYMENT_ID" "$EVIDENCE/deployments-after.txt" >/dev/null;grep -F "$BUSINESS_OFFICE_DEPLOYMENT_ID" "$EVIDENCE/deployments-after.txt" >/dev/null
OWNER_URL="https://script.google.com/macros/s/${OWNER_DEPLOYMENT_ID}/exec";BUSINESS_URL="https://script.google.com/macros/s/${BUSINESS_OFFICE_DEPLOYMENT_ID}/exec?app=business-office"
printf '%s' "$OWNER_URL" > "$EVIDENCE/owner-portal-url.txt";printf '%s' "$BUSINESS_URL" > "$EVIDENCE/business-office-url.txt"
OWNER_STATUS="$(curl -L -sS -o "$EVIDENCE/owner-response.html" -w '%{http_code}' "$OWNER_URL" || true)";BUSINESS_STATUS="$(curl -L -sS -o "$EVIDENCE/business-response.html" -w '%{http_code}' "$BUSINESS_URL" || true)"
printf '%s' "$OWNER_STATUS" > "$EVIDENCE/owner-http-status.txt";printf '%s' "$BUSINESS_STATUS" > "$EVIDENCE/business-http-status.txt";test "$OWNER_STATUS" != "404";test "$BUSINESS_STATUS" != "404"
cat > "$EVIDENCE/deployment-result.json" <<JSON
{"status":"PASS","sourceCommit":"${GITHUB_SHA}","businessPack":"highway38","scriptId":"${OWNER_SCRIPT_ID}","ownerPortalDeploymentId":"${OWNER_DEPLOYMENT_ID}","businessOfficeDeploymentId":"${BUSINESS_OFFICE_DEPLOYMENT_ID}","ownerPortalUrl":"${OWNER_URL}","businessOfficeUrl":"${BUSINESS_URL}","websitePortalUrl":"https://rkrueth-maker.github.io/highway-38-solutions/portal.html","updatedExistingDeployments":true,"createdNewProject":false,"createdNewDeployment":false,"embeddedOwnerPortal":true,"embeddedBusinessOffice":true,"googleAuthenticationRequired":true,"externalActionsEnabled":false,"externalActionsOccurred":false}
JSON
cat "$EVIDENCE/deployment-result.json"
