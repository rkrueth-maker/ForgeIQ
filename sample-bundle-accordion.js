(function(){
  'use strict';

  function enhanceBundleCards(){
    document.querySelectorAll('[data-bundles] .bundle-card').forEach((card,index)=>{
      if(card.dataset.compactBundle==='true')return;
      card.dataset.compactBundle='true';

      const buttonRow=card.querySelector('.button-row');
      const value=card.querySelector('.bundle-value');
      const outcome=[...card.children].find(node=>node.tagName==='P'&&!node.classList.contains('bundle-ideal')&&!node.classList.contains('bundle-upgrade'));
      const issueFit=card.querySelector('.issue83-bundle-fit');

      // Remove duplicated fit and upgrade paragraphs when the later fit panel already contains them.
      if(issueFit){
        card.querySelector('.bundle-ideal')?.remove();
        card.querySelector('.bundle-upgrade')?.remove();
      }

      if(outcome)outcome.classList.add('bundle-summary');
      if(value)value.classList.add('bundle-value--compact');

      const details=document.createElement('details');
      details.className='bundle-details';
      details.innerHTML='<summary><span class="bundle-details-label">View full details</span><span class="bundle-details-icon" aria-hidden="true">+</span></summary><div class="bundle-details-body"></div>';
      const body=details.querySelector('.bundle-details-body');

      const movable=[...card.children].filter(node=>{
        if(node===details||node===buttonRow)return false;
        if(node.matches('.meta,h3,.price,.bundle-value,.bundle-summary'))return false;
        return true;
      });
      movable.forEach(node=>body.appendChild(node));

      if(buttonRow)card.insertBefore(details,buttonRow);else card.appendChild(details);
      details.addEventListener('toggle',()=>{
        details.querySelector('.bundle-details-label').textContent=details.open?'Hide full details':'View full details';
        details.querySelector('.bundle-details-icon').textContent=details.open?'−':'+';
      });

      card.setAttribute('aria-labelledby','bundle-title-'+index);
      const title=card.querySelector('h3');
      if(title)title.id='bundle-title-'+index;
    });
  }

  function run(){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      const cards=document.querySelectorAll('[data-bundles] .bundle-card');
      if(cards.length&&[...cards].every(card=>card.querySelector('.issue83-bundle-fit')||attempts>20)){
        clearInterval(timer);
        enhanceBundleCards();
      }else if(attempts>60){
        clearInterval(timer);
        enhanceBundleCards();
      }
    },50);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
