# Direct-to-Main Command Rule

Status: CONTROLLED  
Owner: 03 — Operations & Documentation  
Technical execution owner: 02 — Build & Automation  
Parent authority: 01 — Command Center  
Effective date: 2026-07-13

## Permanent command interpretation

> When Rick says **deploy to main**, branch-only completion is unacceptable.

The command means the intended production work must reach `origin/main`, the deployment mechanism must complete, and the live public destination must be checked independently.

## Required closeout evidence

A deploy-to-main assignment is complete only when the report includes:

1. the local work branch and full work commit SHA;
2. the pull request number, or a documented approved direct commit path;
3. the merge commit or direct `origin/main` commit SHA;
4. confirmation that every intended file is present in `origin/main`;
5. confirmation that no intended change remains branch-only;
6. the deployment workflow, Pages deployment, or other deployment mechanism result;
7. the exact live URL independently checked;
8. the exact marker, asset, text, or behavior confirmed live;
9. a cache-busted check when cached assets or page source may affect the result; and
10. final LOCAL, ORIGIN_MAIN, LIVE_PAGES, and overall statuses.

## Unacceptable substitutes

None of the following alone completes a deploy-to-main command:

- a local commit;
- a clean worktree;
- a branch push;
- an open pull request;
- an approved pull request that is not merged;
- a merge without deployment evidence;
- a passing local test;
- a passing remote workflow without a live-page check;
- a live-page observation when `origin/main` does not contain the intended source.

## Direct commit versus pull request

Use a pull request for normal controlled work so file scope, review, test evidence, and merge history remain visible.

A direct commit to `main` is permitted only when the controlling instruction explicitly requires it or an established emergency procedure authorizes it. Direct commits still require the same three-scope verification and must not bypass owner gates, tests, rollback evidence, or issue reporting.

## Conflict and scope rules

- Do not push unrelated work ahead of the requested correction.
- Do not resolve a conflict by choosing `ours` or `theirs` without understanding the intended combined result.
- Do not rewrite guards or tests to hide incorrect source.
- Keep the correction narrow enough to prove.
- Stop on contradictory repository or live-state evidence and return the contradiction to 01 — Command Center.

## Documentation-only changes

Documentation-only work must still prove:

- the exact files and commit are present in `origin/main`;
- the PR and merge history are recorded;
- documentation tests and links pass; and
- no intended documentation remains branch-only.

A live-page verification is required when the documentation closeout makes a claim about the current public deployment state.

Related controls:

- `DEPLOYMENT_STATE_VERIFICATION_STANDARD.md`
- `DEPLOYMENT_FAILURE_PREVENTION_CHECKLIST.md`
