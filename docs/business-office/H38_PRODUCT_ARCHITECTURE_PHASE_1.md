# H38 Product Architecture — Phase 1 Foundation

## Production baseline

- Repository: `rkrueth-maker/highway-38-solutions`
- Baseline commit: `63335ccdadfa624efee4d667d02d864d19763251`
- Production authority: `Deploy Unified Owner Portal`
- Deployment rule: update the existing unified Apps Script project and existing Owner Portal and Business Office deployment IDs in place
- External actions: disabled or exact owner-confirmed

## Technical map

### Existing implementation retained

- `apps-script/business-office/BusinessOffice_ModuleRegistry.gs`
  - Keeps `boGetBusinessAppCatalog_()` and every focused legacy product.
  - Adds `boGetProductPackCatalog_()` beside the legacy catalog.
  - Adds `boGetLegacyProductPackAliasMap_()` and `boResolveLegacyProductPack_()`.
  - Does not remove or rename legacy products.

- `apps-script/core-engine/owner-portal-next/Portal_Application_UX.js`
  - Existing Module Manager remains the source for enabled state, dependencies, role visibility, record counts, last-used telemetry, and record-preserving disable behavior.
  - No module-change logic was replaced.

- `apps-script/core-engine/owner-portal-next/Portal_Unified.js`
  - Existing navigation and routes remain unchanged.
  - Foreman and Employee continue as role-specific experiences rather than standalone products.

- `apps-script/business-office/BusinessOffice_AI_Assistant.gs`
- `apps-script/business-office/BusinessOffice_AI_Actions.gs`
  - Existing AI usage telemetry, recommendation foundation, exact confirmation flow, and protected-action boundaries remain unchanged.

### New foundation

- `apps-script/core-engine/owner-portal-next/Portal_ProductArchitecture.js`
  - Adds a read-only `h38PortalProductArchitecture()` server endpoint.
  - Returns packs, specialist add-ons, module membership, installed state, availability, dependencies, role visibility, record counts, last-used information, legacy aliases, and route-preservation metadata.
  - Adds `h38PortalResolveLegacyProduct()` for deterministic legacy-product resolution.
  - Performs no module enable or disable, migration, deployment, permission change, purchase, financial action, communication, payroll action, tax action, or other external action.

### Regression gates

- `scripts/verify-product-pack-architecture.js`
  - Parses and executes the new catalog and server endpoint in a simulated Apps Script runtime.
  - Verifies all legacy product keys and routes remain present.
  - Verifies five main packs and five specialist add-ons.
  - Verifies Owner, Administrator, Foreman, Employee, Bookkeeper, Payroll, Viewer, Staff, Estimator, Field Staff, and Customer boundaries.
  - Rejects protected writes or automatic installation behavior.

- `scripts/verify-business-office.js`
  - Requires the legacy registry and new verifier.
  - Runs the product-architecture regression gate inside the existing Business Office PR and production deployment gates.

## Pack structure

1. H38 Core
2. Sales & Customer Pack
3. Operations Pack
4. Finance & Office Pack
5. Growth Pack
6. Specialist add-ons:
   - Equipment & Maintenance
   - Shop Flow / Manufacturing
   - Customer Portal Advanced Features
   - Advanced Purchasing
   - Advanced Financial Controls

## Migration behavior

Phase 1 is an alias-only compatibility layer.

- Existing products remain available under their legacy names.
- Existing routes remain unchanged.
- Existing records, documents, proof, errors, permissions, approvals, audit history, and integrations remain in place.
- No module is automatically disabled.
- No pack or add-on is automatically installed or enabled.
- Future Product Center and Upgrade Advisor work can consume the read-only server snapshot without destructive migration.
