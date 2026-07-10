# H38 Owner Portal V6 Apps Script via clasp

This folder is for moving H38 Owner Review Portal Apps Script changes out of manual browser copy/paste and into a file-based workflow.

## Goal

Use `clasp push` to update the Apps Script project instead of pasting large code blocks into the Apps Script editor.

## Target Apps Script project

Script ID currently recorded from the Apps Script URL:

```text
13Bes6_rs3LD-Sch4Vi5DKssCnIU_qb4hzZpGpDVfoRELRAk0HtXEJ7o
```

Target system:

```text
Owner Review Portal - Rick Approval Dashboard - V6
```

## One-time setup on Windows PowerShell

From the root of this GitHub repo, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\apps-script\owner-portal-v6\scripts\apply-email-send-fix.ps1
```

The script will:

1. Check for Node.js.
2. Install clasp if missing.
3. Clone the Apps Script project into `h38-owner-portal-apps-script`.
4. Copy `H38OwnerApprovedEmailSend.gs` into the cloned Apps Script project.
5. Run `clasp push`.

## Manual commands if you do not want the PowerShell helper

```bash
npm install -g @google/clasp
clasp login
clasp clone 13Bes6_rs3LD-Sch4Vi5DKssCnIU_qb4hzZpGpDVfoRELRAk0HtXEJ7o --rootDir h38-owner-portal-apps-script
cp apps-script/owner-portal-v6/fixes/H38OwnerApprovedEmailSend.gs h38-owner-portal-apps-script/H38OwnerApprovedEmailSend.gs
cd h38-owner-portal-apps-script
clasp push
```

## Safety rules preserved

The email send fix:

- only runs on the selected row in `Email Approval Queue`
- requires `Rick Decision = APPROVE SEND`
- requires `Send Allowed = Yes`
- blocks if already sent or locked
- sends only an existing Gmail draft
- writes Proof Log on success
- writes Error Log if blocked
- does not send quotes
- does not request payment
- does not publish social posts
- does not deploy website changes
- does not deliver final work
- does not create triggers

## After push

1. Refresh the Owner Review Portal spreadsheet.
2. Select the approved row in `Email Approval Queue`.
3. Confirm:
   - Rick Decision = APPROVE SEND
   - Send Allowed = Yes
   - Sent Time is blank
   - Status is not Sent - locked
   - Gmail Draft Ref exists
4. Run:

```text
H38 Owner Portal -> Send Approved Email Draft
```

## Commit history

- `0e178eca21fe1437d72924774ba219b8d69316b4` added the clasp-ready email send fix file.
- `00392f713eec075abaf88aed67cae568e195f6d4` added the PowerShell apply script.
