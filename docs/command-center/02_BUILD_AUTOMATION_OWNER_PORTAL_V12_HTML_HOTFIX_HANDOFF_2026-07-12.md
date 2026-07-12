# Command Center Addendum — Owner Portal Version 12 HTML Include Hotfix

**Date:** July 12, 2026  
**From:** 02 — Build & Automation  
**To:** 01 — Command Center  
**Primary workstream:** Issue #33  
**Parent launch authority:** Issue #31

## Incident

After the hard-rule Owner Portal was deployed, opening the existing private Web App produced an Apps Script exception:

`Exception: Malformed HTML content`

The exception identified `Portal_Experience` and displayed the raw Workspace client functions instead of rendering the portal.

## Root cause

The portal shell included JavaScript fragments through `HtmlService.createHtmlOutputFromFile(fileName).getContent()`.

Those fragments intentionally contain JavaScript template literals with HTML markup. Apps Script attempted to parse each raw JavaScript fragment as a standalone HTML document before inserting it into `Portal_Index`, causing the malformed-content exception.

## Correction

PR #66 changed the portal to use an allowlisted raw-fragment helper:

`HtmlService.createTemplateFromFile(fileName).getRawContent()`

It also added a regression verifier that requires:

- the raw include helper;
- the allowlist;
- raw-content loading for styles and all three client fragments;
- removal of the parsed HtmlOutput include path from the portal shell;
- the original HTML-template-literal regression fixture.

PR #66 merge commit:

`bd5ce578b12fbddaf54124e08f1a8b0c1c7db69e`

All required PR checks passed.

## Deployment-control correction

The first automated hotfix run pushed the corrected project source but its deployment evidence did not prove the Web App version advanced. That result was not accepted as final runtime deployment proof.

PR #67 hardened the deployment workflow to:

1. pull and archive the existing bound project;
2. push the exact merged source;
3. create an explicit immutable Apps Script version;
4. require the new version number to exceed the previous version;
5. update the existing deployment ID to that exact version;
6. fail unless `clasp list-deployments` confirms the new version after the update.

PR #67 merge and deployed source commit:

`f72463f3554377c02250d13696bc8949d76d634c`

## Verified production result

Workflow:

`Deploy Owner Portal HTML Include Hotfix`

Run ID:

`29210844902`

Job ID:

`86698180461`

Result:

`SUCCESS`

Existing bound Apps Script project:

`13Bes6_rs3LD-Sch4Vi5DKssCnlU_qb4hzZpGpDVfoRELRak0htXEj7O-`

Existing private deployment ID:

`AKfycbzr0hoImRF4iQ1gR90Cr17juP8PODkEWRorXxW6qralEYTGLhOU33E1wYEPU_3duQKpQg`

Existing private Web App URL:

`https://script.google.com/macros/s/AKfycbzr0hoImRF4iQ1gR90Cr17juP8PODkEWRorXxW6qralEYTGLhOU33E1wYEPU_3duQKpQg/exec`

Deployment evidence confirms:

- previous version: `11`;
- current version: `12`;
- existing deployment ID preserved;
- no new Apps Script project;
- no second Web App deployment;
- external actions disabled;
- no external action occurred.

## Rollback evidence

Backup SHA-256:

`9030d0eae1b8b5311b8e7c41647fa82ad07dc408e1cb1124b763b5b41a3f9af3`

Workflow artifact:

`owner-portal-html-hotfix-29210844902`

Artifact digest:

`sha256:c775bfdd9d99007c52b29118d0b6bb601e0294451b97172fc86f1b5be31c3209`

Artifact retention expires October 10, 2026.

## Current truth

**Build:** COMPLETE  
**Malformed HTML source defect:** CORRECTED  
**Regression verification:** PASS  
**Production source push:** COMPLETE  
**Existing Web App deployment:** VERSION 12 CONFIRMED  
**New project or second deployment:** NONE  
**External actions:** LOCKED  
**Runtime owner confirmation:** PENDING  
**Issue #33:** remains open until owner reload, self-test, and desktop/mobile acceptance are recorded

## Exact next action

Reload the existing private Owner Portal. Confirm the malformed HTML exception is gone. Then run the non-destructive self-test from Settings and complete desktop/mobile acceptance before closing Issue #33.
