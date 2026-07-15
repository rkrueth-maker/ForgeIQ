#!/usr/bin/env bash
set -euo pipefail

ROOT="${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"
SOURCE="$ROOT/scripts/deploy-clean-business-office-installation-v2.sh"
PATCHED="${RUNNER_TEMP:?RUNNER_TEMP is required}/deploy-clean-business-office-installation-v5-runtime.sh"
cp "$SOURCE" "$PATCHED"

python3 - "$PATCHED" <<'PY'
from pathlib import Path
import sys
path=Path(sys.argv[1])
text=path.read_text()
old='''  (cd "$PROJECT" && clasp run boCleanExecute --nondev --params "$params" --json) > "$raw_file"
'''
new='''  local stderr_file="${raw_file%.json}.stderr.txt" exit_code=0
  set +e
  (cd "$PROJECT" && clasp run boCleanExecute --dev --params "$params" --json) > "$raw_file" 2> "$stderr_file"
  exit_code=$?
  set -e
  if [[ "$exit_code" != "0" ]]; then
    cat "$stderr_file" >&2 || true
    return "$exit_code"
  fi
'''
if old not in text:
    raise SystemExit('HOLD — expected non-development clasp execution line was not found.')
text=text.replace(old,new,1)
path.write_text(text)
PY

chmod +x "$PATCHED"
bash "$PATCHED"
