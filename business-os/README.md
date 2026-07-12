# Highway 38 Business OS Productization Package

This package separates the transferable **Core Engine** from the **Highway 38 Business Pack**.

## Core Engine owns
Repositories, normalized records, Unified Tasks, selected-record execution, approval gates, duplicate locks, Proof Log, Error Log, provider interfaces, roles, feature flags, tenant namespace enforcement, release channels, backup, recovery, and migrations.

## Business Pack owns
Catalog records, terminology, templates, workflow defaults, expense categories, public routes, proof labels, SOP references, and provider configuration for one business.

## Non-negotiable controls
- No tenant reads or writes without a tenant namespace.
- No external action without an explicit feature state and provider truth state.
- No bulk or ambiguous execution.
- No uncertain automatic retry.
- Provider secrets are references, never repository values.
- Production writes require a hashed rollback backup.
- Demo/test records are visibly isolated from production.

The JSON Schema and installer manifest in this folder are executable contracts for the next Core Engine installer implementation.
