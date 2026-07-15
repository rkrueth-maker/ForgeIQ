/** Temporary token-protected acceptance endpoint for a newly provisioned Business Office installation. */
const BO_CLEAN_ACCEPTANCE_TOKEN = '__BO_CLEAN_ACCEPTANCE_TOKEN__';

function doPost(e) {
  try {
    const request = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!request.token || request.token !== BO_CLEAN_ACCEPTANCE_TOKEN) {
      throw new Error('Unauthorized clean-install acceptance request.');
    }
    const payload = request.payload || {};
    let result;
    if (request.action === 'health') result = boCleanHealth_();
    else if (request.action === 'bootstrap') result = boBootstrapInstall(payload);
    else if (request.action === 'validate') result = boValidateInstallation();
    else if (request.action === 'selfTest') result = boRunSelfTest();
    else if (request.action === 'render') result = { html: boGetRenderedWebAppHtml() };
    else if (request.action === 'liveAccept') result = boRunCleanLiveAcceptance_(payload);
    else throw new Error('Unsupported clean-install acceptance action: ' + request.action);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, result: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : ''
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function boCleanHealth_() {
  const pack = boGetBusinessPack_();
  return {
    status: 'PASS',
    installationId: pack.installationId,
    businessId: pack.business.id,
    businessName: pack.branding.businessName,
    version: BO_PLATFORM.VERSION,
    externalActionsEnabled: BO_PLATFORM.EXTERNAL_ACTIONS_ENABLED,
    directPaymentProcessing: BO_PLATFORM.DIRECT_PAYMENT_PROCESSING,
    directPayrollFunding: BO_PLATFORM.DIRECT_PAYROLL_FUNDING,
    directTaxFiling: BO_PLATFORM.DIRECT_TAX_FILING
  };
}

function boRunCleanLiveAcceptance_(payload) {
  const owner = boRequireOwner_();
  const suffix = Utilities.getUuid().slice(0, 8).toUpperCase();
  const customer = boAppendRecord_(BO_SHEETS.CUSTOMERS, {
    'Customer ID': 'CLEAN-CUSTOMER-' + suffix,
    'Customer Number': 'C-' + suffix,
    'Display Name': 'Clean Installation Test Customer',
    'Customer Type': 'Business',
    Email: 'clean.customer@example.invalid',
    'Payment Terms': 'Net 15',
    'Tax Status': 'Review Required',
    Tags: 'Controlled Clean Installation Test',
    Status: 'Active',
    'Attention Status': 'None',
    Notes: 'Isolated acceptance record; no customer action.'
  }, 'Clean-install acceptance');

  const quote = boAppendRecord_(BO_SHEETS.QUOTES, {
    'Quote ID': 'CLEAN-QUOTE-' + suffix,
    'Quote Number': 'Q-' + suffix,
    'Customer ID': customer['Customer ID'],
    'Project Title': 'Clean Business Office Acceptance',
    'Revision Number': 1,
    'Revision Status': 'Current',
    'Quote Date': Utilities.formatDate(new Date(), boGetTimeZone_(), 'yyyy-MM-dd'),
    Status: 'Prepared',
    'Approval Status': boApprovalText_('required'),
    'Send Allowed': 'No',
    'Customer Action': 'None',
    'Payment Terms': 'Net 15',
    Scope: 'Verify isolated quote and neutral PDF generation.',
    Assumptions: 'Controlled acceptance only.',
    Exclusions: 'No sending, payment, delivery, or publication.',
    Subtotal: 100,
    Discount: 0,
    Tax: 0,
    Deposit: 0,
    Total: 100,
    'Duplicate Key': boGetBusinessId_() + '|CLEAN|' + suffix,
    'Created By': owner['User ID']
  }, 'Clean-install acceptance');

  const document = boUploadDocument(payload.document || {});
  const extraction = boExtractDocument(document['Document ID']);
  let duplicateBlocked = false;
  try {
    boUploadDocument(payload.document || {});
  } catch (duplicateError) {
    duplicateBlocked = /Duplicate upload blocked/i.test(duplicateError.message || String(duplicateError));
  }
  boAssert_(duplicateBlocked, 'Duplicate-upload protection did not block the repeated file.');

  const pdf = boGeneratePdf('Quote', quote['Quote ID']);
  const html = boGetRenderedWebAppHtml();
  const evidenceText = JSON.stringify({ customer: customer, quote: quote, document: document, extraction: extraction, pdf: pdf, html: html });
  const leakage = /Highway\s*38|\bH38\b|rkrueth-maker|highway-38-solutions|AKfyc/i.test(evidenceText);
  boAssert_(!leakage, 'Highway 38 identity or deployment data leaked into the clean installation.');
  boAssert_(customer['Business ID'] === boGetBusinessId_(), 'Customer business isolation failed.');
  boAssert_(quote['Business ID'] === boGetBusinessId_(), 'Quote business isolation failed.');
  boAssert_(document['Business ID'] === boGetBusinessId_(), 'Document business isolation failed.');
  boAssert_(pdf && pdf.fileId && pdf.delivered === false && pdf.sent === false, 'Neutral PDF generation failed or crossed an external-action boundary.');

  const errors = boReadTable_(BO_SHEETS.ERROR_LOG, { includeVoided: true }).filter(function (row) {
    return row.Status !== 'Resolved' && row.Severity !== 'Warning';
  });
  boAssert_(errors.length === 0, 'Critical clean-install errors found: ' + errors.length);
  const proof = boReadTable_(BO_SHEETS.PROOF_LOG, { includeVoided: true });
  boAssert_(proof.length > 0, 'Proof Log did not record clean-install activity.');

  return {
    status: 'PASS',
    installationId: boGetInstallationId_(),
    businessId: boGetBusinessId_(),
    businessName: boGetBranding_().businessName,
    customerId: customer['Customer ID'],
    quoteId: quote['Quote ID'],
    documentId: document['Document ID'],
    documentFileId: document['File ID'],
    ocrState: extraction.state || '',
    pdfFileId: pdf.fileId,
    duplicateBlocked: duplicateBlocked,
    proofRows: proof.length,
    criticalErrors: errors.length,
    externalActionsOccurred: false,
    paymentProcessed: false,
    payrollFundsMoved: false,
    taxReturnFiled: false,
    customerMessageSent: false,
    deliveryOccurred: false
  };
}
