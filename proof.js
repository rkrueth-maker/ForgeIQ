(function(){
  'use strict';
  const host=document.querySelector('[data-proof-library]'),data=(window.H38_ECOSYSTEM||{}).proof||[];
  if(!host)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  host.innerHTML=data.map(item=>`<article class="eco-card"><div class="eco-proof-label">${esc(item.classification)}</div><h3>${esc(item.title)}</h3><p><b>${esc(item.domain)}</b></p><p>${esc(item.summary)}</p><div class="eco-alert"><b>Evidence status:</b> ${esc(item.evidenceStatus)}</div><p><b>Related catalog:</b> ${item.related.map(id=>`<a href="products.html#catalog">${esc(id)}</a>`).join(', ')}</p></article>`).join('');
})();
