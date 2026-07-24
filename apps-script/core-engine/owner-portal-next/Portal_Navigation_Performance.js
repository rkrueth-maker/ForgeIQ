/** Whole-navigation performance services. Every request remains permission checked and read only. */
function h38PortalNavigationSurfaceBatch(requests) {
  h38PortalRequireUnifiedUser_();
  var list = Array.isArray(requests) ? requests.slice(0, 8) : [];
  return {
    status: 'PASS',
    items: list.map(function(request) {
      var route = String(request && request.route || '').trim();
      try {
        return {route: route, status: 'PASS', data: h38PortalNavigationSurfaceData_(route, request && request.options || {})};
      } catch (error) {
        return {route: route, status: 'HOLD', message: String(error && error.message || error)};
      }
    }),
    externalActionsOccurred: false
  };
}

function h38PortalNavigationSurfaceData_(route, options) {
  options = options || {};
  if (route.indexOf('bo:') === 0) {
    return h38PortalBusinessModule(route.slice(3), {
      query: String(options.query || ''),
      filters: options.filters || {},
      limit: Math.min(Math.max(Number(options.limit || 50), 1), 100)
    });
  }
  if (route === 'approvalsCenter') return h38PortalApplicationApprovalCenter();
  if (route === 'calendarCenter') return h38PortalApplicationCalendar();
  if (route === 'moduleManager') return h38PortalModuleManager();
  if (route === 'setupWizard') return h38PortalSetupWizardState();
  if (route === 'userAccess') return h38PortalUserAccessSnapshot();
  if (route === 'backupCenter') return h38PortalBackupCenter();
  if (route === 'help') return h38PortalHelpCenter();
  if (route === 'tasks') return h38PortalTasks({});
  if (route === 'proof') return h38PortalProofLog('');
  if (route === 'errors') return h38PortalErrorLog('');
  if (route === 'social' || route === 'advertising') return h38PortalList(route, {});
  throw new Error('Route does not require server prefetch: ' + route);
}
