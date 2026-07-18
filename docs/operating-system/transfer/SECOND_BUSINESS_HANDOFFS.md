# Second-Business Packaging — Cross-Workstream Handoffs

Authority: 01 — Command Center  
Repository: `rkrueth-maker/highway-38-solutions`  
Source branch: `main`  
Accepted starting implementation: `a1cb5a15572b3538f4af04ae332d9a4d20514496`  
Tracking issue: #145

## Shared objective

Prepare the existing Highway 38 Business System for a controlled second-business pilot from one shared codebase. Preserve Highway 38 production and all approval/external-action locks. The second business must use separate customer-owned resources and a separately verified deployment.

## 01 — Command Center

Own final authority, sequencing, source-of-truth decisions, conflict resolution, release gates, and final acceptance.

Required actions:

- approve the pilot business and selected product package
- approve package scope, pricing posture, and deployment ownership model
- prevent production work from altering Highway 38 live IDs or data
- require verified returns from every workstream
- record final source commit, Business Pack version, deployment evidence, rollback baseline, limitations, and PASS/FAIL

Required return:

- approved pilot charter
- dependency order
- decision log
- final acceptance record

## 02 — Build & Automation

Own repository implementation, configuration validation, installer/setup workflow, deployment, tests, and technical production verification.

Required actions:

- audit current code into Reusable Core, Highway 38 Business Pack, customer configuration, production-only data, and archive/history
- implement a sanitized configuration template and preflight validator
- implement a Business Pack manifest and module-selection mechanism
- create a repeatable customer-owned setup/deployment workflow
- protect Highway 38 production IDs and deployment targets
- preserve direct Quote Builder routing, grouped writes, camera workflow, private document storage, authentication, roles, approvals, and logs
- add second-business clean-install and acceptance verification
- produce LOCAL, target source, target deployment, and rollback evidence

Required return:

- changed-file list
- configuration and installer documentation
- test results
- target resource inventory
- production verification evidence
- defects, limitations, and rollback instructions

## 03 — Operations & Documentation

Own operator procedures, administration, training, maintenance, recovery, quality controls, and durable acceptance records.

Required actions:

- update the Operations Manual for a generic customer installation
- create first-run, daily-use, user-access, Quote Builder, document, approval, backup, maintenance, and recovery procedures
- define temporary test-record cleanup and soft-void rules
- create customer training and administrator checklists
- verify terminology no longer depends on Rick or Highway 38 where reuse is intended
- align procedures with the refreshed transfer checklist

Required return:

- operator pack
- administrator pack
- training checklist
- maintenance and recovery schedule
- acceptance-test record template

## 04 — Business & Growth

Own sellable packaging, market position, pricing, pilot offer, customer-facing scope, onboarding promise, and upgrade path.

Required actions:

- finalize two packages: standalone Quote Builder and full Business System with Quotes & Proposals
- define included modules, excluded modules, setup services, support, customization boundaries, and upgrade path
- define pilot pricing and standard future pricing without overpromising one-click installation
- prepare customer-facing product descriptions, demo flow, onboarding expectations, and acceptance criteria
- identify the best second-business pilot profile and qualification rules

Required return:

- product family map
- package comparison
- pilot offer and pricing recommendation
- onboarding promise
- customer qualification checklist
- launch and proof plan

## 05 — Core Engine Product

Own reusable architecture, product boundaries, Business Pack contract, configuration contract, release management, licensing options, white-label requirements, and next-business readiness.

Required actions:

- formalize the Reusable Core / Business Pack / Customer Configuration contracts
- define supported extension points and prohibited hard-coding
- define release manifest, compatibility policy, migration approach, and versioning
- define installer maturity levels and the requirements for one-click designation
- define licensing, ownership, managed-hosting, customer-owned deployment, and white-label options
- review legacy dependencies and identify anything that blocks clean transfer

Required return:

- architecture boundary document
- Business Pack contract
- configuration contract
- release-management plan
- licensing and white-label options
- next-business readiness checklist

## Shared non-negotiable controls

- no Highway 38 customer data, Rick private files, secrets, credentials, or production-only IDs in the reusable package
- no changes to Highway 38 production unless separately authorized and verified
- no automatic customer messages, email, SMS, payments, approvals, publishing, or work start
- no AI approval of external actions
- preserve owner approval, duplicate controls, Proof Log, Error Log, timing logs, authentication, roles, and private document permissions
- preserve integrated Quote Builder camera behavior and private Quote Field Photo classification
- verify target production before reporting PASS

## Integration order

1. Command Center approves pilot charter and product package.
2. Core Engine Product freezes contracts and packaging boundaries.
3. Business & Growth freezes the pilot offer and Business Pack requirements.
4. Build & Automation implements configuration, installer, separation, and verification.
5. Operations & Documentation completes procedures and training against the working build.
6. Real-device and production acceptance run is completed.
7. Command Center records final acceptance and authorizes the next customer run.
