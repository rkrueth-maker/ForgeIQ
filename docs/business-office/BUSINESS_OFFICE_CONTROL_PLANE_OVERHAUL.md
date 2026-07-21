# Highway 38 Business Office Control-Plane Overhaul

Status: **Draft — simulated acceptance only**  
Production deployment: **Not authorized in this pull request**  
Northern Lakes: **Frozen and excluded until Highway 38 sign-off**

## Product rule

Business Office is the control plane. Users choose a work action; Business Office selects the underlying app, module, record links, credentials, approvals, proof, and audit behavior.

Business Apps are focused experiences over shared records. They do not create competing customer databases, document stores, approval systems, or audit histories.

## Installed focused apps

1. Quote Builder
2. Customer Manager
3. Work Manager
4. Field Operations
5. Document Center
6. Invoice & Payment Tracker
7. Expense & Receipt Manager
8. Field Proof
9. Social Control
10. Customer Portal
11. Request & Intake Manager
12. Price Book & Template Manager
13. Approval Center
14. Vendor & Purchase Manager
15. Maintenance Manager
16. Shop Flow Manager
17. Complete Business System

## Credential model

| Credential | Default experience | Main authority |
|---|---|---|
| Owner | Control Center | Complete control, selected-record approval and release |
| Administrator | Control Center | Administration without Owner-only decisions |
| Foreman | Field Operations | Assign crew work, task proof, receipts, quote drafts |
| Estimator | Quote Builder | Customers, quotes, price book and supporting documents |
| Field Staff | My assigned work | Clock, task instructions, proof and job receipts |
| Staff | Role-filtered actions | Assigned operational work |
| Bookkeeper | Money and documents | Receipt review, expenses and payroll preparation |
| Payroll | Time and payroll preparation | Approved payroll preparation records |
| Viewer | Read-only | Authorized views only |

The Owner account provisions Foreman, Estimator and Field Staff role/permission rows idempotently. User-specific `Customer Send Access` can extend quote-release authority without changing the base role.

## Cellphone rule

Primary cellphone screens use large action buttons rather than exposing raw module names:

- Clock In / Open Current Work
- Assign Task
- Add Job Photo
- Scan Receipt
- Create Quote
- Review Approvals
- Review Job Photos
- Social Control
- Time & Payroll

Modules remain available under **More** for browsing and administration.

## Field workflow

```text
Owner/Foreman assigns task
→ Employee opens assigned task
→ Clock In creates field session and time entry
→ Pause/Resume calculates break automatically
→ Before/Progress/Issue/Completion photos attach to task, job and customer
→ Configured proof requirements block incomplete closeout
→ Complete & Clock Out updates time and task status
→ Owner reviews photos
→ Owner may keep proof internal or share selected proof with the customer
```

No photo becomes customer-visible automatically.

## Receipt workflow

```text
Take picture or choose PDF
→ Select job/customer
→ Enter or confirm vendor/date/total/tax/category/payment method
→ Original file stored in Documents
→ Receipt record created
→ Owner review required
```

Receipt capture does **not** create an approved expense, post accounting, charge a customer, or move money.

## Quote workflow

Quote Builder remains a focused app over shared Customers, Quotes and Documents. Foreman and Estimator credentials can draft quotes. Sending remains controlled by Owner/Administrator authority or an explicit user-level Customer Send Access credential and the existing approval/send gates.

## Field proof and customer file

Each field proof stores:

- business
- task
- customer
- job
- work order
- document
- photo type
- caption
- capture user/time
- approval state
- customer visibility state

Original files remain in the internal document/customer/job history.

## Social Control

Social Control implements:

```text
Draft
→ Submit for Owner Review
→ Approve / Revise / Hold
→ Schedule internally
→ Publish Selected
→ HOLD until a configured provider and separate release approval exist
→ Mark Posted manually when posted outside the platform
```

A selected field photo must first pass Owner field-proof review. A non-field image must be classified and approved as a Social Media Asset. Owner approval applies to the selected social record, caption, platform and source document—not a bulk library.

Current social boundaries:

- provider: none
- external publishing: disabled
- automatic publishing: disabled
- bulk publishing: disabled
- selected-record only: required
- Owner approval: required

## Safety boundaries

The overhaul does not automatically:

- send quotes or customer messages
- make photos customer-visible
- post to social media
- spend advertising money
- post accounting
- move payments
- fund payroll
- file tax returns

## Simulation gates

`Business Office Control Plane Verification` runs:

- role/capability simulations
- action-filter simulations
- time-clock state transitions
- duplicate clock-in rejection
- configurable closeout-proof validation
- receipt routing and posting locks
- social draft/review/approval/publish-HOLD transitions
- live credential/proof/source validation
- direct and unified route wiring
- exact Apps Script assembly
- syntax validation of every assembled `.gs` file

A non-mutating in-app self-test is also available through `boControlSelfTest()` for post-deployment verification.

## Sign-off requirements

Before production merge/deployment:

1. All app-specific CI gates pass.
2. Owner desktop Control Center is visually reviewed.
3. Owner cellphone Control Center is visually reviewed.
4. Foreman assignment and receipt flows are tested with simulated records.
5. Field Staff clock/photo/closeout flow is tested on a phone.
6. Owner photo-review and customer-visibility controls are tested.
7. Quote draft and credential-controlled send behavior are tested.
8. Social draft/review/approval/publish-HOLD behavior is tested.
9. Backup and rollback references are recorded.
10. Rick explicitly signs off on the Highway 38 overhaul.
11. Only after sign-off is Northern Lakes examined against the accepted platform.
