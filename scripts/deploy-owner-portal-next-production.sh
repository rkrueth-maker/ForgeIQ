#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/rkrueth-maker/highway-38-solutions.git"
WORK_ROOT="${HOME}/h38-integrated-business-os-$(date +%Y%m%d-%H%M%S)"
REPO_DIR="${WORK_ROOT}/repo"
SOURCE_DIR="${REPO_DIR}/apps-script/core-engine/owner-portal-next"
PROJECT_DIR="${WORK_ROOT}/bound-project"
BACKUP_DIR="${WORK_ROOT}/backup"

: "${H38_BOUND_SCRIPT_ID:?Set H38_BOUND_SCRIPT_ID to the existing bound Owner Portal Apps Script project ID.}"
: "${H38_EXISTING_DEPLOYMENT_ID:?Set H38_EXISTING_DEPLOYMENT_ID to the existing private Web App deployment ID.}"
: "${H38_PRODUCTION_SPREADSHEET_ID:?Set H38_PRODUCTION_SPREADSHEET_ID to the live Owner Review Portal spreadsheet ID.}"

for command in clasp git node python3; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "STOP — ${command} is not installed."
    exit 1
  fi
done

for value_name in H38_BOUND_SCRIPT_ID H38_EXISTING_DEPLOYMENT_ID H38_PRODUCTION_SPREADSHEET_ID; do
  value="${!value_name}"
  if [[ ! "${value}" =~ ^[A-Za-z0-9_-]{20,}$ ]]; then
    echo "STOP — ${value_name} is not a valid identifier."
    exit 1
  fi
done

mkdir -p "${WORK_ROOT}" "${PROJECT_DIR}" "${BACKUP_DIR}"
git clone --depth 1 "${REPO_URL}" "${REPO_DIR}"
cd "${REPO_DIR}"
git checkout main
git pull --ff-only origin main
node scripts/verify-owner-portal-next.js | tee "${WORK_ROOT}/static-verification.json"

cat > "${PROJECT_DIR}/.clasp.json" <<JSON
{"scriptId":"${H38_BOUND_SCRIPT_ID}","rootDir":"."}
JSON
cat > "${BACKUP_DIR}/.clasp.json" <<JSON
{"scriptId":"${H38_BOUND_SCRIPT_ID}","rootDir":"."}
JSON

cd "${BACKUP_DIR}"
clasp pull

tar -czf "${WORK_ROOT}/bound-project-backup.tar.gz" -C "${BACKUP_DIR}" .
sha256sum "${WORK_ROOT}/bound-project-backup.tar.gz" | tee "${WORK_ROOT}/bound-project-backup.sha256"

rm -f "${PROJECT_DIR}"/*.js "${PROJECT_DIR}"/*.html "${PROJECT_DIR}"/appsscript.json
cp "${SOURCE_DIR}"/*.js "${PROJECT_DIR}/"
cp "${SOURCE_DIR}"/*.html "${PROJECT_DIR}/"
cp "${SOURCE_DIR}/appsscript.json" "${PROJECT_DIR}/"

cd "${PROJECT_DIR}"
clasp list-deployments | tee "${WORK_ROOT}/deployments-before.txt"
grep -F "${H38_EXISTING_DEPLOYMENT_ID}" "${WORK_ROOT}/deployments-before.txt" >/dev/null || {
  echo "STOP — existing deployment ID was not found. No deployment was created."
  exit 1
}

clasp push --force

if clasp update-deployment --help >/dev/null 2>&1; then
  clasp update-deployment "${H38_EXISTING_DEPLOYMENT_ID}" --description "Highway 38 Integrated Business OS"
else
  clasp deploy -i "${H38_EXISTING_DEPLOYMENT_ID}" -d "Highway 38 Integrated Business OS"
fi

clasp list-deployments | tee "${WORK_ROOT}/deployments-after.txt"
grep -F "${H38_EXISTING_DEPLOYMENT_ID}" "${WORK_ROOT}/deployments-after.txt" >/dev/null

cat > "${WORK_ROOT}/required-script-properties.txt" <<PROPERTIES
H38_PORTAL_SPREADSHEET_ID=${H38_PRODUCTION_SPREADSHEET_ID}
H38_PORTAL_ENVIRONMENT=PRODUCTION
H38_PORTAL_LIVE_EXTERNAL_ACTIONS=false
PROPERTIES

WEB_APP_URL="https://script.google.com/macros/s/${H38_EXISTING_DEPLOYMENT_ID}/exec"
printf '%s\n' "${WEB_APP_URL}" | tee "${WORK_ROOT}/web-app-url.txt"

cat <<SUMMARY

============================================
INTEGRATED BUSINESS OS BOUND UPDATE COMPLETE
============================================
Existing bound Apps Script project: ${H38_BOUND_SCRIPT_ID}
Existing private Web App: ${WEB_APP_URL}
Backup: ${WORK_ROOT}/bound-project-backup.tar.gz
Evidence folder: ${WORK_ROOT}

No standalone project was created.
No second deployment was created.
External actions remain disabled.

Confirm the three Script Properties in the existing bound project, then run the portal self-test from Settings.
SUMMARY
