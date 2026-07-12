(function(){
  'use strict';
  const host=document.querySelector('[data-proof-library]');
  const source=window.H38_PUBLIC_PROOF||{items:[]};
  if(!host)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const productLink=id=>`<a href="product.html?id=${encodeURIComponent(id)}">${esc(id)}</a>`;
  const list=items=>(items||[]).length?`<ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'<p>None approved for public display.</p>';
  const toolLink=id=>id?`<a href="free-tools.html#${encodeURIComponent(id)}">${esc(id)}</a>`:'Not assigned';
  if(!source.items.length){host.innerHTML='<article class="eco-card"><h3>Proof registry unavailable</h3><p>No private evidence was exposed. Use the public sample library while the public-safe registry is restored.</p></article>';return;}
  host.innerHTML=source.items.map(item=>`<article class="eco-card eco-proof-case"><div class="eco-meta"><span class="eco-proof-label">${esc(item.classification)}</span><span class="eco-chip eco-chip--ok">${esc(item.privacyStatus)}</span></div><h3>${esc(item.title)}</h3><p><b>${esc(item.domain)}</b></p><p>${esc(item.summary)}</p><div class="eco-alert"><b>Evidence status:</b> ${esc(item.evidenceStatus)}</div><h4>The problem</h4><p>${esc(item.problem)}</p><h4>Rick’s role</h4><p>${esc(item.role)}</p><h4>Inputs</h4>${list(item.inputs)}<h4>Constraints</h4>${list(item.constraints)}<h4>Work performed</h4>${list(item.workPerformed)}<h4>Decisions made</h4>${list(item.decisions)}<h4>Implementation</h4><p>${esc(item.implementation)}</p><h4>Outcome</h4><p>${esc(item.outcome)}</p><h4>Approved images or video stills</h4>${list(item.approvedAssets)}<p><b>Related free tool:</b> ${toolLink(item.relatedFreeTool)}</p><p><b>Related paid service:</b> ${item.relatedPaidService?productLink(item.relatedPaidService):'Not assigned'}</p><p><b>Public source count:</b> ${esc(item.sourceCount)}.</p><p><b>Boundary:</b> ${esc(item.boundary)}</p><p><b>Related catalog:</b> ${(item.relatedProducts||[]).map(productLink).join(', ')}</p></article>`).join('');
  window.h38AnalyticsQueue=window.h38AnalyticsQueue||[];
  window.h38AnalyticsQueue.push({event:'proof_registry_view',release:source.release,items:source.items.length,timestamp:new Date().toISOString()});
})();
