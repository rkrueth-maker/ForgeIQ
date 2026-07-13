# Highway 38 integrated backend

This Google Apps Script project connects website requests, product fulfillment, Owner Portal records, and Business OS reporting. It does not use Firebase and cannot send email, charge customers, publish content, or deliver final work.

## Owner setup

1. Create or select the private Google Sheet that will hold backend records.
2. Create a standalone Apps Script project and copy the files in this directory into it.
3. In **Project Settings → Script properties**, add:
   - `H38_BACKEND_SPREADSHEET_ID`: the private Sheet ID.
   - `H38_BACKEND_OWNER_EMAILS`: comma-separated authorized Owner Google account email addresses.
   - `H38_PUBLIC_INTAKE_ENABLED`: initially `false`.
4. Run `h38BackendInstall({confirmation:'INSTALL INTEGRATED BACKEND'})` from the Apps Script editor while signed into an authorized Owner account.
5. Review the five created sheets and confirm no customer data is public.
6. Deploy as a web app executing as the deploying Owner. Public access is required only for `doPost`; it exposes no read endpoint and creates approval-gated records only.
7. Test with `H38_PUBLIC_INTAKE_ENABLED=false`, then set it to `true` only when the approved website form is ready to use the deployment URL.

## Workflow gates

- Public intake can only create a request and review task.
- `h38BackendApproveRequest` requires the exact Owner decision and creates a fulfillment workspace.
- `h38BackendAuthorizeStart` requires complete inputs, approved scope, an accepted/not-required quote, and paid/not-required payment.
- QA can move work to Owner review, but final delivery remains blocked.
- All material actions write proof records; caught intake errors write error records.

The existing portal can consume the same spreadsheet through a bridge or scheduled import. Keep its current customer-action approval gates in place.

