#!/usr/bin/env bash
set -euo pipefail

PAGE="sample-library-now.html"
LIVE_URL="https://rkrueth-maker.github.io/highway-38-solutions/sample-library-now.html"
ALLOW_DIRTY="false"

if [[ "${1:-}" == "--allow-dirty" ]]; then
  ALLOW_DIRTY="true"
fi

MATCHES=(
  "hero-garage-before-after.png?v=v5-no-svg-polish"
  "demo-run-sample-garage-bay.png?v=v5-no-svg-polish"
  "workflow-opportunity-finished.png?v=v5-no-svg-polish"
)

echo "LOCAL"
LOCAL_HEAD="$(git rev-parse HEAD)"
echo "LOCAL HEAD: $LOCAL_HEAD"

git fetch origin main >/dev/null 2>&1 || true
ORIGIN_HEAD="$(git rev-parse origin/main)"
echo "ORIGIN_MAIN"
echo "ORIGIN_MAIN: $ORIGIN_HEAD"

STATUS="$(git status --short --branch)"
echo "$STATUS"

if [[ "$ALLOW_DIRTY" != "true" && -n "$(git status --short)" ]]; then
  echo "Working tree is dirty. Deploy from a clean worktree or clean branch only."
  echo "VERDICT: BLOCKED | Scope Verified: LOCAL"
  exit 1
fi

read -r LEFT RIGHT < <(git rev-list --left-right --count HEAD...origin/main)
if [[ "$ALLOW_DIRTY" != "true" && "$LEFT" != "0" ]]; then
  echo "Local branch has commits not in origin/main."
  echo "VERDICT: BLOCKED | Scope Verified: LOCAL"
  exit 1
fi

if [[ "$ALLOW_DIRTY" != "true" && "$RIGHT" != "0" ]]; then
  echo "Local branch is behind origin/main."
  echo "VERDICT: BLOCKED | Scope Verified: LOCAL"
  exit 1
fi

if [[ ! -f "$PAGE" ]]; then
  echo "Missing local page: $PAGE"
  echo "VERDICT: UNKNOWN | Scope Verified: LOCAL"
  exit 1
fi

echo "ORIGIN_MAIN"
ORIGIN_HTML="$(git show "origin/main:$PAGE")"
for marker in "${MATCHES[@]}"; do
  if ! printf '%s' "$ORIGIN_HTML" | grep -Fq "$marker"; then
    echo "Missing marker in ORIGIN_MAIN: $marker"
    echo "VERDICT: BLOCKED | Scope Verified: ORIGIN_MAIN"
    exit 1
  fi
done

echo "LIVE_PAGES"
TS="$(date +%s)"
LIVE_HTML="$(curl -sSL "${LIVE_URL}?cb=${TS}")"
for marker in "${MATCHES[@]}"; do
  if ! printf '%s' "$LIVE_HTML" | grep -Fq "$marker"; then
    echo "Missing marker in LIVE_PAGES: $marker"
    echo "VERDICT: BLOCKED | Scope Verified: LIVE_PAGES"
    exit 1
  fi
done

if [[ "$ORIGIN_HTML" == "$LIVE_HTML" ]]; then
  echo "LIVE_PAGES matches ORIGIN_MAIN exactly."
  echo "VERDICT: ALREADY_LIVE | Scope Verified: ORIGIN_MAIN+LIVE_PAGES"
else
  echo "Markers verified but full HTML differs between ORIGIN_MAIN and LIVE_PAGES."
  echo "VERDICT: PASS | Scope Verified: ORIGIN_MAIN+LIVE_PAGES"
fi
