(function(){
  'use strict';
  const host=document.querySelector('[data-proof-library]');
  const source=window.H38_PUBLIC_PROOF||{items:[]};
  if(!host)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const productLink=id=>`<a href="product.html?id=${encodeURIComponent(id)}">${esc(id)}</a>`;
  if(!source.items.length){host.innerHTML='<article class="eco-card"><h3>Proof registry unavailable</h3><p>No private evidence was exposed. Use the public sample library while the public-safe registry is restored.</p></article>';return;}
  host.innerHTML=source.items.map(item=>`<article class="eco-card"><div class="eco-meta"><span class="eco-proof-label">${esc(item.classification)}</span><span class="eco-chip eco-chip--ok">${esc(item.privacyStatus)}</span></div><h3>${esc(item.title)}</h3><p><b>${esc(item.domain)}</b></p><p>${esc(item.summary)}</p><div class="eco-alert"><b>Evidence status:</b> ${esc(item.evidenceStatus)}</div><p><b>Public source count:</b> ${esc(item.sourceCount)}. Reconstruction items may remain at zero because they are not represented as verified historical case studies.</p><p><b>Boundary:</b> ${esc(item.boundary)}</p><p><b>Related catalog:</b> ${(item.relatedProducts||[]).map(productLink).join(', ')}</p></article>`).join('');
  window.h38AnalyticsQueue=window.h38AnalyticsQueue||[];
  window.h38AnalyticsQueue.push({event:'proof_registry_view',release:source.release,items:source.items.length,timestamp:new Date().toISOString()});
})();
