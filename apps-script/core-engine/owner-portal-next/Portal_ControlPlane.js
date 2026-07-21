/** Unified Owner Portal bridge to the Business Office control plane. */
function h38PortalControlBootstrap(){
  h38PortalRequireUnifiedUser_();
  return boControlLiveBootstrap_();
}
function h38PortalControlAction(request){
  h38PortalRequireUnifiedUser_();
  return boControlApiLive(request||{});
}
