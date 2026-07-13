# Command Center Deployment and Branding Closeout

Status: DOCUMENTATION PACKAGE COMPLETE / TECHNICAL HOLD  
Issue: #78 — 03 Operations & Documentation — deployment and branding closeout  
Parent issue: #31 — Complete Highway 38 ecosystem live launch  
Parent authority: 01 — Command Center  
Documentation owner: 03 — Operations & Documentation  
Technical resolution owner: 02 — Build & Automation  
Date: 2026-07-13

## Objective

Create the permanent operating controls for deployment-state verification, direct-to-main execution, Sample Library deployment, approved Highway 38 branding, failure prevention, and Command Center closure.

No website redesign, new feature work, or alternate logo work is authorized by this record.

## Documentation package

1. `docs/operating-system/operator/DEPLOYMENT_STATE_VERIFICATION_STANDARD.md`
2. `docs/operating-system/operator/DIRECT_TO_MAIN_COMMAND_RULE.md`
3. `docs/operating-system/operator/SAMPLE_LIBRARY_DEPLOYMENT_PROCEDURE.md`
4. `docs/brand/HIGHWAY_38_PUBLIC_LOGO_STANDARD.md`
5. `docs/operating-system/operator/DEPLOYMENT_FAILURE_PREVENTION_CHECKLIST.md`
6. `docs/command-center/DEPLOYMENT_AND_BRANDING_CLOSEOUT_2026-07-13.md`

## Sample Library correction summary

The Sample Library deployment alarms were resolved by aligning the page source and deploy-helper defaults to the approved Version 5 asset markers.

Controlled markers:

- `assets/hero-garage-before-after.png?v=v5-no-svg-polish`
- `assets/demo-run-sample-garage-bay.png?v=v5-no-svg-polish`
- `assets/workflow-opportunity-finished.png?v=v5-no-svg-polish`

Controlling commits:

- `a1fc3bf69c2e8375007e600cdeed01f7d149df5c` — helper defaults corrected
- `463290ad08895b3a14863cd88d80cc7aca64722a` — Sample Library page correction

The supporting Drive document **ChatCopilot** records that the correction reached `origin/main`, GitHub Pages deployed it, and LOCAL, ORIGIN_MAIN, and LIVE_PAGES marker checks passed at that closure.

Sample Library repair state: **COMPLETE AND LIVE based on the recorded correction evidence.** Do not reopen the repair without new functional or deployment evidence.

## False-alarm root cause

The false alarms resulted from:

- old workflow-opportunity asset references;
- stale deploy-helper default markers;
- treating dirty LOCAL state as evidence that LIVE_PAGES was defective;
- pushing unrelated logo work without the pending Sample Library correction; and
- resolving branch integration without first defining the intended combined source.

## Approved logo decision

The only approved public logo is the second mountain-and-road Highway 38 Solutions badge.

Controlled values:

- asset: `assets/highway38-logo.png`
- cache key: `20260713-logo2`
- alt text: `Highway 38 Solutions`
- visible text fallback: required beside the image
- first H38 swoosh: retired
- third logo: retired

Controlling branding commit:

`4850f074718773ca950d22dbe30444f109634232` — **Use only the approved second logo across the public site**

No alternate logo may be reintroduced without 01 — Command Center approval.

## Deployment-control lesson

When Rick says **deploy to main**, work is not complete until:

1. intended files are present in `origin/main`;
2. the deployment mechanism has completed; and
3. the exact live public destination has been checked independently.

Every report must show LOCAL, ORIGIN_MAIN, and LIVE_PAGES separately. A local commit, branch push, pull request, merge, clean test, or remote workflow alone is not live proof.

## Repository verification performed for Issue #78

Baseline `main` during the 03 review resolved to:

`463290ad08895b3a14863cd88d80cc7aca64722a`

Comparison from branding commit `4850f074718773ca950d22dbe30444f109634232` to `main` showed:

- `main` ahead by two commits;
- the branding commit is in the `main` history;
- the two later modified files are `scripts/deploy_sample_library.sh` and `sample-library-now.html`.

Current `main` verification also found:

- `brand-global.js` uses `assets/highway38-logo.png?v=20260713-logo2`;
- `brand-global.js` uses alt text `Highway 38 Solutions`;
- `brand-global.js` retains a visible `Highway 38 Solutions` text fallback;
- homepage source uses the approved logo asset, cache key, and alt text; and
- the Sample Library deploy helper contains the corrected Version 5 markers.

## Contradiction requiring 02 resolution

The later Sample Library correction commit replaced `sample-library-now.html` after the approved branding commit. Current `main` source for that page does not load `brand-global.css?v=20260713-logo2` or `brand-global.js?v=20260713-logo2` and does not contain the approved logo asset reference.

This is a narrow branding-compliance contradiction, not evidence that the Sample Library marker repair failed.

03 is not authorized to redesign or alter the public site under Issue #78. The exception is routed to 02 — Build & Automation for a narrow source correction and three-scope re-verification.

Required 02 return evidence:

- corrected file path and commit;
- confirmation the Version 5 Sample Library markers remain intact;
- confirmation the approved logo asset, cache key, alt text, and visible fallback are present;
- `origin/main` SHA;
- deployment workflow/result;
- cache-busted live URL check; and
- LOCAL, ORIGIN_MAIN, LIVE_PAGES, and final PASS or HOLD.

## Final closure states

- Sample Library repair: **COMPLETE AND LIVE based on recorded deployment evidence**
- Sample Library marker source/helper alignment: **PASS**
- branding commit present in `main` history: **PASS**
- approved logo: **SECOND MOUNTAIN-AND-ROAD BADGE ONLY**
- first and third logo standards: **RETIRED**
- branch-only logo work: **ELIMINATED; controlling branding commit is in `main` history**
- permanent documentation synchronization: **COMPLETE when this six-file package is merged to `origin/main`**
- current Sample Library branding compliance: **HOLD — narrow 02 correction and live verification required**
- Issue #78 closeout: **HOLD until the contradiction is resolved or Command Center explicitly accepts the documented exception**

## Closure rule

Issue #78 may receive final PASS only after:

- all six documentation files are in `origin/main`;
- documentation paths and links are verified;
- PR and merge evidence are recorded in Issues #78 and #31;
- the Sample Library branding exception is corrected and independently verified, or 01 — Command Center explicitly accepts the exception; and
- no required work remains branch-only.

Until then, preserve this record and do not report branding closeout as fully PASS.
