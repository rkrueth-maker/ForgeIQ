#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"
WORK="${RUNNER_TEMP:?RUNNER_TEMP is required}/h38-unified-owner-portal"
BACKUP="$WORK/backup"
PROJECT="$WORK/project"
EVIDENCE="$REPO_ROOT/artifacts/unified-owner-portal"

OWNER_SCRIPT_ID="13Bes6_rs3LD-Sch4Vi5DKssCnlU_qb4hzZpGpDVfoRELRak0htXEj7O-"
OWNER_DEPLOYMENT_ID="AKfycbzr0hoImRF4iQ1gR90Cr17juP8PODkEWRorXxW6qralEYTGLhOU33E1wYEPU_3duQKpQg"
BUSINESS_OFFICE_DEPLOYMENT_ID="AKfycbyf9ivM04iKqg9QqM1PgRQgD4Imf6VY_mMpCLLsU6lRbGYsprTEEzlwEE93pRgqPzCcmg"

rm -rf "$WORK" "$EVIDENCE"
mkdir -p "$BACKUP" "$PROJECT" "$EVIDENCE"

printf '{"scriptId":"%s","rootDir":"."}\n' "$OWNER_SCRIPT_ID" > "$BACKUP/.clasp.json"
printf '{"scriptId":"%s","rootDir":"."}\n' "$OWNER_SCRIPT_ID" > "$PROJECT/.clasp.json"

# Preserve the exact current Apps Script project before any source update.
(
  cd "$BACKUP"
  clasp pull
) 2>&1 | tee "$EVIDENCE/project-pull.txt"
tar -czf "$EVIDENCE/project-before.tar.gz" -C "$BACKUP" .
sha256sum "$EVIDENCE/project-before.tar.gz" | tee "$EVIDENCE/project-before.sha256"
(
  cd "$BACKUP"
  clasp list-deployments
) 2>&1 | tee "$EVIDENCE/deployments-before.txt"
grep -F "$OWNER_DEPLOYMENT_ID" "$EVIDENCE/deployments-before.txt" >/dev/null
grep -F "$BUSINESS_OFFICE_DEPLOYMENT_ID" "$EVIDENCE/deployments-before.txt" >/dev/null

# Start from the authorized project so unrelated bound-project files remain intact.
cp -a "$BACKUP/." "$PROJECT/"
printf '{"scriptId":"%s","rootDir":"."}\n' "$OWNER_SCRIPT_ID" > "$PROJECT/.clasp.json"

# Remove only controlled portal modules, including clasp's .js representation of .gs files.
find "$PROJECT" -maxdepth 1 -type f \( \
  -name 'Portal_*' -o \
  -name 'BusinessOffice_*' -o \
  -name 'BusinessOffice_Index.html' \
\) -delete

cp "$REPO_ROOT"/apps-script/core-engine/owner-portal-next/*.js "$PROJECT/"
cp "$REPO_ROOT"/apps-script/core-engine/owner-portal-next/*.html "$PROJECT/"
cp "$REPO_ROOT"/apps-script/business-office/*.gs "$PROJECT/"
cp "$REPO_ROOT/apps-script/business-office/BusinessOffice_Index.html" "$PROJECT/"
cp "$REPO_ROOT/apps-script/business-office-sync/BusinessOffice_Sync.gs" "$PROJECT/"

# Create one router and allow both authenticated apps to render inside portal.html.
python3 - "$PROJECT/Portal_Services.js" "$PROJECT/BusinessOffice_Web.gs" <<'PY'
from pathlib import Path
import sys

portal = Path(sys.argv[1])
business = Path(sys.argv[2])

portal_text = portal.read_text()
portal_needle = "function doGet(e) {\n  h38PortalAssertOwner_();"
portal_replacement = "function doGet(e) {\n  if (e && e.parameter && e.parameter.app === 'business-office') {\n    boGetCurrentUser_();\n    return boRenderWebApp_();\n  }\n  h38PortalAssertOwner_();"
if portal_needle not in portal_text:
    raise SystemExit('Owner Portal doGet router marker not found')
portal_text = portal_text.replace(portal_needle, portal_replacement, 1)
portal_render = ".setTitle(H38_PORTAL_NEXT.APP_NAME).setSandboxMode(HtmlService.SandboxMode.IFRAME);"
portal_embed = ".setTitle(H38_PORTAL_NEXT.APP_NAME).setSandboxMode(HtmlService.SandboxMode.IFRAME).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);"
if portal_render not in portal_text:
    raise SystemExit('Owner Portal render marker not found')
portal.write_text(portal_text.replace(portal_render, portal_embed, 1))

business_text = business.read_text()
if 'function doGet() {' in business_text:
    business_text = business_text.replace('function doGet() {', 'function boBusinessOfficeDoGet_() {', 1)
if '.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)' not in business_text:
    business_text = business_text.replace(
        '.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT)',
        '.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)',
        1,
    )
if '.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)' not in business_text:
    raise SystemExit('Business Office embedding boundary is missing')
business.write_text(business_text)
PY

# Merge the Owner Portal manifest with Business Office scopes/services and preserve user authentication.
node - "$PROJECT/appsscript.json" "$REPO_ROOT/apps-script/business-office/appsscript.json" <<'NODE'
const fs = require('fs');
const target = process.argv[2];
const businessPath = process.argv[3];
const base = JSON.parse(fs.readFileSync(target, 'utf8'));
const business = JSON.parse(fs.readFileSync(businessPath, 'utf8'));
base.runtimeVersion = 'V8';
base.exceptionLogging = 'STACKDRIVER';
base.oauthScopes = [...new Set([...(base.oauthScopes || []), ...(business.oauthScopes || [])])];
base.dependencies = base.dependencies || {};
const services = [...(base.dependencies.enabledAdvancedServices || [])];
for (const service of (((business.dependencies || {}).enabledAdvancedServices) || [])) {
  if (!services.some(item => item.serviceId === service.serviceId)) services.push(service);
}
base.dependencies.enabledAdvancedServices = services;
base.webapp = { executeAs: 'USER_ACCESSING', access: 'ANYONE' };
base.executionApi = { access: 'ANYONE' };
fs.writeFileSync(target, JSON.stringify(base, null, 2) + '\n');
NODE

# Ensure no duplicate Apps Script base names can be pushed.
node - "$PROJECT" <<'NODE'
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const controlled = fs.readdirSync(root).filter(name => /^(Portal_|BusinessOffice_)/.test(name));
const seen = new Map();
for (const name of controlled) {
  const base = name.replace(/\.(?:js|gs|html)$/i, '');
  if (seen.has(base)) throw new Error(`Duplicate Apps Script file base name: ${base} (${seen.get(base)}, ${name})`);
  seen.set(base, name);
}
console.log(`Unified source contains ${controlled.length} controlled portal files with unique names.`);
NODE

grep -F "e.parameter.app === 'business-office'" "$PROJECT/Portal_Services.js" >/dev/null
grep -F "HtmlService.XFrameOptionsMode.ALLOWALL" "$PROJECT/Portal_Services.js" >/dev/null
grep -F "HtmlService.XFrameOptionsMode.ALLOWALL" "$PROJECT/BusinessOffice_Web.gs" >/dev/null

(
  cd "$PROJECT"
  clasp push --force
) 2>&1 | tee "$EVIDENCE/clasp-push.txt"

# Update both existing deployment IDs in place. No new project or deployment is created.
(
  cd "$PROJECT"
  clasp deploy -i "$OWNER_DEPLOYMENT_ID" -d "Highway 38 unified embedded Owner Portal ${GITHUB_SHA}"
  clasp deploy -i "$BUSINESS_OFFICE_DEPLOYMENT_ID" -d "Highway 38 unified embedded Business Office ${GITHUB_SHA}"
  clasp list-deployments
) 2>&1 | tee "$EVIDENCE/deployments-after.txt"
grep -F "$OWNER_DEPLOYMENT_ID" "$EVIDENCE/deployments-after.txt" >/dev/null
grep -F "$BUSINESS_OFFICE_DEPLOYMENT_ID" "$EVIDENCE/deployments-after.txt" >/dev/null

OWNER_URL="https://script.google.com/macros/s/${OWNER_DEPLOYMENT_ID}/exec"
BUSINESS_URL="https://script.google.com/macros/s/${BUSINESS_OFFICE_DEPLOYMENT_ID}/exec?app=business-office"
printf '%s' "$OWNER_URL" > "$EVIDENCE/owner-portal-url.txt"
printf '%s' "$BUSINESS_URL" > "$EVIDENCE/business-office-url.txt"

OWNER_STATUS="$(curl -L -sS -o "$EVIDENCE/owner-response.html" -w '%{http_code}' "$OWNER_URL" || true)"
BUSINESS_STATUS="$(curl -L -sS -o "$EVIDENCE/business-response.html" -w '%{http_code}' "$BUSINESS_URL" || true)"
printf '%s' "$OWNER_STATUS" > "$EVIDENCE/owner-http-status.txt"
printf '%s' "$BUSINESS_STATUS" > "$EVIDENCE/business-http-status.txt"
test "$OWNER_STATUS" != "404"
test "$BUSINESS_STATUS" != "404"

cat > "$EVIDENCE/deployment-result.json" <<JSON
{
  "status": "PASS",
  "sourceCommit": "${GITHUB_SHA}",
  "scriptId": "${OWNER_SCRIPT_ID}",
  "ownerPortalDeploymentId": "${OWNER_DEPLOYMENT_ID}",
  "businessOfficeDeploymentId": "${BUSINESS_OFFICE_DEPLOYMENT_ID}",
  "ownerPortalUrl": "${OWNER_URL}",
  "businessOfficeUrl": "${BUSINESS_URL}",
  "websitePortalUrl": "https://rkrueth-maker.github.io/highway-38-solutions/portal.html",
  "updatedExistingDeployments": true,
  "createdNewProject": false,
  "createdNewDeployment": false,
  "embeddedOwnerPortal": true,
  "embeddedBusinessOffice": true,
  "googleAuthenticationRequired": true,
  "externalActionsEnabled": false,
  "externalActionsOccurred": false
}
JSON
cat "$EVIDENCE/deployment-result.json"
