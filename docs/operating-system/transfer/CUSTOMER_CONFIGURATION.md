# Highway 38 Operating System — Customer Configuration Layer

A transferred installation must replace account-specific values without changing Core Engine logic.

| Configuration key | Description | Highway 38 example/type |
|---|---|---|
| `OWNER_EMAIL` | Account allowed to approve and operate the portal | customer-owned email |
| `BUSINESS_NAME` | Customer-facing business name | Highway 38 Solutions |
| `BUSINESS_TAGLINE` | Customer-facing tagline | text |
| `DRIVE_ROOT_FOLDER_ID` | Customer root folder | Google Drive folder ID |
| `CORE_ENGINE_FOLDER_ID` | Core Engine documentation/source folder | Google Drive folder ID |
| `BUSINESS_PACK_FOLDER_ID` | Customer brand/templates folder | Google Drive folder ID |
| `ARCHIVE_FOLDER_ID` | Test and superseded-record archive | Google Drive folder ID |
| `OWNER_PORTAL_SPREADSHEET_ID` | Approval portal spreadsheet | Google Sheet ID |
| `INTAKE_SPREADSHEET_ID` | Raw intake response sheet | Google Sheet ID |
| `INTAKE_SHEET_NAME` | Active response tab | `Form Responses 5` or customer equivalent |
| `INTAKE_FORM_ID` | Customer intake form | Google Form ID |
| `TRACKER_SPREADSHEET_ID` | Customer tracker or backend | Google Sheet ID |
| `APPS_SCRIPT_ID` | Bound/live Apps Script project | Apps Script project ID |
| `LIBRARY_IDENTIFIER` | Optional Apps Script library identifier | `H38OSLIB` in current system |
| `WEB_APP_URL` | Private owner portal deployment URL | Apps Script Web App URL |
| `PUBLIC_WEBSITE_URL` | Customer public website | URL |
| `GITHUB_REPOSITORY` | Source/public website repository | owner/repository |
| `GMAIL_FROM_ACCOUNT` | Draft/send account | customer-owned Gmail/Workspace account |
| `APPROVAL_GATE_TEXT` | Default blocked status | Rick/Owner review wording customized for customer |
| `TIME_ZONE` | Sheet and Apps Script time zone | IANA time zone |

## Configuration rules

- Store non-secret IDs in a controlled configuration file or Script Properties.
- Store secrets only in approved secret storage or Script Properties; never commit them.
- Do not hard-code Rick-specific email addresses, Drive IDs, Form IDs, deployment IDs, or brand text in reusable Core Engine logic.
- Validate every required key before enabling customer use.
- Preserve the owner-approval gate when replacing branding.