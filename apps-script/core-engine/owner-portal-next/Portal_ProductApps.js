/** Installed focused products exposed to the unified Owner Portal. */
function h38PortalProductApps() {
  h38PortalRequireUnifiedUser_();
  var apps = typeof boGetBusinessAppCatalog_ === 'function' ? boGetBusinessAppCatalog_() : [];
  return apps.filter(function(app){ return app && app.installed; }).map(function(app){
    return {
      key:app.key,
      name:app.name,
      shortName:app.shortName,
      tagline:app.tagline,
      icon:app.icon,
      tier:app.tier,
      modules:app.modules || [],
      standaloneCapable:app.standaloneCapable === true
    };
  });
}
