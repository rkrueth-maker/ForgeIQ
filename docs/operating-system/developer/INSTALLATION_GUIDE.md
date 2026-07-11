# Highway 38 Operating System — Installation Guide

## Prerequisites

- Google account that will own Drive, Form, Sheets, Gmail drafts, and Apps Script.
- GitHub account/repository for source control and public website.
- Google Cloud Shell or a computer with Node.js, npm, and `@google/clasp`.
- Customer configuration values from `CUSTOMER_CONFIGURATION.md`.

## Install sequence

1. Create customer-owned Drive root, Core Engine, Business Pack, and Archive folders.
2. Create or copy the intake Form, Intake Responses spreadsheet, Owner Review Portal spreadsheet, and customer tracker/backend.
3. Apply the canonical queue headers, status validations, and approval rules.
4. Create a customer-owned Apps Script project and record its Script ID.
5. In Cloud Shell or a local terminal:

```bash
npm install -g @google/clasp
clasp login
clasp clone SCRIPT_ID --rootDir owner-portal-apps-script
```

6. Export all live Core Engine `.gs`, `.html`, and `appsscript.json` files into the customer source folder.
7. Apply customer configuration: spreadsheet IDs, folder IDs, form IDs, Gmail sender, Web App settings, website/repository links, and allowed owner account.
8. Run `clasp status`, compare local files to the intended source, and then run `clasp push`.
9. Deploy the private Web App with customer-owned access settings.
10. Refresh the Owner Review Portal and confirm the menu loads.
11. Run automatic checks for sheet names, headers, functions, menu targets, links, scopes, secrets, and public/private separation.
12. Run a blocked-row safety test.
13. Run one controlled owner-approved test using an internal recipient.
14. Record Proof Log evidence and customer acceptance.

## Cloud Shell sync procedure

```bash
cd ~/highway-38-solutions

git pull

cd ~/owner-portal-apps-script
clasp pull

# compare/export reviewed Core Engine files
clasp status
clasp push
```

Always pull before push. Never use a partial local folder as the complete project unless the omitted live files are intentionally removed and backed up.

## Installation stop conditions

Stop before push or deployment when:

- an expected file is missing
- duplicate public functions exist
- a menu target is missing
- a customer/account ID is still Rick-specific
- a secret appears in source control
- the spreadsheet header differs from the function map
- a trigger is enabled without explicit approval
- the blocked-row test fails