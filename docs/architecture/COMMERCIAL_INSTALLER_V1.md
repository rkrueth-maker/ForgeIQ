# Commercial Installer v1

## Status

This implementation establishes the first executable Commercial Install Acceptance layer authorized by the Command Center decision record.

It adds:

- Business Pack Manifest v1 contract
- Product Package Manifest v1 contract
- Installation Manifest v1 contract
- Quote Builder v1 entitlement
- Business System v1 entitlement
- business-pack migration preview and canonical role mapping
- installation phase state machine
- deterministic idempotency keys
- sanitized discover-or-create resource adapter
- quarantine-first failed-resource handling
- Quote Builder-to-Business-System upgrade preservation checks
- sanitized test fixture with no real business resource IDs
- manual-only, read-only GitHub Actions acceptance workflow

It does not change Highway 38 production, Northern Lakes production, or activate any external provider.

## Authoritative workflow

The authoritative entry point is:

```text
.github/workflows/commercial-install-acceptance.yml
```

The workflow is `workflow_dispatch` only. It has no push trigger, no repository write permission, no production deployment command, no Northern Lakes deployment command, and no Google resource provisioning command.

The workflow supports the approved operation names:

- `NEW_INSTALL`
- `VALIDATE_ONLY`
- `RESUME`
- `REPAIR`
- `UPGRADE`
- `ROLLBACK_VERIFY`
- `CONTROLLED_ACCEPTANCE`

`NEW_INSTALL` execution is currently limited to `sanitized-test`. Customer-assisted and controlled beta inputs may be validated, but actual customer-owned Google provisioning remains gated until the Owner authorization adapter is connected and separately accepted.

## Installer phases

The Installation Manifest records these phases in order:

1. Preflight
2. Identity and ownership validation
3. Business Pack validation
4. Resource planning
5. Resource provisioning
6. Core installation
7. Product entitlement
8. Role and permission configuration
9. Price Book and template seeding
10. Portal and integration configuration
11. Verification
12. Acceptance
13. Commit
14. Recovery or quarantine

Each phase receives a deterministic idempotency key derived from the installation ID, operation, phase, input hash, and target product version.

## External-action locks

Every new Business Pack and Installation Manifest defaults to:

- external actions disabled
- Customer Portal unreleased
- automatic customer email disabled
- automatic customer SMS disabled
- automatic payment actions disabled
- automatic work start disabled
- Owner approval required

Provider states are independent. Configuring one provider does not enable any other provider.

## Roles

Canonical internal roles are:

- Owner
- Administrator
- Staff
- Viewer

Legacy roles are previewed before migration:

- Operator becomes Staff plus selected operating permissions.
- Reviewer becomes Viewer plus review permission.
- Bookkeeper becomes Staff plus financial-preparation permissions.
- Payroll becomes Staff plus payroll-preparation permissions.
- Customer becomes a Customer Portal access profile and not an internal business role.

No migration adapter directly rewrites a live package. The adapter returns a source hash, classification, migration preview, canonical manifest, and approval requirement.

## Quote Builder entitlement

Quote Builder receives a focused shell over the shared Core. Its Product Package Manifest includes customers, quotes, versions, options, add-ons, Price Book, templates, files, proposal preview, PDF, quote-specific approvals, controlled customer decisions, activity, backup, Proof Log, and Error Log.

Operational routes, server functions, storage, permissions, and reports are explicitly excluded instead of being hidden in the client.

## Business System entitlement

The Business System extends Quote Builder and adds requests, work, jobs, work orders, tasks, documents, communications, purchases, expenses, invoices, payments, operational approvals, full reports, Customer Portal, maintenance, field proof, and administration.

The upgrade contract requires preservation of the installation identity, customer records, quotes and versions, files, Price Book, templates, numbering, roles, logs, backups, and existing resource references.

## Quarantine-first recovery

A failed resource is automatically removable only when it is:

- created by the current attempt
- not pre-existing
- uncommitted
- empty
- unshared
- unreferenced
- still in the created-uncommitted state

Everything else is quarantined for 30 days and requires an Owner decision for deletion. Expiration does not authorize automatic deletion.

## Sanitized fixture

The automated fixture is:

```text
core-engine/product/fixtures/sanitized-property-services-business.v1.json
```

It contains no Highway 38 identity, Northern Lakes identity, production credentials, Google resource IDs, payment identifiers, SMS identifiers, provider tokens, or customer records.

Northern Lakes remains eligible only for controlled manual beta acceptance after sanitized tests pass.

## Verification

Run:

```bash
node scripts/verify-commercial-installer.js
```

The verifier checks:

- required contracts and packages
- JSON parsing
- manifest validation
- sanitized fixture isolation
- Quote Builder exclusions
- Business System extension
- external-action locks
- 14-phase sanitized installation
- idempotent repeated resource discovery
- quarantine retention and Owner cleanup requirement
- legacy migration preview and role mapping
- upgrade preservation
- manual-only/read-only workflow boundaries

Evidence is written to:

```text
artifacts/commercial-install-acceptance/
```

## Protected production boundary

The existing Highway 38 production workflow remains the only workflow authorized to update the Highway 38 deployment. This commercial workflow does not invoke it.

The Northern Lakes deployment workflow also remains separate and is not invoked by Commercial Install Acceptance.

## Remaining implementation gate

Before customer-owned live provisioning is permitted, the next implementation phase must add and accept:

1. Customer Owner OAuth handoff and expiration/removal process.
2. Discover-or-create Google Drive, Sheets, Apps Script project, and deployment adapters.
3. Durable customer-owned Installation Manifest storage outside ephemeral workflow artifacts.
4. Apps Script source upload and deployment tests against a sanitized Google test account.
5. Repair, resume, rollback, and quarantine tests using real sanitized Google resources.
6. Controlled second-business acceptance before any commercial public claim.

Until those pass, the workflow produces validation and sanitized acceptance evidence only.
