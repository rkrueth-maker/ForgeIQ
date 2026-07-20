# Highway 38 Web Image Deployment Playbook

## Purpose

Use this process for every Highway 38 public-site release so images are visible, consistent, fast to verify, and easy to roll back.

## Source of truth

- Approved master logo: `assets/highway38-logo.png`
- Approved public imagery: `assets/approved-website-images/`
- Shared public styling: `assets/css/h38-site-v2.css`
- Shared public navigation behavior: `assets/js/h38-site-v2.js`
- Production branch: `main`
- Production host: `https://rkrueth-maker.github.io/highway-38-solutions/`

Do not add new logo variants or use images outside the approved image directory without owner approval.

## Required page image pattern

Every major public page must include:

1. The approved logo in the header.
2. At least one explicit content image using an `<img>` element.
3. A descriptive `alt` attribute.
4. A repository-relative asset path.
5. A cache-busting query string on changed images or stylesheets.

Do not rely on a CSS background as the only visible image on a page. CSS backgrounds may support the design, but at least one explicit `<img>` must be present in the main content.

## Preferred visual structure

Use one of these repeatable patterns:

- Hero background plus three-image strip
- Two-column text and image section
- Three-image visual grid with captions
- Card grid with one image per solution card
- Example sequence: existing condition → visual concept → plan/scope → quote/manage

## Approved image selection rules

Choose images by scope:

- Property and construction: exterior shop, project documents, site or layout imagery
- Garages and shops: garage zones, clean shop floor, storage and workflow imagery
- CNC and manufacturing: CNC closeup, fixture, tooling, or production imagery
- Automation and process: manufacturing automation and workflow imagery
- Business systems: business workflow office and organized digital records
- Intake and quoting: request checklist and planning documents

Avoid repeating the same image more than twice on one page unless it is the approved logo.

## Build workflow

1. Create a branch from current `main`.
2. Update the page using the shared header, footer, CSS, and approved logo.
3. Use only repository-confirmed image paths.
4. Run `python scripts/verify-public-images.py`.
5. Fix all reported missing assets and image-poor pages.
6. Open a PR.
7. Confirm the image verification workflow passes.
8. Merge to `main`.
9. Wait for GitHub Pages publication.
10. Open the production URL with a cache-busting query such as `?v=<commit-sha>`.
11. Visually inspect desktop and mobile for:
   - logo visibility
   - image loading
   - cropping
   - text contrast
   - card height consistency
   - no horizontal overflow
12. Record the merge commit as the rollback point.

## Release checklist

- [ ] Correct approved logo on every updated page
- [ ] No broken image paths
- [ ] Main content contains explicit visible imagery
- [ ] Alt text describes the actual image purpose
- [ ] Changed assets use cache-busting query strings
- [ ] Mobile layout checked
- [ ] Desktop layout checked
- [ ] Old catalog/product links removed or redirected
- [ ] Customer Portal, Quote Builder, Business Office, and Apps Script destinations preserved
- [ ] Merge commit recorded for rollback

## Fast failure rules

Do not publish when:

- an image path is not confirmed in the repository
- a major page has only logo imagery
- a hero relies only on CSS background imagery
- an old product catalog or stale navigation link reappears
- the approved logo is replaced by a variant
- customer-facing application routes change unintentionally

## Rollback

Use the release merge commit as the rollback boundary. Revert the merge commit rather than manually undoing individual files.
