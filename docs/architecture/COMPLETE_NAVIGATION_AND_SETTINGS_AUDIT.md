# Complete Navigation and Settings Audit

Source baseline: `f79d659bcf655216424f59463a7501a7e8b2a202`

Purpose: review every visible Business Office navigation option, every heading, route ownership, and the complete Settings/System Health boundary before making another navigation change.

## Canonical headings and visible options

### Today

1. Overview
2. My Work
3. Approvals
4. Calendar

### Customers

1. New Requests
2. Customers
3. Quotes
4. Communications
5. SMS Consent

### Work

1. Work Orders
2. Jobs
3. Time Tracking
4. Equipment

### Money

1. Invoices
2. Payments
3. Expenses
4. Vendors
5. Purchase Orders
6. Vendor Bills
7. Receipts
8. Accounting Prep
9. Payroll Prep
10. Tax Prep
11. Reports

### Documents

1. Files & OCR
2. Templates

### Growth

1. Growth Center
2. Website
3. Social
4. Advertising

### Office

1. Apps & Modules
2. Business Setup
3. Users & Roles
4. Employees
5. Contractors & W-9
6. Backups
7. Proof Log
8. Error Log
9. System Health
10. Settings
11. Help & SOPs

## Settings page contents checked

The current Settings route renders a page titled **Settings & Safety** with:

- Application details
- Installation details
- Safety state
- Non-destructive self-test
- Accounting CSV export
- Integration contracts

## Initial findings for the next pass

1. The navigation label says **Settings**, while the page says **Settings & Safety**. The label and page purpose should match.
2. **Accounting CSV** is a Money/Accounting function. It should be evaluated for relocation to Accounting Prep or Reports rather than remaining inside Settings.
3. Settings & Safety and System Health both expose integration and safety information. The next implementation should define a clear boundary:
   - System Health: live status, blockers, integration health, and operating failures.
   - Settings & Safety: configuration, safety controls, diagnostics, and controlled preferences.
4. Quotes and Reports are now in their corrected headings and must remain there.
5. Hidden capabilities such as Quote Builder, Customer Portal, H38 AI, and approval-data services must remain out of the visible navigation unless they receive an approved route.

## Acceptance rules for this pass

- Check all seven headings and every visible option, not only changed items.
- Check exact order, route uniqueness, renderer ownership, permissions, dependencies, loading strategy, cache policy, and external-action policy.
- Check the actual Settings page contents, not just its navigation label.
- Preserve one unified Business Office, one module contract, existing records, permissions, approvals, deployment IDs, Proof Log, Error Log, backups, and audit history.
- Do not enable automatic sends, payments, posting, publishing, deployment, or destructive actions.

Automated audit: `node scripts/audit-complete-navigation-and-settings.js`
