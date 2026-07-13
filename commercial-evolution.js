(function(){
  'use strict';
  const C=window.H38_CATALOG;
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const product=id=>C?.products?.find(item=>item.id===id);
  const lensFor=p=>{
    if(p.family==='manufacturing')return 'manufacturing';
    if(['H38-P002','H38-P003','H38-P004'].includes(p.id))return 'garage';
    if(['H38-P005','H38-P006','H38-P007','H38-P009'].includes(p.id))return 'business';
    if(p.family==='implementation')return 'digital';
    return 'featured';
  };
  function enhanceBundles(){
    if(!C)return;
    document.querySelectorAll('.bundle-card').forEach((card,index)=>{
      const bundle=C.bundles[index];
      if(!bundle||card.querySelector('.bundle-value'))return;
      const components=bundle.products.map(product).filter(Boolean);
      const componentTotal=components.reduce((sum,item)=>sum+item.price,0);
      const savings=componentTotal-bundle.price;
      const value=savings>0
        ? `<strong>Save ${money(savings)} vs. buying components separately</strong><span>${money(componentTotal)} component total · ${money(bundle.price)} bundle price</span>`
        : `<strong>Added-value package</strong><span>Includes the listed combined deliverables and extras; this bundle is not presented as a discount.</span>`;
      const ideal=components.some(item=>item.family==='manufacturing')?'Manufacturers and shops preparing a controlled investment or vendor decision':components.some(item=>item.family==='implementation')?'Small businesses ready to move from a defined plan into one bounded implementation':components.some(item=>['H38-P002','H38-P003','H38-P004'].includes(item.id))?'Homeowners and shop owners who want related planning decisions handled together':'Owners who need related workflow decisions combined into one controlled package';
      card.querySelector('.price')?.insertAdjacentHTML('afterend',`<div class="bundle-value">${value}</div><p class="bundle-ideal"><strong>Best for:</strong> ${esc(ideal)}.</p><p class="bundle-upgrade"><strong>Upgrade path:</strong> Use the finished bundle to confirm the next bounded implementation, vendor, or owner decision—never an automatic upsell.</p>`);
    });
  }
  function sampleFilters(){
    if(!C)return;
    const host=document.querySelector('[data-samples="all"]');
    if(!host||document.querySelector('.sample-filter-shell'))return;
    const cards=[...host.querySelectorAll('.sample-card')];
    cards.forEach((card,index)=>{const p=C.products[index];if(p){card.dataset.sampleCategory=lensFor(p);card.dataset.sampleName=p.name.toLowerCase();}});
    host.insertAdjacentHTML('beforebegin',`<div class="sample-filter-shell" aria-label="Filter sample library"><strong>Browse by category</strong><div class="sample-filter-controls">${[['all','All samples'],['featured','Featured'],['garage','Garage & shop'],['manufacturing','Manufacturing'],['business','Business'],['digital','Automation & digital']].map(([id,label],i)=>`<button class="filter-button" type="button" data-sample-filter="${id}" aria-pressed="${i===0}">${label}</button>`).join('')}</div><p class="sample-result-count" aria-live="polite">Showing all ${cards.length} approved samples.</p></div>`);
    const count=document.querySelector('.sample-result-count');
    document.querySelectorAll('[data-sample-filter]').forEach(button=>button.addEventListener('click',()=>{
      const filter=button.dataset.sampleFilter;
      document.querySelectorAll('[data-sample-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
      let visible=0;cards.forEach(card=>{const show=filter==='all'||card.dataset.sampleCategory===filter;card.hidden=!show;if(show)visible+=1;});
      count.textContent=`Showing ${visible} approved ${filter==='all'?'samples':button.textContent.toLowerCase()+' samples'}.`;
    }));
  }
  function addStructuredData(){
    if(!C||document.querySelector('script[data-commercial-schema]'))return;
    const schema={
      '@context':'https://schema.org','@type':'ProfessionalService',name:'Highway 38 Solutions',url:'https://rkrueth-maker.github.io/highway-38-solutions/',logo:'https://rkrueth-maker.github.io/highway-38-solutions/assets/highway38-logo.png',description:C.positioning,areaServed:[{'@type':'AdministrativeArea',name:'Itasca County, Minnesota'},{'@type':'City',name:'Grand Rapids, Minnesota'}],knowsAbout:['CNC programming','CAD planning','manufacturing automation','shop workflow','garage planning','small business workflow consulting'],hasOfferCatalog:{'@type':'OfferCatalog',name:'Highway 38 Solutions approved service catalog',itemListElement:C.products.map(p=>({'@type':'Offer',name:p.name,price:p.price,priceCurrency:'USD',url:`https://rkrueth-maker.github.io/highway-38-solutions/product.html?id=${p.id}`}))}
    };
    const script=document.createElement('script');script.type='application/ld+json';script.dataset.commercialSchema='true';script.textContent=JSON.stringify(schema);document.head.appendChild(script);
  }
  function navClose(){
    const nav=document.querySelector('.site-nav');if(!nav)return;
    document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const menu=nav.querySelector('.is-open');const button=nav.querySelector('[aria-expanded="true"]');menu?.classList.remove('is-open');button?.setAttribute('aria-expanded','false');button?.focus();});
  }
  function run(){enhanceBundles();sampleFilters();addStructuredData();navClose();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true});else setTimeout(run,0);
})();
