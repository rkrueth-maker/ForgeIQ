# Provider Connection Status — Complete Ecosystem Launch

Release branch: `complete-ecosystem-live-launch-2026-07-11`

No missing credential removes a feature from scope. The code/UI contract and tests remain required; only the final connection step is blocked.

| Feature | Current mode | Truthful status | Exact remaining step |
|---|---|---|---|
| Gmail customer email, quote, invoice, follow-up, delivery | Owner approval + selected record | Code-ready / connection blocked | Authorize the production Gmail identity in the existing bound Apps Script project, confirm sender identity, then pass send, duplicate, Proof Log, Error Log, and no-retry tests. |
| Provider-hosted payments, receipts, refunds, subscriptions | Provider-hosted card entry only | Provider selection blocked | Rick selects Stripe, Square, or PayPal and supplies the production connection. No raw card data may enter browser, Sheets, logs, or repository. |
| Customer portal | Customer-isolated | Authentication blocked | Select authentication and customer-file authorization model, then pass cross-customer, guessed-ID, direct-link, session, upload, download, and internal-field tests. |
| Social scheduling/publication | Owner approval + selected post | Credential blocked | Connect or replace Metricool and verify each Facebook, Instagram, LinkedIn, Google Business Profile, and YouTube account permission. |
| Accounting API | CSV available | CSV live / direct API blocked | Select QuickBooks, Xero, Wave, or FreshBooks and authorize the provider; reconcile export totals before activation. |
| Analytics and attribution | Privacy-minimized event queue | Property ID blocked | Provide approved analytics property/measurement ID and consent requirements; verify no private form content is transmitted. |
| Advertising | Budget and owner approval required | Disabled | Connect only an approved ad account after budget cap, selected campaign, landing page, tracking, and no-auto-retry tests pass. |
| Website production deployment | Rollback-protected GitHub Pages | Existing guarded path available | Merge only verified changes after CI, create rollback commit/tag, then verify live routes and assets. |

## External-action state

Until Command Center explicitly changes the workflow, external customer sends, payment requests, final delivery, social publication, advertising spend, and website deployment remain approval-gated or disabled. No provider is described as connected unless a provider reference and live verification exist.
