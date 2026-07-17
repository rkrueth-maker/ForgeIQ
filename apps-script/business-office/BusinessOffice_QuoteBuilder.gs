/** Highway 38 Quote Builder — shared engine used by standalone and full Business Office packages. */

function boQuoteBuilderDashboard_() {
  boRequirePermission_(H38_BO_SHEETS.QUOTES, 'View');
  const quotes = boReadTable_(H38_BO_SHEETS.QUOTES).filter(function (row) { return row['Revision Status'] !== 'Superseded'; });
  const today = Utilities.formatDate(new Date(), boTimeZone_(), 'yyyy-MM-dd');
  const openStatuses = ['Draft','Internal Review','Sent','Viewed','Changes Requested'];
  const pipeline = { Draft:0, 'Internal Review':0, Sent:0, Viewed:0, Accepted:0, Declined:0, 'Changes Requested':0 };
  let openValue = 0;
  quotes.forEach(function (quote) {
    const status = boNormalizeText_(quote.Status) || 'Draft';
    if (Object.prototype.hasOwnProperty.call(pipeline, status)) pipeline[status] += 1;
    if (openStatuses.indexOf(status) >= 0) openValue += Number(quote.Total || 0);
  });
  return {
    generatedDate: today,
    metrics: {
      draftQuotes: pipeline.Draft,
      needsFollowUp: pipeline.Sent + pipeline.Viewed + pipeline['Changes Requested'],
      openQuoteValue: boMoney_(openValue)
    },
    pipeline: pipeline,
    recent: quotes.sort(function (a,b) { return String(b['Updated Time'] || b['Quote Date']).localeCompare(String(a['Updated Time'] || a['Quote Date'])); }).slice(0,12)
  };
}

function boQuoteBuilderPriceBook_(options) {
  boRequirePermission_(H38_BO_SHEETS.PRODUCTS, 'View');
  options = options || {};
  const query = boNormalizeText_(options.query).toLowerCase();
  return boReadTable_(H38_BO_SHEETS.PRODUCTS).filter(function (item) {
    if (boNormalizeText_(item.Status || 'Active') === 'Inactive') return false;
    if (!query) return true;
    return [item['Product / Service ID'], item.Name, item.Description, item.Category, item.Unit]
      .join(' ').toLowerCase().indexOf(query) >= 0;
  });
}

function boQuoteBuilderTemplates_() {
  boRequirePermission_(H38_BO_SHEETS.PDF_TEMPLATES, 'View');
  return boReadTable_(H38_BO_SHEETS.PDF_TEMPLATES).filter(function (row) {
    return boNormalizeText_(row.Status || 'Active') !== 'Inactive';
  });
}

function boDuplicateQuote_(quoteId) {
  return boSafeExecute_('Duplicate quote', function () {
    const user = boRequirePermission_(H38_BO_SHEETS.QUOTES, 'Create');
    const source = boFindRecord_(H38_BO_SHEETS.QUOTES, quoteId).record;
    const newId = boId_('QUOTE');
    const newNumber = boGetNextNumber_('Quote');
    const copy = Object.assign({}, source, {
      'Quote ID': newId,
      'Quote Number': newNumber,
      'Revision Number': 1,
      'Revision Status': 'Current',
      Status: 'Draft',
      'Approval Status': 'Owner Approval Required',
      'Send Allowed': 'No',
      'Customer Action': 'Not Sent',
      'PDF File ID': '',
      'Duplicate Key': boGetBusinessId_() + '|' + newNumber + '|1',
      'Created By': user['User ID']
    });
    delete copy.__rowNumber;
    boAppendRecord_(H38_BO_SHEETS.QUOTES, copy, 'Quote duplication');
    boReadTable_(H38_BO_SHEETS.QUOTE_LINES).filter(function (line) { return line['Quote ID'] === quoteId; }).forEach(function (line) {
      const lineCopy = Object.assign({}, line, { 'Quote Line ID': boId_('QL'), 'Quote ID': newId });
      delete lineCopy.__rowNumber;
      boAppendRecord_(H38_BO_SHEETS.QUOTE_LINES, lineCopy, 'Quote duplication');
    });
    boProof_('DUPLICATE QUOTE', 'Quote', newId, 'PASS', 'Copied from ' + source['Quote Number'], user.Email);
    return boFindRecord_(H38_BO_SHEETS.QUOTES, newId).record;
  }, 'Quote', quoteId);
}

function boPrepareAiQuoteDraft_(payload) {
  return boSafeExecute_('Prepare AI quote draft', function () {
    const user = boRequirePermission_(H38_BO_SHEETS.QUOTES, 'Create');
    payload = payload || {};
    boAssert_(payload.customerId, 'Customer selection is required.');
    boAssert_(payload.notes || (payload.photos && payload.photos.length), 'Field notes or photos are required.');
    const draftId = boId_('AIDRAFT');
    const priceBook = boQuoteBuilderPriceBook_({});
    const noteText = boNormalizeText_(payload.notes).toLowerCase();
    const suggestions = priceBook.filter(function (item) {
      const words = [item.Name, item.Description, item.Category].join(' ').toLowerCase().split(/\W+/).filter(function (word) { return word.length > 3; });
      return words.some(function (word) { return noteText.indexOf(word) >= 0; });
    }).slice(0,20).map(function (item) {
      return {
        catalogId: item['Product / Service ID'],
        description: item['Customer Description'] || item.Description || item.Name,
        quantity: '',
        unit: item.Unit || 'each',
        rate: item['Standard Selling Price'] || item.Price || '',
        priceStatus: (item['Standard Selling Price'] || item.Price) ? 'matched' : 'manual_entry_required',
        confidence: 'review_required'
      };
    });
    const staged = {
      'Activity ID': draftId,
      'Activity Type': 'AI Quote Draft',
      'Record Type': 'Customer',
      'Record ID': payload.customerId,
      Status: 'Owner Review Required',
      Summary: payload.projectTitle || 'Field-note quote draft',
      Details: JSON.stringify({
        notes: payload.notes || '',
        photos: payload.photos || [],
        suggestedLines: suggestions,
        assumptions: [],
        exclusions: [],
        missingInformation: suggestions.length ? ['Confirm quantities and scope.'] : ['No Price Book match found. Add or select items manually.'],
        pricingRule: 'AI did not invent or approve pricing.'
      }),
      'Created By': user['User ID'],
      'Created Time': boNow_()
    };
    boAppendRecord_(H38_BO_SHEETS.ACTIVITY, staged, 'AI quote draft staging');
    boProof_('PREPARE AI QUOTE DRAFT', 'Customer', payload.customerId, 'PASS', draftId, user.Email);
    return staged;
  }, 'Customer', payload && payload.customerId);
}

function boQuoteBuilderPackage_() {
  return {
    product: 'Highway 38 Quote Builder',
    sharedEngine: true,
    navigation: ['dashboard','customers','quotes','priceBook','templates','documents','reports','setup'],
    excludedModules: ['accounting','payroll','tax','employees','contractors','purchaseOrders','vendorBills','expenses'],
    approvalRule: 'Owner approval required before customer release.',
    aiRule: 'AI may stage descriptions and Price Book matches but may not set final prices, approve, or send.'
  };
}
