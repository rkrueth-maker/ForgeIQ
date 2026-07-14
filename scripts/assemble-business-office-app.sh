#!/usr/bin/env bash
set -euo pipefail

DESTINATION="${1:?destination directory is required}"
PACK_SOURCE="${2:?business pack Apps Script file is required}"
REPO_ROOT="${3:-${GITHUB_WORKSPACE:-$(cd "$(dirname "$0")/.." && pwd)}}"

[[ -f "$PACK_SOURCE" ]] || { echo "HOLD — business pack not found: $PACK_SOURCE"; exit 2; }
mkdir -p "$DESTINATION"
find "$DESTINATION" -maxdepth 1 -type f \( -name 'BusinessOffice_*' -o -name 'BusinessOffice_Index.html' \) -delete
cp "$REPO_ROOT"/apps-script/business-office/*.gs "$DESTINATION/"
rm -f "$DESTINATION/BusinessOffice_00_Pack.gs" "$DESTINATION/BusinessOffice_Pack.gs"
cp "$PACK_SOURCE" "$DESTINATION/BusinessOffice_00_Pack.gs"
cp "$REPO_ROOT/apps-script/business-office/BusinessOffice_Index.html" "$DESTINATION/"
cp "$REPO_ROOT/apps-script/business-office/appsscript.json" "$DESTINATION/"

PACK_COUNT="$(find "$DESTINATION" -maxdepth 1 -type f -name 'BusinessOffice_*Pack.gs' | wc -l | tr -d ' ')"
[[ "$PACK_COUNT" = "1" ]] || { echo "HOLD — assembled source must contain exactly one business pack, found $PACK_COUNT"; exit 3; }
grep -F 'BO_EMBEDDED_BUSINESS_PACK' "$DESTINATION/BusinessOffice_00_Pack.gs" >/dev/null
printf 'Assembled Business Office with pack %s in %s\n' "$PACK_SOURCE" "$DESTINATION"
