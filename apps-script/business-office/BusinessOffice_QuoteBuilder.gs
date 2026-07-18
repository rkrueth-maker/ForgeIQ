/** Highway 38 Quote Builder — shared engine used by standalone and full Business Office packages. */

function boQuoteBuilderDashboard_() {
  const started = Date.now();
  boQuoteBuilderRequireAction_('View');
  const cached = boQuoteBuilderCacheGet_('dashboard');
  if (cached) {
    boQuoteBuilderTiming_('dashboard_cache_hit', started, { recent: cached.recent.length });
    return cached;
  }
  const snapshot = boQuoteBuilderSnapshot_(H38_BO_SHEETS.QUOTES);
  const quotes = snapshot.rows.filter(function (row) { return row['Revision Status'] !== 'Superseded'; });
  const today = Utilities.formatDate(new Date(), boTimeZone_(), 'yyyy-MM-dd');
  const openStatuses = ['Draft','Internal Review','Sent','Viewed','Changes Requested'];
  const pipeline = { Draft:0, 'Internal Review':0, Sent:0, Viewed:0, Accepted:0, Declined:0, 'Changes Requested':0 };
  let openValue = 0;
  quotes.forEach(function (quote) {
    const status = boNormalizeText_(quote.Status) || 'Draft';
    if (Object.prototype.hasOwnProperty.call(pipeline, status)) pipeline[status] += 1;
    if (openStatuses.indexOf(status) >= 0) openValue += Number(String(quote.Total || 0).replace(/[$,]/g, '')) || 0;
  });
  const result = {
    generatedDate: today,
    metrics: {
      draftQuotes: pipeline.Draft,
      needsFollowUp: pipeline.Sent + pipeline.Viewed + pipeline['Changes Requested'],
      openQuoteValue: boMoney_(openValue)
    },
    pipeline: pipeline,
    recent: quotes.sort(function (a,b) {
      return String(b['Updated Time'] || b['Quote Date']).localeCompare(String(a['Updated Time'] || a['Quote Date']));
    }).slice(0,12).map(boQuoteBuilderCompactRow_)
  };
  boQuoteBuilderCachePut_('dashboard', result, 60);
  boQuoteBuilderTiming_('dashboard_build', started, { quotes: quotes.length, recent: result.recent.length });
  return result;
}

function boQuoteBuilderPriceBook_(options) {
  const started = Date.now();
  boQuoteBuilderRequireAction_('priceBook');
  options = options || {};
  const query = boNormalizeText_(options.query).toLowerCase();
  let items = boQuoteBuilderCacheGet_('priceBook');
  if (!items) {
    const snapshot = boQuoteBuilderSnapshot_(H38_BO_SHEETS.PRODUCTS);
    items = snapshot.rows.filter(function (item) {
      return boNormalizeText_(item.Status || 'Active') !== 'Inactive';
    }).map(function (item) {
      return {
        'Product / Service ID': item['Product / Service ID'], Name: item.Name, Description: item.Description,
        'Customer Description': item['Customer Description'], Category: item.Category, Unit: item.Unit,
        'Standard Selling Price': item['Standard Selling Price'], Price: item.Price, Status: item.Status
      };
    }).slice(0, 700);
    boQuoteBuilderCachePut_('priceBook', items, 300);
  }
  const result = query ? items.filter(function (item) {
    return [item['Product / Service ID'], item.Name, item.Description, item['Customer Description'], item.Category, item.Unit]
      .join(' ').toLowerCase().indexOf(query) >= 0;
  }) : items;
  boQuoteBuilderTiming_(query ? 'price_book_search' : 'price_book_load', started, { query: query, rows: result.length });
  return result.slice(0, 300);
}

function boQuoteBuilderTemplates_() {
  const started = Date.now();
  boQuoteBuilderRequireAction_('templates');
  const cached = boQuoteBuilderCacheGet_('templates');
  if (cached) return cached;
  const snapshot = boQuoteBuilderSnapshot_(H38_BO_SHEETS.PDF_TEMPLATES);
  const rows = snapshot.rows.filter(function (row) {
    return boNormalizeText_(row.Status || 'Active') !== 'Inactive';
  }).map(function (row) {
    return {
      'PDF Template ID': row['PDF Template ID'], 'Template Name': row['Template Name'], Name: row.Name,
      'Document Type': row['Document Type'], Type: row.Type, Status: row.Status,
      Notes: row.Notes, 'File ID': row['File ID'], 'Template File ID': row['Template File ID']
    };
  }).slice(0, 100);
  boQuoteBuilderCachePut_('templates', rows, 300);
  boQuoteBuilderTiming_('templates_load', started, { rows: rows.length });
  return rows;
}

function boDuplicateQuote_(quoteId) {
  return boSafeExecute_('Duplicate quote', function () {
    const started = Date.now();
    const access = boQuoteBuilderRequireAction_('Create');
    const quoteSnapshot = boQuoteBuilderSnapshot_(H38_BO_SHEETS.QUOTES, { includeVoided: true });
    const source = quoteSnapshot.rows.find(function (row) { return row['Quote ID'] === quoteId; });
    boAssert_(source, 'The selected quote was not found.');
    const lineSnapshot = boQuoteBuilderSnapshot_(H38_BO_SHEETS.QUOTE_LINES, { includeVoided: true });
    const newId = boId_('QUOTE');
    const newNumber = boQuoteBuilderNextNumber_('Quote');
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
      'Created By': access.user.id
    });
    delete copy.__rowNumber;
    boQuoteBuilderAppendBatch_(quoteSnapshot, [copy]);
    const lineCopies = lineSnapshot.rows.filter(function (line) { return line['Quote ID'] === quoteId; }).map(function (line) {
      const lineCopy = Object.assign({}, line, { 'Quote Line ID': boId_('QL'), 'Quote ID': newId });
      delete lineCopy.__rowNumber;
      return lineCopy;
    });
    boQuoteBuilderAppendBatch_(lineSnapshot, lineCopies);
    SpreadsheetApp.flush();
    boAudit_('CREATE', H38_BO_SHEETS.QUOTES, newId, {}, copy, 'Quote duplication; ' + lineCopies.length + ' lines batched');
    boProof_('DUPLICATE QUOTE', 'Quote', newId, 'PASS', 'Copied from ' + source['Quote Number'], access.user.email);
    boQuoteBuilderInvalidateCache_('quotes');
    boQuoteBuilderTiming_('duplicate_quote', started, { lines: lineCopies.length });
    return copy;
  }, 'Quote', quoteId);
}

function boPrepareAiQuoteDraft_(payload) {
  return boSafeExecute_('Prepare AI quote draft', function () {
    const started = Date.now();
    const access = boQuoteBuilderRequireAction_('Create');
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
      'Created By': access.user.id,
      'Created Time': boNow_()
    };
    boAppendRecord_(H38_BO_SHEETS.ACTIVITY, staged, 'AI quote draft staging');
    boProof_('PREPARE AI QUOTE DRAFT', 'Customer', payload.customerId, 'PASS', draftId, access.user.email);
    boQuoteBuilderTiming_('prepare_ai_draft', started, { suggestions: suggestions.length, photos: (payload.photos || []).length });
    return staged;
  }, 'Customer', payload && payload.customerId);
}

function boQuoteBuilderPackage_() {
  return {
    product: 'Highway 38 Quote Builder',
    sharedEngine: true,
    directMode: true,
    navigation: ['dashboard','newQuote','priceBook','templates','photoAiDraft','documents'],
    excludedModules: ['accounting','payroll','tax','employees','contractors','purchaseOrders','vendorBills','expenses','reports','messaging'],
    approvalRule: 'Owner approval required before customer release.',
    aiRule: 'AI may stage descriptions and Price Book matches but may not set final prices, approve, or send.'
  };
}
