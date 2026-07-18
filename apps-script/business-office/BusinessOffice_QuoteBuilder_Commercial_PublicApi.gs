/** Publicly callable Apps Script wrappers; every method enforces internal role controls. */
function boCommercialCatalog(options){return boQuoteCommercialCatalog_(options||{});}
function boCommercialCatalogMetadata(payload){return boQuoteCommercialSaveCatalogMetadata_(payload||{});}
function boCommercialCatalogExport(){return boQuoteCommercialCatalogExport_();}
function boCommercialCatalogImport(payload){return boQuoteCommercialCatalogImport_(payload||{});}
function boCommercialBulkPrice(payload){return boQuoteCommercialBulkPrice_(payload||{});}
function boCommercialTemplateList(){return boQuoteCommercialTemplateList_();}
function boCommercialTemplateSave(payload){return boQuoteCommercialTemplateSave_(payload||{});}
function boCommercialTemplateApply(payload){return boQuoteCommercialTemplateApply_(payload||{});}
function boCommercialAnalytics(){return boQuoteCommercialAnalytics_();}
function boCommercialQuoteDetails(quoteId){return boQuoteBuilderQuoteDetails_(quoteId);}
function boCommercialQuoteDocuments(quoteId){return boQuoteBuilderQuoteDocuments_(quoteId);}
