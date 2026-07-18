/** Quote Builder grouped writes and number sequencing. */

function boQuoteBuilderNextNumber_(recordType) {
  const started = Date.now();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const snapshot = boQuoteBuilderSnapshot_(H38_BO_SHEETS.NUMBER_SEQUENCES, { includeVoided: true });
    const sequence = snapshot.rows.find(function (row) { return row['Record Type'] === recordType && row.Status === 'Active'; });
    boAssert_(sequence, 'No active number sequence for ' + recordType + '.');
    const year = Utilities.formatDate(new Date(), boTimeZone_(), 'yyyy');
    const next = Number(sequence['Next Number'] || 1);
    const padding = Number(sequence.Padding || 4);
    const number = sequence.Prefix + '-' + year + '-' + String(next).padStart(padding, '0');
    const after = Object.assign({}, sequence, { 'Next Number': next + 1, 'Last Issued': number });
    delete after.__rowNumber;
    if (snapshot.headers.indexOf('Updated Time') >= 0) after['Updated Time'] = boNow_();
    snapshot.sheet.getRange(sequence.__rowNumber, 1, 1, snapshot.headers.length).setValues([boMapRow_(snapshot.headers, after)]);
    boAudit_('UPDATE', H38_BO_SHEETS.NUMBER_SEQUENCES, sequence['Sequence ID'], sequence, after, 'Quote Builder number sequence');
    boQuoteBuilderTiming_('number_sequence', started, { recordType: recordType });
    return number;
  } finally {
    lock.releaseLock();
  }
}

function boCreateQuoteFast_(payload) {
  return boSafeExecute_('Create quote', function () {
    const started = Date.now();
    const access = boQuoteBuilderRequireAction_('Create');
    boAssert_(payload && payload.customerId, 'Customer selection is required.');
    boAssert_(Array.isArray(payload.lines) && payload.lines.length, 'At least one quote line is required.');

    const customerSnapshot = boQuoteBuilderSnapshot_(H38_BO_SHEETS.CUSTOMERS);
    const customer = customerSnapshot.rows.find(function (row) { return row['Customer ID'] === payload.customerId; });
    boAssert_(customer, 'The selected customer was not found.');

    const quoteNumber = boQuoteBuilderNextNumber_('Quote');
    const quoteId = boId_('QUOTE');
    const quoteSnapshot = boQuoteBuilderSnapshot_(H38_BO_SHEETS.QUOTES, { includeVoided: true });
    const lineSnapshot = boQuoteBuilderSnapshot_(H38_BO_SHEETS.QUOTE_LINES, { includeVoided: true });
    const duplicateKey = boGetBusinessId_() + '|' + quoteNumber + '|1';
    boAssert_(!quoteSnapshot.rows.some(function (row) {
      return row['Duplicate Key'] === duplicateKey && row.Status !== 'Voided' && row['Is Voided'] !== 'Yes';
    }), 'Duplicate protection blocked this quote.');

    let subtotal = 0;
    let tax = 0;
    const lineRecords = payload.lines.map(function (line, index) {
      const quantity = Number(line.quantity || 0);
      const rate = boMoney_(line.rate || 0);
      const discount = boMoney_(line.discount || 0);
      const taxable = line.taxable === true || line.taxable === 'Yes' ? 'Yes' : 'No';
      const taxRate = Number(line.taxRate || 0);
      const lineSubtotal = boMoney_(Math.max(0, quantity * rate - discount));
      const taxAmount = taxable === 'Yes' ? boMoney_(lineSubtotal * taxRate) : 0;
      subtotal += lineSubtotal;
      tax += taxAmount;
      return {
        'Quote Line ID': boId_('QL'),
        'Quote ID': quoteId,
        'Line Number': index + 1,
        'Product / Service ID': line.catalogId || '',
        Description: line.description || '',
        Quantity: quantity,
        Unit: line.unit || 'each',
        Rate: rate,
        Discount: discount,
        Taxable: taxable,
        'Tax Rate': taxRate,
        'Line Subtotal': lineSubtotal,
        'Tax Amount': taxAmount,
        'Line Total': boMoney_(lineSubtotal + taxAmount),
        'Account Code': line.accountCode || '4000',
        'Job Cost Category': line.jobCostCategory || 'Service Revenue',
        Notes: line.notes || ''
      };
    });
    const total = boMoney_(subtotal + tax);
    const quote = {
      'Quote ID': quoteId,
      'Quote Number': quoteNumber,
      'Customer ID': customer['Customer ID'],
      'Job ID': payload.jobId || '',
      'Project Title': payload.projectTitle || 'Customer project',
      'Revision Number': 1,
      'Revision Status': 'Current',
      'Quote Date': payload.quoteDate || Utilities.formatDate(new Date(), boTimeZone_(), 'yyyy-MM-dd'),
      'Expiration Date': payload.expirationDate || '',
      Status: 'Draft',
      'Approval Status': 'Owner Approval Required',
      'Send Allowed': 'No',
      'Customer Action': 'Not Sent',
      'Payment Terms': payload.paymentTerms || customer['Payment Terms'] || 'Net 15',
      Scope: payload.scope || '',
      Assumptions: payload.assumptions || '',
      Exclusions: payload.exclusions || '',
      'Internal Notes': payload.internalNotes || '',
      'Customer Notes': payload.customerNotes || '',
      Subtotal: boMoney_(subtotal),
      Tax: boMoney_(tax),
      Deposit: boMoney_(payload.deposit || 0),
      Total: total,
      'Duplicate Key': duplicateKey,
      'Created By': access.user.id
    };

    boQuoteBuilderAppendBatch_(quoteSnapshot, [quote]);
    boQuoteBuilderAppendBatch_(lineSnapshot, lineRecords);
    SpreadsheetApp.flush();
    boAudit_('CREATE', H38_BO_SHEETS.QUOTES, quoteId, {}, quote, 'Quote Builder grouped write: header + ' + lineRecords.length + ' lines');
    boProof_('CREATE QUOTE', 'Quote', quoteId, 'PASS', quoteNumber + '; ' + lineRecords.length + ' lines batched', access.user.email);
    boQuoteBuilderInvalidateCache_('quotes');
    boQuoteBuilderTiming_('create_quote_grouped', started, { lines: lineRecords.length, total: total });
    return quote;
  }, 'Quote', payload && payload.quoteId);
}
