(function(){
  'use strict';
  const LOGO='assets/highway38-logo.png?v=20260713-logo3';
  const brandText=()=>'<span class="brand-text"><span>Highway 38</span> Solutions</span>';
  const logo=()=>{const img=document.createElement('img');img.className='brand-logo';img.src=LOGO;img.alt='Highway 38 Solutions';return img;};
  function wrapText(el){
    if(el.querySelector('.brand-text'))return;
    const nodes=[...el.childNodes].filter(node=>!(node.nodeType===1&&node.classList.contains('brand-logo')));
    const wrapper=document.createElement('span');wrapper.className='brand-text';
    nodes.forEach(node=>wrapper.appendChild(node));
    if(!wrapper.textContent.trim())wrapper.innerHTML='<span>Highway 38</span> Solutions';
    el.appendChild(wrapper);
  }
  function enhance(el){
    if(!el||el.querySelector('.brand-logo'))return false;
    const text=(el.textContent||'').replace(/\s+/g,' ').trim();
    if(!/highway\s*38/i.test(text)&&!el.matches('.brand,.site-brand,.navbar-brand,.logo'))return false;
    el.classList.add('h38-brand-lockup');
    el.insertBefore(logo(),el.firstChild);
    wrapText(el);
    return true;
  }
  function ensureHeader(){
    const candidates=document.querySelectorAll('a.brand,a.site-brand,a.navbar-brand,a.logo,.brand a,.site-brand a,.eco-brand');
    let found=false;candidates.forEach(el=>{if(enhance(el))found=true;else if(el.querySelector('.brand-logo'))found=true;});
    if(found)return;
    const nav=document.querySelector('nav');
    if(nav){const link=document.createElement('a');link.href='index.html';link.className='h38-global-brandbar__link';link.appendChild(logo());link.insertAdjacentHTML('beforeend',brandText());nav.insertBefore(link,nav.firstChild);return;}
    const header=document.querySelector('header');
    if(header){const bar=document.createElement('div');bar.className='h38-global-brandbar';bar.innerHTML='<a class="h38-global-brandbar__link" href="index.html"><img class="brand-logo" src="'+LOGO+'" alt="Highway 38 Solutions" />'+brandText()+'</a>';header.insertBefore(bar,header.firstChild);return;}
    const bar=document.createElement('div');bar.className='h38-global-brandbar';bar.innerHTML='<a class="h38-global-brandbar__link" href="index.html"><img class="brand-logo" src="'+LOGO+'" alt="Highway 38 Solutions" />'+brandText()+'</a>';document.body.insertBefore(bar,document.body.firstChild);
  }
  function ensureFooter(){
    document.querySelectorAll('footer').forEach(footer=>{
      if(footer.querySelector('.brand-logo'))return;
      const wrap=document.createElement('div');wrap.className='h38-legacy-footer-brand';wrap.innerHTML='<a class="h38-footer-brand" href="index.html"><img class="brand-logo" src="'+LOGO+'" alt="Highway 38 Solutions" />'+brandText()+'</a>';
      footer.insertBefore(wrap,footer.firstChild);
    });
  }
  function run(){ensureHeader();ensureFooter();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();