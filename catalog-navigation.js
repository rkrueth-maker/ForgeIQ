(function(){
  'use strict';
  const catalog=window.H38_CATALOG;
  if(!catalog)return;
  const bySlug=new Map(catalog.products.map(product=>[product.slug,product.id]));
  const rewrite=()=>{
    document.querySelectorAll('a[href^="products.html#"]').forEach(link=>{
      const slug=link.getAttribute('href').split('#')[1]||'';
      const id=bySlug.get(slug);
      if(id)link.setAttribute('href',`product.html?id=${encodeURIComponent(id)}`);
    });
  };
  rewrite();
  const observer=new MutationObserver(rewrite);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.setTimeout(()=>observer.disconnect(),5000);
})();
