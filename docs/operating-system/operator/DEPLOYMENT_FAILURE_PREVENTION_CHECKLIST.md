# Deployment Failure-Prevention Checklist

Status: CONTROLLED  
Owner: 03 — Operations & Documentation  
Technical execution owner: 02 — Build & Automation  
Parent authority: 01 — Command Center  
Effective date: 2026-07-13

Use this checklist before reporting any repository-backed public correction as complete, deployed, published, fixed, or live.

## Scope and source

- [ ] The controlling issue, instruction, and approved scope are identified.
- [ ] Actual current page/source markers were inspected directly.
- [ ] Helper, guard, and workflow defaults were compared with the approved current source.
- [ ] The correction is narrow enough to prove.
- [ ] Unrelated changes are not being pushed ahead of the required correction.
- [ ] Approved assets, IDs, cache keys, text, and behavior are unchanged unless the authority explicitly approved a change.

## LOCAL

- [ ] Local branch is recorded.
- [ ] Full local commit SHA is recorded.
- [ ] Worktree is identified as clean or dirty.
- [ ] Local divergence from `origin/main` is understood.
- [ ] Dirty local state is not being used as evidence of a live-site failure.
- [ ] Local guards and tests were run with the correct current markers.
- [ ] Exact commands, results, and exit codes are preserved.

## Conflict prevention

- [ ] `origin/main` was fetched before integration.
- [ ] Local and remote SHAs were compared.
- [ ] Conflicts were reviewed file by file.
- [ ] `ours` or `theirs` was not selected blindly.
- [ ] The intended combined result was defined before resolving conflicts.
- [ ] A conflicted or incomplete merge was not pushed.

## Test integrity

- [ ] Incorrect or stale page source was fixed at the source.
- [ ] Tests or guards were not weakened to hide stale or incorrect source.
- [ ] A marker failure was investigated before assuming an asset was missing.
- [ ] Local PASS is not being reported as deployment PASS.
- [ ] A passing remote workflow is not being reported as live proof without a public check.

## ORIGIN_MAIN

- [ ] Work is merged or directly committed to `origin/main` under an approved path.
- [ ] Full current `origin/main` SHA is recorded.
- [ ] Every intended file is present at that SHA.
- [ ] No intended work remains branch-only.
- [ ] PR number and merge commit are recorded, or the approved direct-main commit is recorded.
- [ ] Remote workflow/test results are recorded.

## LIVE_PAGES

- [ ] Deployment mechanism completed successfully.
- [ ] Exact public URL was checked independently.
- [ ] Cache-busted URL was used when relevant.
- [ ] Exact marker, asset, text, or behavior was confirmed.
- [ ] Deployment time, workflow run, or equivalent evidence was recorded.
- [ ] Repository source was not substituted for a live-page check.

## Branding-specific checks

- [ ] Approved asset is `assets/highway38-logo.png`.
- [ ] Cache key is `20260713-logo2`.
- [ ] Alt text is exactly `Highway 38 Solutions`.
- [ ] Visible text fallback remains beside the image.
- [ ] First and third logo states are absent from current public source.
- [ ] Mobile sizing preserves readability.

## Closeout truth check

- [ ] LOCAL status is reported separately.
- [ ] ORIGIN_MAIN status is reported separately.
- [ ] LIVE_PAGES status is reported separately.
- [ ] No result is labeled published, deployed, fixed, complete, or live before proof exists.
- [ ] Contradictions and unresolved items are listed.
- [ ] Resolution ownership is assigned to 01, 02, 03, or 04 as appropriate.
- [ ] Rollback or last-known-good reference is preserved.
- [ ] Final status is PASS, BLOCKED, ALREADY_LIVE, or NOT_VERIFIED.

## Stop conditions

Stop and report BLOCKED when:

- intended source is missing from `origin/main`;
- a required page or asset contradicts the approved standard;
- a merge result is uncertain;
- a test passes only after weakening the test rather than correcting source;
- deployment did not complete;
- live state cannot be verified but the task requires a live claim; or
- unrelated changes prevent narrow verification.

Do not retry automatically after a blocked deployment action. Preserve evidence and route the issue to the controlling owner.
