# Customer Portal Security Model

Status: code/design complete enough to define the activation gate; authentication connection remains blocked.

## Allowed customer capabilities
- View only the authenticated customer's project records.
- Submit missing information and files to an approved customer folder.
- Review and approve only that customer's quotes.
- View only that customer's invoices and provider-hosted payment links.
- Download only approved deliverables explicitly released to that customer.
- Request revisions within the recorded allowance.
- View approved status and communication history.

## Never exposed
Internal notes, costs, profit, owner decisions, Proof Log, Error Log, other customers, unapproved drafts, internal-only files, provider credentials, or raw payment data.

## Enforcement
1. Authentication identity maps server-side to one Customer ID or explicitly authorized account.
2. Every record query applies the mapped Customer ID before data leaves the server.
3. File downloads use server authorization, not guessable public links.
4. Customer-visible fields use allowlists; internal fields are not merely hidden by CSS.
5. Uploads are quarantined, size/type limited, and assigned to the authenticated customer.
6. Quote approval, revision request, and download actions are selected-record, idempotent, logged, and protected from replay.
7. Sessions expire and do not permit cross-tab identity switching without reauthentication.

## Mandatory tests before activation
Cross-customer ID substitution, direct-file URL, guessed record ID, expired session, revoked account, upload type/size, stored script content, internal-field inspection, mobile session, quote replay, payment-link ownership, and delivered-file revocation.
