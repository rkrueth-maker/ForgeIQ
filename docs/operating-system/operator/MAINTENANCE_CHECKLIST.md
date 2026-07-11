# Highway 38 Operating System — Maintenance Checklist

## Daily or active-work review

- Review Dashboard counts.
- Review active queue rows only.
- Confirm approval status before any selected-row external action.
- Confirm recipient, links, and draft reference match the selected row.
- Confirm quote amounts are numeric-only.
- Confirm no final delivery, payment request, publishing, or deployment occurs outside approved scope.
- Review new Error Log entries.

## Weekly

- Archive completed test rows from active queues.
- Confirm Proof Log entries have IDs, timestamps, job IDs, action type, result, and evidence.
- Resolve or escalate open Error Log items.
- Check Gmail for obsolete Highway 38 drafts and duplicate templates.
- Check Drive for test folders, duplicate manuals, and loose Highway 38 documents.
- Confirm public website pages contain no customer data or secrets.
- Confirm Owner Portal link and public form link are unchanged.

## Monthly

- Pull the live Apps Script project with clasp and compare exported files to GitHub.
- Run the blocked-row safety test before any controlled execution test.
- Confirm no triggers are enabled unless Rick has explicitly approved a documented trigger.
- Review the Function Map, Menu Map, and File Map for drift.
- Review customer-configuration values and account ownership dependencies.
- Confirm archive folders remain read-only/reference-only.
- Review active chat structure and route Highway 38 work into the four retained chats.

## Before transfer or installation

- Remove Rick-specific account values from the customer configuration.
- Create customer-owned Drive, Gmail, Form, Sheet, Apps Script, Web App, and GitHub resources.
- Apply configuration and permissions.
- Run header, menu, function, link, privacy, and duplicate-lock checks.
- Run blocked-row test.
- Run one controlled owner-approved internal-recipient test.
- Record proof and obtain customer acceptance.