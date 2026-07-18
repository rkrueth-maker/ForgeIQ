# Highway 38 Business System — Second-Business Transfer Checklist

## Release baseline

- [ ] Accepted source commit recorded.
- [ ] Product package selected: Quote Builder or full Business System.
- [ ] Business Pack version recorded.
- [ ] Rollback baseline recorded.
- [ ] Release manifest created.

## Source package

- [ ] Complete required Apps Script `.gs`, `.html`, and `appsscript.json` source committed.
- [ ] Required public website/gateway source committed.
- [ ] No duplicate public functions.
- [ ] Menu and route targets exist.
- [ ] Deprecated wrappers are marked or compatibility-only.
- [ ] Direct `quoteBuilder=1` routing is preserved when Quote Builder is enabled.
- [ ] Full Business Office bootstrap is not restored inside direct Quote Builder.
- [ ] Integrated camera workflow is present; no separate required upload step replaces it.
- [ ] Full Business Office includes an obvious navigation action that opens Quote Builder.
- [ ] Business Office and direct-route launches use the same Quote Builder implementation.

## Separation and sanitation

- [ ] Reusable Core, Business Pack, and customer configuration are separately identifiable.
- [ ] No Highway 38 customer records are included.
- [ ] No Rick private files are included.
- [ ] No secrets, tokens, passwords, or live credentials are included.
- [ ] No Highway 38 production IDs are present in the pilot configuration.
- [ ] Hard-coded Highway 38 brand, email, Drive, Sheet, Form, Script, deployment, and repository values are removed from reusable Core logic.
- [ ] Secret scan passes.
- [ ] Public/private content scan passes.

## Customer-owned resources

- [ ] Customer-owned or intentionally customer-managed Google account confirmed.
- [ ] Drive root, Business Pack, documents, and archive folders created.
- [ ] Required backend/tracker Sheets created.
- [ ] Intake Form and response Sheet created when included.
- [ ] Customer-owned Apps Script project created.
- [ ] Customer-owned web app deployment created.
- [ ] Gmail/Workspace sender configured when included.
- [ ] Customer repository and public website/gateway configured when included.
- [ ] Highway 38 production resources remain unchanged.

## Configuration

- [ ] Installation ID, environment, product package, business name, owner, locale, and time zone configured.
- [ ] Drive, Sheet, Form, Script, deployment, repository, and route IDs configured.
- [ ] Enabled modules match the purchased/pilot package.
- [ ] Role defaults use least privilege.
- [ ] Owner approval wording configured.
- [ ] External-action flags remain safely locked.
- [ ] Quote camera document defaults match the accepted classification.
- [ ] Configuration preflight passes.
- [ ] Sanitized configuration fingerprint is recorded in the release manifest.

## Business Pack

- [ ] Business identity and approved brand assets installed.
- [ ] Service/product catalog and pricing approved.
- [ ] Price Book seed imported and reviewed.
- [ ] Quote/proposal templates installed and reviewed.
- [ ] Intake wording and customer-facing terms reviewed.
- [ ] Public website and sample content installed when included.
- [ ] Workflow defaults and module navigation reviewed.
- [ ] Highway 38-specific copy does not appear unless intentionally retained as product attribution.

## Functional verification

- [ ] Authentication passes.
- [ ] Owner, Administrator, Staff, and Viewer roles behave as configured.
- [ ] Customer and contact create/read/update workflows pass.
- [ ] Quote create, edit, grouped write, save, reopen, and approval workflows pass.
- [ ] Price Book and template workflows pass.
- [ ] Business Office navigation opens Quote Builder without a second login.
- [ ] Selected customer context carries into Quote Builder when launched from a customer record.
- [ ] Selected quote context carries into Quote Builder when launched from a quote record.
- [ ] Quote Builder provides a clear return path to the Business Office.
- [ ] Business Office and Quote Builder share customer, quote, document, role, approval, and logging records.
- [ ] Document upload, permission, MIME, size, duplicate hash, and source-link tests pass.
- [ ] Quote camera test passes on a real device.
- [ ] New-quote camera picture attaches automatically after quote creation.
- [ ] Existing-quote camera picture saves immediately.
- [ ] Quote pictures appear in the attachment gallery.
- [ ] Original private Drive file opens for an authenticated authorized user.
- [ ] Customer portal workflows pass when included.
- [ ] Public website/gateway routes resolve when included.

## Control verification

- [ ] Owner approval gate passes.
- [ ] Blocked-row safety test passes.
- [ ] Duplicate-lock test passes.
- [ ] No unauthorized triggers are enabled.
- [ ] No customer message or email sends automatically.
- [ ] No SMS sends automatically.
- [ ] No money or payment movement occurs automatically.
- [ ] No quote or work approval occurs automatically.
- [ ] No work starts automatically.
- [ ] AI cannot approve customer-facing or external actions.
- [ ] Proof Log, Error Log, and timing logs align with their headers and expected events.

## Production and recovery

- [ ] Target deployment source matches the accepted release.
- [ ] Production routes are verified before PASS is reported.
- [ ] Backup is created and restorable.
- [ ] Recovery procedure is tested or formally reviewed.
- [ ] Rollback commit and deployment procedure are recorded.
- [ ] Open defects and unrelated red checks are documented without masking pilot failures.

## Handoff and acceptance

- [ ] Operator guide delivered.
- [ ] Administrator and user-access guide delivered.
- [ ] Technical appendix, maps, installation, maintenance, and recovery guides delivered.
- [ ] Customer training completed.
- [ ] Ownership and permissions inventory delivered.
- [ ] Temporary test records are soft-voided or removed under operating controls.
- [ ] Customer acceptance is recorded.
- [ ] Command Center records final PASS, limitations, next actions, and source-of-truth release.