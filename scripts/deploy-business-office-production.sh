#!/usr/bin/env bash
set -euo pipefail
# Production runner: temporary token-protected owner-executed web acceptance, followed by signed-in-user final deployment.
exec bash "${GITHUB_WORKSPACE:?}/scripts/deploy-business-office-web-harness.sh"
