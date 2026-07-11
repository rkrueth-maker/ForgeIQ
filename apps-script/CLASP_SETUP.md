# Highway 38 Core Engine Apps Script — clasp setup

This is the file-based workflow for maintaining the Owner Review Portal Apps Script without browser copy/paste.

## Goal

Use `clasp pull` and `clasp push` so the live Owner Review Portal code can be edited as files and synchronized with Apps Script.

## One-time setup

```powershell
npm install -g @google/clasp
clasp login
mkdir h38-owner-portal-apps-script
cd h38-owner-portal-apps-script
clasp clone 13Bes6_rs3LD-Sch4Vi5DKssCnIU_qb4hzZpGpDVfoRELRAk0HtXEJ7o
```

Future changes:

```powershell
clasp pull
# edit and review files
clasp push
```

The maintained selected-row send module is stored at:

```text
apps-script/core-engine/H38OwnerApprovedEmailSend.gs
```

## Safety rules

- Do not enable triggers during setup.
- Do not send test emails during setup.
- Do not change GitHub Pages during Apps Script setup.
- Do not publish social posts.
- Do not request payment.
- Do not deliver final customer work.

## Function naming

The spreadsheet menu and Apps Script must use exactly:

```text
h38OwnerApprovedSendSelectedDraft
```

The function is selected-row only and must remain restricted to `Email Approval Queue` with the required Rick approval fields.

## Verification

After `clasp push`, refresh the Owner Review Portal spreadsheet and run a blocked-row safety test first.

Expected blocked result:

```text
No email sent.
No quote approved.
No payment requested.
No final delivery.
No website/social publish.
No trigger.
```