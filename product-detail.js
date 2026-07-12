(function(){
  'use strict';
  const catalog=window.H38_CATALOG;
  const host=document.querySelector('[data-product-detail-single]');
  if(!catalog||!host)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(value||0));
  const params=new URLSearchParams(location.search);
  const requested=params.get('id')||params.get('product')||'';
  const normalized=requested.trim().toUpperCase();
  const product=catalog.products.find(item=>item.id===normalized)||catalog.products.find(item=>item.slug===requested.trim().toLowerCase());

  function list(items){return `<ul>${(items||[]).map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`;}
  function setMeta(name,content,property){let node=document.querySelector(`meta[${property?'property':'name'}="${name}"]`);if(!node){node=document.createElement('meta');node.setAttribute(property?'property':'name',name);document.head.appendChild(node);}node.setAttribute('content',content);}

  if(!product){
    document.title='Product not found | Highway 38 Solutions';
    host.innerHTML=`<section class="section"><div class="container"><div class="detail-panel"><span class="badge">Product not found</span><h1>Select an approved Highway 38 product.</h1><p>The requested product ID is missing or invalid. No purchase, payment, or customer action occurred.</p><div class="button-row"><a class="btn btn-dark" href="products.html">Browse products</a><a class="btn btn-light" href="start-request.html">Use the request guide</a></div></div></div></section>`;
    return;
  }

  const title=`${product.name} (${product.id}) | Highway 38 Solutions`;
  const description=`${product.summary} Price ${money(product.price)}. ${product.turnaround}. ${product.revisions}.`;
  document.title=title;
  setMeta('description',description,false);
  setMeta('og:title',title,true);
  setMeta('og:description',description,true);
  setMeta('og:type','website',true);
  const canonical=`https://rkrueth-maker.github.io/highway-38-solutions/product.html?id=${encodeURIComponent(product.id)}`;
  let canonicalNode=document.querySelector('link[rel="canonical"]');if(!canonicalNode){canonicalNode=document.createElement('link');canonicalNode.rel='canonical';document.head.appendChild(canonicalNode);}canonicalNode.href=canonical;

  const related=catalog.products.filter(item=>item.family===product.family&&item.id!==product.id).slice(0,3);
  host.innerHTML=`
    <header class="hero-shell"><div class="hero"><div><span class="eyebrow">${esc(product.familyLabel)}</span><h1>${esc(product.name)}</h1><p class="lead">${esc(product.outcome)}</p><div class="button-row"><a class="btn btn-primary" href="start-request.html?product=${encodeURIComponent(product.id)}">Request this product</a><a class="btn btn-secondary" href="sample-library-now.html#sample-${esc(product.slug)}">View sample</a><a class="btn btn-link" href="products.html">Compare products</a></div></div><aside class="hero-proof"><span class="badge">${esc(product.id)}</span><div class="price">${money(product.price)}</div><p><strong>Turnaround:</strong> ${esc(product.turnaround)}</p><p><strong>Revision:</strong> ${esc(product.revisions)}</p><p><strong>Payment:</strong> ${esc(product.payment)}</p><p><strong>Formats:</strong> ${(product.formats||[]).map(esc).join(', ')}</p></aside></div></header>
    <section class="section"><div class="container"><div class="detail-grid"><section class="detail-panel"><h2>Problem solved</h2><p>${esc(product.problem)}</p></section><section class="detail-panel"><h2>Ideal customer</h2><p>${esc(product.ideal)}</p></section><section class="detail-panel good-fit"><h2>Best fit</h2>${list(product.bestFit)}</section><section class="detail-panel not-fit"><h2>Not a fit</h2>${list(product.notFit)}</section><section class="detail-panel"><h2>What you send</h2>${list(product.inputs)}</section><section class="detail-panel"><h2>What you receive</h2>${list(product.deliverables)}</section><section class="detail-panel"><h2>Scope limits</h2>${list(product.scope)}</section><section class="detail-panel"><h2>Exclusions</h2>${list(product.exclusions)}</section><section class="detail-panel full"><h2>Professional-service boundary</h2><div class="boundary">${esc(product.boundary)}</div><p><strong>Upgrade path:</strong> ${esc(product.upgrade)}</p></section></div></div></section>
    <section class="section alt"><div class="container"><div class="section-head"><span class="badge">Same service family</span><h2>Related approved products</h2></div><div class="product-grid">${related.map(item=>`<article class="product-card"><div class="meta"><span>${esc(item.id)}</span><span>${esc(item.familyLabel)}</span></div><h3>${esc(item.name)}</h3><div class="price">${money(item.price)}</div><p>${esc(item.summary)}</p><div class="button-row"><a class="btn btn-light" href="product.html?id=${encodeURIComponent(item.id)}">Full scope</a><a class="btn btn-dark" href="start-request.html?product=${encodeURIComponent(item.id)}">Request</a></div></article>`).join('')}</div></div></section>`;

  window.h38AnalyticsQueue=window.h38AnalyticsQueue||[];
  window.h38AnalyticsQueue.push({event:'product_detail_view',productId:product.id,family:product.family,timestamp:new Date().toISOString()});
})();
