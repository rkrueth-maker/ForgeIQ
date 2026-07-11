# Highway 38 Operating System — File Map

## GitHub-controlled files

| Path | Purpose | Status |
|---|---|---|
| `apps-script/core-engine/H38OwnerApprovedEmailSend.gs` | Owner-approved selected-row Gmail draft send module | Current exported source |
| `apps-script/core-engine/README.md` | Core Engine Apps Script scope and deployment notes | Current |
| `apps-script/core-engine/scripts/apply-email-send-fix.ps1` | Windows clasp helper for approved-send module | Current |
| `apps-script/CLASP_SETUP.md` | General clasp setup and safety instructions | Current |
| `docs/operating-system/operator/*` | Operator queue, status, and maintenance documentation | Current |
| `docs/operating-system/developer/*` | Technical, function, menu, file, installation, and recovery documentation | Current |
| `docs/operating-system/transfer/*` | Transfer, packaging, configuration, and checklist documentation | Current |
| `index.html`, `packages.html`, `pricing.html`, `faq.html`, `sample-library-now.html` | Current public website pages | Current public Business Pack |
| `ARCHIVE_NOTICE.md` | Legacy-name and historical-code boundary | Current archive notice |

## Confirmed live-only Apps Script files

These names are known from runtime stacks or current architecture but are not yet fully exported to GitHub:

| File | Purpose | Transfer status |
|---|---|---|
| `H38_OS_Library_Core.gs` | Core selected-row router, approval validation, duplicate lock, proof/error behavior | Live-only; export required |
| `H38_OS_Bound_Wrappers.gs` | Spreadsheet-bound wrappers into the library | Live-only; export required |
| Owner Portal menu file | Builds `H38 Owner Portal` menu and compatibility wrappers | Reference copy exists in Drive; source export required |
| Web App server `.gs` file | `doGet` and private Owner Portal Web App server logic | Live-only; export required |
| Web App `.html` files | Private Owner Portal user interface | Live-only; export required |
| `appsscript.json` | Scopes, runtime, and project settings | Live-only; export required |

## Drive-controlled documentation

- Highway 38 Operating System — Source of Truth Index
- Highway 38 Operating System — Operations Manual — LOCKED
- Highway 38 Operating System — SOP Index
- Owner Portal Menu Code — Reference Copy (deprecated reference until source export)

## Archive classification

Legacy Shopify/ForgeIQ code, old brand material, development-session notes, test outputs, superseded forms, and old job folders are historical or experimental. They are not Core Engine source unless explicitly listed above.

## Naming rule

Do not add numbered system-version folders or files. Use stable functional names and record revision dates in Git history, document metadata, or notes.