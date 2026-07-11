# Owner Portal Next — Owner-Only TEST Runtime Runbook

Status: **TEST ONLY / NON-PRODUCTION**

This runbook creates a separate standalone Apps Script project, pushes the verified Owner Portal Next release-candidate source, configures it against the private copied Owner Portal spreadsheet through Script Properties, runs the non-destructive server self-test, and creates an owner-only TEST deployment.

## Preconditions

- `clasp login` is complete in Cloud Shell.
- The Apps Script API is enabled for the Google account.
- `H38_TEST_SPREADSHEET_ID` identifies the private copied Owner Portal workbook, not the production workbook.
- GitHub `main` is green.

## Execute

```bash
cd ~
export H38_TEST_SPREADSHEET_ID='PRIVATE_TEST_COPY_ID'
bash <(curl -fsSL https://raw.githubusercontent.com/rkrueth-maker/highway-38-solutions/main/scripts/deploy-owner-portal-next-test.sh)
```

## Required successful results

- static verifier returns `PASS`;
- a new standalone Apps Script project is created;
- `clasp push` succeeds;
- owner-only deployment is created;
- environment status returns `TEST`, configured spreadsheet, and live external actions `false`;
- `h38PortalSelfTest()` returns `PASS`;
- Web App opens only for the owner;
- no external action occurs.

## Manual owner browser checks

1. Open the printed owner-only TEST Web App URL while signed into Rick's Google account.
2. Confirm Dashboard, Tasks, Customers, Jobs, Quotes, Invoices, Payments, Expenses, Products, Proof, Errors, and Settings load.
3. Open `TASK-TEST-001` and confirm related synthetic records appear.
4. Confirm all test contact information uses `example.invalid`.
5. Confirm no Gmail send, payment request, publication, ad launch, website deployment, or trigger occurs.
6. Test Chromebook and phone navigation.

## Stop conditions

Stop and leave the project undeployed if any of these occur:

- the configured spreadsheet is not the private test copy;
- environment is not `TEST`;
- live external actions report `true`;
- self-test returns `HOLD`;
- owner-only access fails;
- any customer-facing or public action is attempted.

## Production boundary

This runbook does not replace the existing Owner Review Portal, migrate production records, activate triggers, configure paid providers, or authorize customer-facing execution. Production migration requires a separate reviewed release and explicit approval.
