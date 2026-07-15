#!/usr/bin/env bash
set -euo pipefail

ROOT="${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"
SOURCE="$ROOT/scripts/deploy-clean-business-office-installation-v2.sh"
PATCHED="${RUNNER_TEMP:?RUNNER_TEMP is required}/deploy-clean-business-office-installation-v3-runtime.sh"
cp "$SOURCE" "$PATCHED"

python3 - "$PATCHED" <<'PY'
from pathlib import Path
import sys
path=Path(sys.argv[1])
text=path.read_text()
old='''run_action() {
  local action="$1" payload_file="$2" raw_file="$3" result_file="$4" params
  node - "$TOKEN" "$action" "$payload_file" > "$FIXTURES/params-${action}.json" <<'NODE'
const fs=require('fs');
const token=process.argv[2],action=process.argv[3],payloadPath=process.argv[4];
const payload=payloadPath&&fs.existsSync(payloadPath)?JSON.parse(fs.readFileSync(payloadPath,'utf8')):{};
process.stdout.write(JSON.stringify([{token,action,payload}]));
NODE
  params="$(cat "$FIXTURES/params-${action}.json")"
  (cd "$PROJECT" && clasp run boCleanExecute --nondev --params "$params" --json) > "$raw_file"
  node - "$raw_file" "$result_file" <<'NODE'
const fs=require('fs');
const [raw,result]=process.argv.slice(2);
const text=fs.readFileSync(raw,'utf8').trim();
if(!text) throw new Error('Apps Script execution returned no JSON.');
const value=JSON.parse(text);
if(value.error) throw new Error(`${value.error.message||'Apps Script execution failed'} ${JSON.stringify(value.error.details||[])}`);
const response=value.response;
if(!response||response.ok!==true) throw new Error((response&&response.error)||'Clean-install execution returned HOLD.');
fs.writeFileSync(result,JSON.stringify(response.result,null,2)+'\\n');
NODE
}
'''
new='''run_action() {
  local action="$1" payload_file="$2" raw_file="$3" result_file="$4" access_token status
  node - "$TOKEN" "$action" "$payload_file" > "$FIXTURES/request-${action}.json" <<'NODE'
const fs=require('fs');
const token=process.argv[2],action=process.argv[3],payloadPath=process.argv[4];
const payload=payloadPath&&fs.existsSync(payloadPath)?JSON.parse(fs.readFileSync(payloadPath,'utf8')):{};
process.stdout.write(JSON.stringify({function:'boCleanExecute',parameters:[{token,action,payload}],devMode:true}));
NODE
  access_token="$(apps_script_access_token)"
  status="$(curl -sS -o "$raw_file" -w '%{http_code}' -X POST \\
    -H "Authorization: Bearer ${access_token}" \\
    -H 'Content-Type: application/json' \\
    --data-binary "@$FIXTURES/request-${action}.json" \\
    "https://script.googleapis.com/v1/scripts/${SCRIPT_ID}:run" || true)"
  printf '%s' "$status" > "${raw_file}.status"
  test "$status" = "200"
  node - "$raw_file" "$result_file" <<'NODE'
const fs=require('fs');
const [raw,result]=process.argv.slice(2);
const text=fs.readFileSync(raw,'utf8').trim();
if(!text) throw new Error('Apps Script execution returned no JSON.');
const value=JSON.parse(text);
if(value.error) throw new Error(`${value.error.message||'Apps Script execution failed'} ${JSON.stringify(value.error.details||[])}`);
const response=value.response&&Object.prototype.hasOwnProperty.call(value.response,'result')?value.response.result:value.response;
if(!response||response.ok!==true) throw new Error((response&&response.error)||'Clean-install execution returned HOLD.');
fs.writeFileSync(result,JSON.stringify(response.result,null,2)+'\\n');
NODE
}
'''
if old not in text:
    raise SystemExit('HOLD — expected v2 run_action block was not found.')
path.write_text(text.replace(old,new,1))
PY

chmod +x "$PATCHED"
bash "$PATCHED"
