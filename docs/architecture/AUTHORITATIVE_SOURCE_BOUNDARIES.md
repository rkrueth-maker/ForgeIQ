# Authoritative Source Boundaries

This document records the source ownership enforced by `scripts/verify-source-boundaries.js`.

## Shared business-neutral architecture contracts

The following files are the single module and API permission contracts for both Highway 38 production and reusable Business Office installations:

- `apps-script/business-office/BusinessOffice_ModuleContract.gs`
- `apps-script/business-office/BusinessOffice_ActionContract.gs`
- `apps-script/business-office/BusinessOffice_ModuleAccess.gs`

These files contain business-neutral architecture metadata and server-side module gating. Reusable builds may copy these exact files, but may not copy other Highway 38 production sources.

## Highway 38 production deployment

The existing protected unified deployment assembles production from:

- `apps-script/core-engine/owner-portal-next/`
- `apps-script/business-office/`
- `apps-script/business-office-sync/`
- `apps-script/unified-shell/`
- `business-packs/highway38/`

Production deployment is executed only by `.github/workflows/deploy-owner-portal-hard-rule-production.yml` through `scripts/deploy-unified-owner-portal-web.sh`.

The deployment must update the existing Apps Script project and existing deployment IDs. It may not create a replacement project or deployment.

## Reusable Business Office installer

Transferable and clean-install packages are assembled from:

- `packages/`
- `apps/business-office/`
- `business-packs/`
- the three shared business-neutral architecture contracts listed above

Reusable installer code may consume the contracts, but it may not import the Highway 38 portal shell, deployment code, branding, URLs, records, credentials, or production business pack.

The compatibility focused-app catalog in `apps/business-office/BusinessOffice_ModuleRegistry.gs` is packaging metadata only. It may not define schemas, permissions, navigation ownership, dependencies, or runtime lifecycle independently of the canonical module contract.

## Generated outputs

The following are generated evidence or installation outputs, not production source inputs:

- `artifacts/business-office-separation/builds/`
- `artifacts/separate-business-office-platform/builds/`
- `dist/business-office/`

Generated outputs must not be copied into the production Apps Script project.

## Safety boundaries

The source-boundary verification confirms:

- exactly one workflow executes the production deployment script;
- production uses the deterministic unified shell;
- reusable builds use the same canonical module and API permission contracts;
- generated artifacts are not deployment inputs;
- no `clasp create-script` or `clasp create-deployment` command is present in the protected production workflow;
- external actions remain disabled and approval gated.
