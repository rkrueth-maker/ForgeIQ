#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

page=""
live_url=""
skip_fetch=0
markers=()
deploy_cmd=()

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy_with_guard.sh --page <page> --live-url <url> --match <marker> [--match <marker> ...] [--skip-fetch] [-- <deploy command> ...]

Examples:
  scripts/deploy_with_guard.sh \
    --page sample-library-now.html \
    --live-url "https://rkrueth-maker.github.io/highway-38-solutions/sample-library-now.html" \
    --match "hero-garage-before-after.png?v=v5-no-svg-polish" \
    --match "demo-run-sample-garage-bay.png?v=v5-no-svg-polish" \
    --match "workflow-opportunity-finished.png?v=v5-no-svg-polish"

  scripts/deploy_with_guard.sh \
    --page sample-library-now.html \
    --live-url "https://rkrueth-maker.github.io/highway-38-solutions/sample-library-now.html" \
    --match "hero-garage-before-after.png?v=v5-no-svg-polish" \
    --match "demo-run-sample-garage-bay.png?v=v5-no-svg-polish" \
    --match "workflow-opportunity-finished.png?v=v5-no-svg-polish" \
    -- git push origin HEAD:main
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --page)
      page="$2"
      shift 2
      ;;
    --live-url)
      live_url="$2"
      shift 2
      ;;
    --match)
      markers+=("$2")
      shift 2
      ;;
    --skip-fetch)
      skip_fetch=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      deploy_cmd=("$@")
      break
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$page" || -z "$live_url" || ${#markers[@]} -eq 0 ]]; then
  echo "Missing required arguments." >&2
  usage >&2
  exit 1
fi

guard_args=(
  "scripts/guard_deploy.py"
  --page "$page"
  --live-url "$live_url"
)

if [[ $skip_fetch -eq 1 ]]; then
  guard_args+=(--skip-fetch)
fi

for marker in "${markers[@]}"; do
  guard_args+=(--match "$marker")
done

set +e
python3 "${guard_args[@]}"
guard_exit=$?
set -e

if [[ $guard_exit -ne 0 ]]; then
  exit "$guard_exit"
fi

if [[ ${#deploy_cmd[@]} -eq 0 ]]; then
  echo "Preflight passed. No deploy command was provided."
  echo "Run this script with -- <deploy command> if you want it executed after the guard passes."
  exit 0
fi

echo "Preflight passed. Running deploy command: ${deploy_cmd[*]}"
exec "${deploy_cmd[@]}"
