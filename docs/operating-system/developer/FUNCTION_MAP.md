# Highway 38 Operating System — Function Map

## GitHub-controlled approved-send module

| Function | Scope | Status | Exposure |
|---|---|---|---|
| `h38OwnerApprovedSendSelectedDraft` | Sends an existing Gmail draft from the selected Email Approval Queue row after exact approval checks | Current, synced and safety-tested | Menu target |
| `h38BuildRowObject_` | Builds header/value object | Internal helper; generic name, collision risk | Private |
| `h38GetFirst_` | Reads first populated allowed header alias | Internal helper; generic name, collision risk | Private |
| `h38ExtractDraftId_` | Extracts Gmail draft ID | Internal helper | Private |
| `h38CreateEmailProofId_` | Creates proof identifier | Internal helper | Private |
| `h38SetIfHeaderExists_` | Writes a value when a header exists | Internal helper; generic name, collision risk | Private |
| `h38WriteProofLog_` | Appends Proof Log entry | Internal helper; schema must match current Proof Log | Private |
| `h38WriteErrorLog_` | Appends Error Log entry | Internal helper; schema must match current Error Log | Private |

## Confirmed live-library functions from system evidence

| Function | File/evidence | Status |
|---|---|---|
| `H38OS_executeApprovedSelectedRow` | `H38_OS_Library_Core` stack | Current library entry point |
| `executeApprovedSelectedRow` | `H38_OS_Library_Core` stack | Current internal router |
| `executeEmail` | `H38_OS_Library_Core` stack | Current email execution path |
| `validateApproval` | `H38_OS_Library_Core` stack | Current approval validator |
| `duplicateLock` | `H38_OS_Library_Core` stack | Current duplicate-prevention validator |
| `blockError_` | `H38_OS_Library_Core` stack | Current blocking/error helper |
| `h38ExecuteApprovedSelectedRow` | `H38_OS_Bound_Wrappers` stack | Current bound wrapper |

## Menu-target functions referenced by the live menu

| Function | Role | Source-control status |
|---|---|---|
| `h38RefreshOwnerDashboard` | Refresh dashboard counts | Live-only until exported |
| `h38OwnerActionRouterShowSelectedRow` | Show safe next action | Live-only until exported |
| `approveSelectedRow` | Record APPROVE decision/status | Live-only until exported |
| `holdSelectedRow` | Record HOLD decision/status | Live-only until exported |
| `reviseSelectedRow` | Record REVISE decision/status | Live-only until exported |
| `rejectSelectedRow` | Record REJECT decision/status | Live-only until exported |
| `h38CreateGmailDraftFromSelectedRow` | Create selected-row draft | Live-only until exported |
| `h38OwnerApprovedSendSelectedDraft` | Send owner-approved selected-row Gmail draft | GitHub-controlled module |
| `h38PrepareQuoteEmailDraft` | Prepare quote draft | Live-only until exported |
| `h38MarkQuoteReadyForReview` | Mark quote ready | Live-only until exported |
| `h38CreateFollowUpDraft` | Create follow-up draft | Live-only until exported |
| `h38MarkFollowUpComplete` | Complete follow-up record | Live-only until exported |
| `h38WriteManualProofNote` | Add manual proof | Live-only until exported |
| `h38SendSelectedRowToErrorLog` | Route selected row to Error Log | Live-only until exported |
| `h38CheckCustomerRepliesV2` | Read/classify customer replies without automatic response | Current compatibility function; live-only |
| `h38LaunchModeFunctionAudit` | Populate function audit | Compatibility name; live-only |
| `h38LaunchModeSafetyStatus` | Display safety status | Compatibility name; live-only |

## Deprecated or compatibility-only functions

- All `h38MenuV6*` names are compatibility wrappers. Keep until a tested versionless menu replacement is exported and deployed.
- `h38MenuV6ProcessSelectedIntakeRow` is a HOLD-only stub.
- `h38MenuV6SyncLatestFormResponse` is a HOLD-only stub.
- Older reply-classifier functions superseded by `h38CheckCustomerRepliesV2` must not be exposed in the menu.

## Duplicate-function rule

A public menu/entry function must have one active implementation in the final Apps Script project. When duplicates are found, preserve the uncertain implementation in an archive file with a `DEPRECATED — DO NOT CALL` header before removing it from active execution.