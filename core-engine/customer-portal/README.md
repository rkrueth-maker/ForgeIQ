# Secure Customer Portal Core

This package implements the provider-neutral security and workflow layer for Issue #33. It is intentionally **not activated** until a production identity provider, private storage provider, malware scanner, hosted payment provider, server runtime, and domain/session configuration are selected and tested.

## Implemented core

- signed, time-limited customer sessions;
- session revocation support;
- tenant isolation;
- customer-own record authorization;
- recursive removal of internal fields;
- private upload intents with quarantine and malware-scan requirements;
- version-checked, single-use quote approvals;
- provider-hosted payment-link validation without raw card storage;
- short-lived, customer-scoped download grants;
- revision requests routed to owner review;
- customer messages recorded without automatic outbound sends;
- Proof Log and Error Log entries;
- no bulk execution or uncertain automatic retry.

## Not activated

The library does not create a public login, store a password, accept raw card data, transmit files, charge a card, send an email, deliver a final file, or expose a customer record. The public `customer-portal.html` remains a truthful activation-status page until the exact blockers below are resolved.

## Production connection requirements

1. Select an identity provider supporting secure server-side validation, short session lifetime, revocation, and tenant/customer claims.
2. Configure a server runtime. Static GitHub Pages cannot securely hold session secrets or private provider credentials.
3. Select private object storage with tenant/customer namespaces, deny-public-access controls, and signed download support.
4. Configure quarantine plus malware scanning before an upload can become available to the owner or customer.
5. Select a provider-hosted payment flow. Card entry must remain entirely on the payment provider's hosted page.
6. Configure production domain, secure cookies, CSRF controls, CSP, rate limiting, audit retention, and error monitoring.
7. Run cross-customer and cross-tenant tests in the selected production stack.
8. Obtain Rick's approval to enable the customer-portal feature flag and each external action separately.

## Verification

```bash
node scripts/verify-customer-portal-core.js
```

The verifier uses synthetic records only and tests:

- token tampering, expiration, revocation, and secret length;
- unapproved permissions;
- cross-tenant and cross-customer denial;
- private-field removal;
- upload type, size, extension, traversal, quarantine, and private-path controls;
- quote version and duplicate approval locks;
- approved hosted payment provider and HTTPS-only links;
- rejection of payment URLs containing credentials;
- scoped and expiring download grants;
- owner-review routing for revisions and customer messages;
- Proof/Error behavior and disabled automatic retry;
- absence of live secrets and raw payment-card data.

Evidence is written to:

- `launch-control/evidence/customer-portal-core-verification.json`
- `launch-control/evidence/customer-portal-security-sample.json`

These files demonstrate the tested core. They are not proof of a connected identity, storage, payment, or communications provider.
