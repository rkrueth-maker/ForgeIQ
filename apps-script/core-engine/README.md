# Highway 38 Core Engine Apps Script

This folder contains the transferable Owner Review Portal Apps Script support files. It replaces numbered-version folder naming.

## Target Apps Script project

Script ID:

```text
13Bes6_rs3LD-Sch4Vi5DKssCnIU_qb4hzZpGpDVfoRELRAk0HtXEJ7o
```

Target system:

```text
Owner Review Portal — Rick Approval Dashboard
```

## Apply the approved-email-send module

From the repository root in Windows PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\apps-script\core-engine\scripts\apply-email-send-fix.ps1
```

The helper checks Node.js and clasp, clones or reuses the Apps Script project, copies the selected-row send module, and runs `clasp push`.

## Safety rules

The module:

- runs only on the selected row in `Email Approval Queue`
- requires `Rick Decision = APPROVE SEND`
- requires `Send Allowed = Yes`
- blocks duplicates and previously sent rows
- sends only an existing Gmail draft
- writes Proof Log on success
- writes Error Log when blocked
- does not send quotes
- does not request payment
- does not publish social posts
- does not deploy website changes
- does not deliver final work
- does not create triggers

## Manual commands

```bash
npm install -g @google/clasp
clasp login
clasp clone 13Bes6_rs3LD-Sch4Vi5DKssCnIU_qb4hzZpGpDVfoRELRAk0HtXEJ7o --rootDir h38-owner-portal-apps-script
cp apps-script/core-engine/H38OwnerApprovedEmailSend.gs h38-owner-portal-apps-script/H38OwnerApprovedEmailSend.gs
cd h38-owner-portal-apps-script
clasp push
```

After push, refresh the Owner Review Portal spreadsheet and use the owner-approved selected-row action only after the approval fields are satisfied.