# Highway 38 Integrated Business Operating System

Status: **OWNER-ONLY INTEGRATED PRODUCTION CANDIDATE**

This folder is the technical source for the existing bound Highway 38 Owner Portal. The operating model is one integrated business system centered on the Unified Task list and the selected-record workspace.

## Integrated operating screen

Every lead, customer, job, quote, invoice, payment, expense, communication, social item, advertising campaign, website change, calendar event, proof record, and error record is accessible through the central Task/Job workspace.

The workspace includes:

- state-aware selected-task actions;
- customer and lead context;
- complete job scope and stage;
- catalog-controlled quotes and invoices;
- manual payment tracking;
- expenses and accounting CSV export;
- communication review records;
- social scheduling controls;
- advertising planning and approval;
- website change and merge/deployment control;
- linked calendar records;
- Proof Log and Error Log history.

Empty linked sections return `No linked records` instead of throwing a rendering error. Approved and completed tasks no longer keep showing the original approval decision as pending.

## Internal functions available

- unified clickable Task list with search, status, priority, and sort controls;
- full Job workspace;
- internal create and edit forms without JSON prompts;
- quote creation from the synchronized 15-product / 9-bundle catalog;
- invoice creation from approved or accepted quotes;
- manual payment recording and invoice balance updates;
- expense recording with controlled categories;
- communication-draft records and owner review tasks;
- social post records and internal scheduling;
- advertising plan records and internal approval;
- website change records and internal merge approval;
- reporting, accounting CSV, global search, proof, errors, and adapter contract tests.

## Locked safety defaults

- owner-only access;
- existing bound Apps Script project and existing private deployment only;
- `LIVE_EXTERNAL_ACTIONS_ENABLED = false`;
- selected-record execution only;
- no bulk execution;
- no trigger creation;
- no live email, quote, invoice, payment request, final delivery, social publication, advertising launch/spend, website merge, or deployment;
- exact owner approval gates, duplicate-action holds, Proof Log, and Error Log.

External-action buttons are test-only gate checks until 01 – Command Center explicitly releases a separately verified live workflow.

## Verification

Run:

```bash
node scripts/verify-owner-portal-next.js
```

Then update the existing bound project with `scripts/deploy-owner-portal-next-production.sh`, confirm the three Script Properties, open the existing private Web App, and run the non-destructive self-test from Settings.

03 – Operations & Documentation validates and locks daily procedures after technical acceptance. 01 – Command Center approves any future live external action separately.
