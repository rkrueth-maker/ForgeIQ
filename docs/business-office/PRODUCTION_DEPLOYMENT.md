# Business Office Production Deployment

Issue #85 production deployment is controlled by `.github/workflows/business-office.yml`.

Source merge commit: `761ff8ba9346762fa2b70f664524411fa6bce58b`

The production workflow must create separate private Apps Script projects, configure the private Business Office workbook and folders, execute live upload/OCR/PDF/role/approval/accounting/payroll/tax acceptance, preserve the existing intake route, and retain external-action locks.

This record intentionally triggers the first production deployment after the complete source merge.
