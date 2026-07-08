# AGENTS.md

## Deployment Safety Rules

These rules apply to any request that mentions deploy, deployment, GitHub Pages, live site verification, or publishing visual/site changes.

1. Separate all findings by scope:
   - `LOCAL`
   - `ORIGIN_MAIN`
   - `LIVE_PAGES`
2. Print both commit IDs before any conclusion:
   - local `HEAD`
   - `origin/main`
3. If local work differs from `origin/main`, do not treat local file absence or local preview differences as evidence that remote or live is broken.
4. Do not deploy from a dirty working tree.
5. Do not deploy from a branch that is not based on the current `origin/main`.
6. Use a clean worktree or clean branch based on `origin/main` for deploy work.
7. Before claiming a deploy is needed, prove the mismatch with cache-busted live checks.
8. If the intended markers already appear in both `ORIGIN_MAIN` and `LIVE_PAGES`, do not deploy again.
9. End deploy verification with a one-line verdict in this format:
   - `VERDICT: <PASS|BLOCKED|ALREADY_LIVE|UNKNOWN> | Scope Verified: <LOCAL|ORIGIN_MAIN|LIVE_PAGES|ORIGIN_MAIN+LIVE_PAGES|LOCAL+LIVE_PAGES>`

## Required Preflight

Before any deploy or deploy recommendation, run the guard script when possible:

```bash
python3 scripts/guard_deploy.py \
  --page sample-library-now.html \
  --live-url "https://rkrueth-maker.github.io/highway-38-solutions/sample-library-now.html" \
  --match "assets/problem-snapshot-before-after.png" \
  --match "assets/shop-flow-before-after.png" \
  --match "assets/workflow-opportunity-before-after.png"
```

Use page-appropriate `--match` markers for other deploy targets.

Optional wrapper command:

```bash
scripts/deploy_with_guard.sh \
  --page sample-library-now.html \
  --live-url "https://rkrueth-maker.github.io/highway-38-solutions/sample-library-now.html" \
  --match "assets/problem-snapshot-before-after.png" \
  --match "assets/shop-flow-before-after.png" \
  --match "assets/workflow-opportunity-before-after.png"
```

## Reference Docs

If more context is needed, consult:

- `docs/CHATGPT_LIVE_DEPLOY_INSTRUCTIONS_2026-07-06.md`
- `docs/CHATGPT_HANDOFF_DEPLOY_PHOTOS_2026-07-06.md`

Treat those docs as process references. Do not rely on old hard-coded asset expectations without re-verifying current live state.
