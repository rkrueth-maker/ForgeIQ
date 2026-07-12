# Revenue Operations Control Core

This package implements the provider-neutral control layer for Issue #36. It prepares and records revenue, contract, communication, publishing, website, and accounting workflows without silently executing external actions.

## Implemented

- bounded contract creation, activation, usage, overage, renewal, and cancellation states;
- selected-record quote, invoice, payment-request, receipt, refund, delivery, follow-up, social, advertising, website, and accounting actions;
- owner approval and duplicate-action locks;
- exact activation-blocker reporting;
- provider-result recording with provider reference, uncertainty hold, and no automatic retry;
- provider-hosted payment-link validation without raw card storage;
- invoice, payment, expense, credit, and refund transaction records;
- product, bundle, add-on, contract, and subscription revenue classes;
- profitability, outstanding-balance, cash/accounting CSV, and campaign-attribution calculations;
- communications drafts;
- social drafts and internal schedules;
- website changes with rollback references;
- Proof Log and Error Log entries.

## External actions remain disabled

The default configuration does not send email, send quotes or invoices, request or process payment, issue a refund, deliver final files, publish social content, spend advertising money, deploy a website, or synchronize an accounting provider.

A prepared action must remain on hold unless all of these are true:

1. the exact record is selected;
2. duplicate protection is active;
3. Rick approved the current action version;
4. the provider is connected;
5. credentials are present outside the repository;
6. regression tests passed;
7. rollback protection is ready;
8. Proof Log and Error Log behavior is verified;
9. the specific workflow flag and global external-actions switch are deliberately enabled.

Failed or uncertain provider results are recorded without automatic retry.

## Payment security

Card entry must occur entirely on an approved provider-hosted page. Raw card numbers, CVV/CVC, payment credentials, and provider secrets are forbidden in browser code, repository files, sheets, logs, and exported accounting data.

## Verification

```bash
node scripts/verify-revenue-operations-core.js
```

The verifier uses synthetic records only. It tests contract controls, selected-record enforcement, owner approval, duplicate locks, provider blockers, uncertain-result handling, hosted-payment URL controls, raw-card rejection, profitability, balances, accounting export, attribution, communication drafts, unpublished social drafts, undeployed website changes, rollback references, and Proof/Error behavior.

Generated evidence:

- `launch-control/evidence/revenue-operations-core-verification.json`
- `launch-control/evidence/revenue-operations-sample.json`
- `launch-control/evidence/revenue-operations-accounting.csv`

These artifacts prove the controlled core and calculations. They do not represent a connected provider or completed external transaction.
