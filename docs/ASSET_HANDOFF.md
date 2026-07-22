# Highway 38 Asset Handoff

This file is the durable source of truth for public website assets across chats and workstreams.

## Required workflow

1. Every accepted public asset must be stored in this repository under a stable, descriptive filename.
2. Do not rely on chat-generated file IDs, temporary previews, screenshots, unnamed UUID files, or another chat's context.
3. Record the page, project, source path, accepted commit, and replacement restrictions here before calling an asset complete.
4. Do not recreate, restyle, remove, or replace an accepted asset unless Rick explicitly approves the change or a verified defect requires correction.
5. Before deployment, verify the repository path, page reference, rendered result, and live GitHub Pages URL.
6. Handoffs must include this manifest path and the production commit.

## Project Examples visuals

Page: `sample-library-now.html`

Canonical visual source:

- `assets/demo-workthroughs/project-pairs-strip.svg`

Card mapping:

- Example 05 — 8 × 12 Pressure-Treated Deck — top row
- Example 06 — Four-Zone Residential Irrigation System — middle row
- Example 07 — Mid-Range Kitchen Remodel — bottom row

Display implementation:

- `contractor-demo.css`
- Cards 5, 6, and 7 use the canonical strip with fixed background positions.

Status:

- Restored in commit `1c7d45f43c9fda0e721486f72c34270ccd914ae7`
- Asset added in commit `31e3c3f4cc841ead1cec51546226f3b811e80932`
- Do not regenerate or substitute the previous crude SVG illustrations.

## Legacy files not approved for public display

- `assets/demo-workthroughs/deck-before.svg`
- `assets/demo-workthroughs/deck-after.svg`
- `assets/demo-workthroughs/irrigation-before.svg`
- `assets/demo-workthroughs/irrigation-after.svg`
- `assets/demo-workthroughs/kitchen-before.svg`
- `assets/demo-workthroughs/kitchen-after.svg`

These legacy illustrations may remain for history until separately removed, but public pages must not reference them.