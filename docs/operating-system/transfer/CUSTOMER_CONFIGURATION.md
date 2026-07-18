# Highway 38 Business System — Customer Configuration Layer

A transferred installation must replace account-specific and business-specific values without changing reusable Core logic.

## Identity and environment

| Configuration key | Required | Description |
|---|---:|---|
| `INSTALLATION_ID` | yes | Stable unique identifier for the customer installation |
| `ENVIRONMENT` | yes | `test`, `pilot`, or `production` |
| `PRODUCT_PACKAGE` | yes | `quote-builder` or `business-system` |
| `BUSINESS_NAME` | yes | Customer-facing business name |
| `BUSINESS_TAGLINE` | no | Customer-facing tagline |
| `OWNER_EMAIL` | yes | Customer-owned account allowed to approve and operate the system |
| `TIME_ZONE` | yes | IANA time zone |
| `LOCALE` | yes | Display locale |
| `APPROVAL_GATE_TEXT` | yes | Customer-specific owner-review wording |

## Google resources

| Configuration key | Required | Description |
|---|---:|---|
| `DRIVE_ROOT_FOLDER_ID` | yes | Customer-owned Drive root |
| `CORE_ENGINE_FOLDER_ID` | yes | Documentation/source folder |
| `BUSINESS_PACK_FOLDER_ID` | yes | Brand, templates, catalog, and configuration folder |
| `DOCUMENT_FOLDER_ID` | yes | Private operational document folder |
| `ARCHIVE_FOLDER_ID` | yes | Test and superseded-record archive |
| `OWNER_PORTAL_SPREADSHEET_ID` | package | Owner/approval portal spreadsheet |
| `TRACKER_SPREADSHEET_ID` | yes | Business Office backend/tracker |
| `INTAKE_SPREADSHEET_ID` | package | Raw intake response sheet |
| `INTAKE_SHEET_NAME` | package | Active intake tab |
| `INTAKE_FORM_ID` | package | Customer intake form |
| `APPS_SCRIPT_ID` | yes | Customer-owned Apps Script project |
| `WEB_APP_DEPLOYMENT_ID` | yes | Customer-owned deployment ID |
| `WEB_APP_URL` | yes | Private web app URL |
| `GMAIL_FROM_ACCOUNT` | package | Customer-owned Gmail/Workspace sender |

## Source and public routes

| Configuration key | Required | Description |
|---|---:|---|
| `GITHUB_REPOSITORY` | yes | Customer or managed source repository |
| `PUBLIC_WEBSITE_URL` | package | Customer public website |
| `QUOTE_BUILDER_GATEWAY_URL` | quote-builder | Public or internal Quote Builder gateway |
| `DIRECT_QUOTE_BUILDER_ENABLED` | quote-builder | Must preserve direct server routing when enabled |
| `DIRECT_QUOTE_BUILDER_QUERY` | quote-builder | Defaults to `quoteBuilder=1` |

## Modules and controls

| Configuration key | Required | Description |
|---|---:|---|
| `ENABLED_MODULES` | yes | Explicit module allowlist |
| `DEFAULT_ROLE` | yes | Least-privilege default role |
| `OWNER_ROLE_NAME` | yes | Owner role label |
| `ALLOW_CUSTOMER_SEND` | yes | Must default to `false` |
| `ALLOW_PAYMENT_MOVEMENT` | yes | Must default to `false` |
| `ALLOW_AUTOMATIC_APPROVAL` | yes | Must remain `false` |
| `ALLOW_AUTOMATIC_WORK_START` | yes | Must remain `false` |
| `ALLOW_AI_APPROVAL` | yes | Must remain `false` |
| `QUOTE_CAMERA_ENABLED` | package | Enables integrated camera workflow |
| `MAX_DOCUMENT_BYTES` | yes | Defaults to 20 MB unless formally changed |
| `ALLOWED_DOCUMENT_MIME_TYPES` | yes | Controlled MIME allowlist |
| `DOCUMENT_DUPLICATE_HASHING` | yes | Must remain enabled |

## Quote photo defaults

When the Quote Builder camera is enabled, captured pictures must default to:

- document type: `Quote Field Photo`
- source type: `Quote`
- source ID: saved Quote ID
- access classification: `Private Customer`
- review status: `Needs Review`
- approval status: `Owner Approval Required`

## Business Pack reference

| Configuration key | Required | Description |
|---|---:|---|
| `BUSINESS_PACK_VERSION` | yes | Version or release identifier |
| `BUSINESS_PACK_MANIFEST_PATH` | yes | Path to the applied manifest |
| `PRICE_BOOK_SEED_PATH` | package | Initial Price Book data |
| `QUOTE_TEMPLATE_PATHS` | package | Enabled quote/proposal templates |
| `BRAND_ASSET_PATHS` | package | Approved logo and visual assets |
| `PUBLIC_CONTENT_PATH` | package | Website and public sample content |

## Configuration rules

- Store non-secret IDs in a controlled customer configuration file or Script Properties.
- Store secrets only in approved secret storage or Script Properties; never commit them.
- Never hard-code Rick-specific email addresses, Highway 38 Drive IDs, Form IDs, Sheet IDs, Apps Script IDs, deployment IDs, or business language in reusable Core logic.
- Validate every required key and target ownership before enabling customer use.
- Reject a pilot configuration containing accepted Highway 38 production IDs.
- Preserve owner approval and all external-action locks when replacing branding or module settings.
- Keep test, pilot, and production configurations separate.
- Record the sanitized configuration fingerprint in the release manifest.

## Minimum preflight checks

1. Required keys are present and non-placeholder.
2. Target resources are customer-owned or intentionally managed for that customer.
3. No Highway 38 production IDs are present.
4. No secrets or tokens are present in committed files.
5. Selected product package and enabled modules agree.
6. Direct Quote Builder routing and camera defaults are intact when enabled.
7. Approval and external-action flags are locked to safe defaults.
8. Drive, Sheet, Form, Script, deployment, repository, and public routes resolve.
9. Time zone and permissions are configured.
10. A release manifest can be generated before deployment.
