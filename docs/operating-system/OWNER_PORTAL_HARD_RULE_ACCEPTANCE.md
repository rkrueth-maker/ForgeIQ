# Owner Portal Hard-Rule Acceptance

## Scope

This package completes the code-controlled owner experience portion of Issue #33 while preserving the existing integrated Apps Script architecture and private deployment boundary.

## Source acceptance

The package is acceptable for merge only when both verifiers pass:

```bash
node scripts/verify-owner-portal-next.js
node scripts/verify-owner-portal-hard-rule.js
```

The hard-rule verifier produces:

`launch-control/evidence/owner-portal-hard-rule-verification.json`

## Implemented surfaces

1. Today
2. Needs Rick’s Decision
3. Active Work
4. Money Center
5. Growth Center
6. Website Center
7. System Health
8. Grouped navigation and global quick create
9. Universal search and owner-persistent saved views
10. Task list, board, and calendar views
11. Customer 360 and Job 360
12. Persistent selected-task action rail
13. Document, image, and video link previews
14. Next-action guidance and status states
15. Mobile record cards
16. SOP/help access
17. Structured Settings, self-test output, and integration health without raw JSON in normal operation

## Hard-rule preservation

- Owner-only access remains mandatory.
- The existing bound project and private deployment remain the only production destination.
- Selected-record execution remains mandatory.
- Duplicate locks, catalog checks, Proof Log, and Error Log are unchanged.
- Bulk execution, triggers, and uncertain automatic retry remain disabled.
- External actions remain locked.
- No raw card data, credentials, customer records, or private files are introduced into the repository.

## Deployment status

The merge is a source release, not a production-write claim. Production deployment remains HOLD until the exact requirements in:

`launch-control/activation/owner-portal-hard-rule-deployment-2026-07-12.json`

are satisfied.

The deployment must:

- create a rollback backup before writing;
- push only to the existing bound Apps Script project;
- update only the existing private deployment;
- preserve owner-only access and external-action locks;
- pass the non-destructive self-test;
- pass desktop and mobile manual acceptance;
- record the deployment ID, rollback reference, test results, and screenshots in Issue #33 and Issue #31.
