# Highway 38 Solutions — Custom Domain Readiness

Status: PLAN READY / NO DOMAIN, BILLING, OR DNS CHANGE AUTHORIZED

## Recommended public structure

- `https://www.highway38solutions.com/`
- `https://www.highway38solutions.com/start`
- `https://www.highway38solutions.com/samples`
- `https://www.highway38solutions.com/services`
- `https://www.highway38solutions.com/business-systems`
- `https://www.highway38solutions.com/tools`
- `https://www.highway38solutions.com/owner`
- `https://www.highway38solutions.com/service-guides`

## Current-to-future URL map

| Current GitHub Pages route | Future customer route |
|---|---|
| `/` | `/` |
| `/start-request.html` | `/start` |
| `/sample-library-now.html` | `/samples` |
| `/products.html` or `/solutions.html` | `/services` |
| `/business-systems.html` | `/business-systems` |
| `/free-tools.html` | `/tools` |
| `/portal.html` | `/owner` |
| `/service-guides.html` | `/service-guides` |
| `/case-study-template.html` | Internal structure; publish individual authorized case studies under `/case-studies/<slug>` |

## Canonical plan

1. Keep current GitHub Pages canonical URLs until a custom-domain cutover is explicitly approved.
2. At cutover, update canonical and Open Graph URLs in the same controlled release.
3. Use one preferred HTTPS host: `www.highway38solutions.com`.
4. Redirect the apex domain to the preferred `www` host.
5. Preserve old GitHub Pages routes long enough to validate redirects and search indexing.
6. Do not publish duplicate custom-domain and GitHub Pages canonicals at the same time.

## GitHub Pages configuration plan

1. Confirm domain ownership and billing outside the repository.
2. Add the approved domain in GitHub Pages settings.
3. Add a repository `CNAME` file containing only the approved host.
4. Configure required DNS records with the domain provider.
5. Wait for GitHub Pages DNS verification and HTTPS availability.
6. Enable HTTPS enforcement only after the certificate is active.
7. Run the complete public-route, asset, form, portal-link, mobile, desktop, and download verification.

## DNS preparation

The exact records must be copied from the current GitHub Pages documentation and the selected DNS provider at the time of cutover. Do not rely on stale saved IP addresses. The owner must approve the provider, account, billing, and record changes before execution.

## Redirect plan

- Use customer-friendly routes at the custom-domain layer.
- Preserve direct legacy `.html` routes with permanent redirects where the hosting layer supports them.
- Keep query parameters for `start-request.html?product=`, `?bundle=`, and `?system=` during route migration.
- Validate that `/owner` routes only to the approved public Owner Portal entry page and does not expose raw administrative URLs.

## Rollback

1. Preserve the last verified GitHub Pages commit SHA.
2. Preserve the previous DNS record set before modification.
3. If HTTPS, route, or asset verification fails, restore the prior DNS records and remove or revert the `CNAME` change.
4. Confirm the original GitHub Pages URL is working before declaring rollback complete.
5. Record the failure and rollback evidence without changing the Owner Portal, Business Office, North Star installation, billing, or external-action controls.

## Authorization boundary

This document does not authorize domain purchase, billing, DNS changes, email changes, custom-domain activation, or a production cutover. Those actions require explicit owner approval.
