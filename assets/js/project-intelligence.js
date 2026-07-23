(()=>{
  'use strict';
  if(window.H38_PUBLIC_SITE&&window.H38_PUBLIC_SITE.mounted)return;
  if(document.querySelector('script[data-h38-canonical-site]'))return;
  const script=document.createElement('script');
  script.src='assets/js/h38-site-v2.js?v=2026-07-23-site-architecture-v1';
  script.defer=true;
  script.dataset.h38CanonicalSite='1';
  document.head.appendChild(script);
})();
