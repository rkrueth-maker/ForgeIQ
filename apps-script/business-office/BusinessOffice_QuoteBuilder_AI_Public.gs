/** Public web-app entry points for the integrated Quote Builder AI controls. */
function boBuildAiQuoteDraft(payload){
  boGuardApiRequest_('prepareAiQuoteDraft',payload||{});
  return boBuildAiQuoteDraft_(payload||{});
}
function boCreateAiCompletionVisual(payload){
  boGuardApiRequest_('prepareAiQuoteDraft',payload||{});
  return boCreateAiCompletionVisual_(payload||{});
}
