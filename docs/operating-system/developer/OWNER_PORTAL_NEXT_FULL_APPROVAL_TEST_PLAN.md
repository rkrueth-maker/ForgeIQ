# Owner Portal Next — Full Approval Test Plan

Status: approved for release-candidate build, GitHub merge, and non-customer-facing testing.

## Authorized in this test cycle

- build and merge release-candidate safeguards
- create isolated Drive test copies
- install normalized candidate sheets in the copied Owner Portal workbook
- import the controlled 15-product and 9-bundle catalog into the copy
- load synthetic records only
- run static, schema, relationship, calculation, approval-gate, duplicate-lock, proof, error, security, and responsive-interface tests
- add continuous verification in GitHub Actions

## Still disabled

- live customer email, quote, invoice, payment request, or final delivery
- live card processing or credential activation
- social publication
- advertising launch or spend
- public website deployment
- production Web App replacement
- trigger creation or bulk execution

## Release gate

Production remains blocked until the copied-environment test report passes, the Apps Script candidate is installed in a separate script project, owner-only Web App deployment is verified, and each live external workflow is intentionally activated and tested.
