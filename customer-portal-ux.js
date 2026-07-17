(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function requestChange(label){
    const message=byId('messageBody');
    if(!message)return;
    message.value='Please review a change to '+label+'. Requested change: ';
    document.getElementById('messages-section')?.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(()=>{message.focus();message.setSelectionRange(message.value.length,message.value.length);},350);
  }
  function enhanceQuotes(){
    const list=byId('quotesList');if(!list)return;
    list.querySelectorAll('[data-approve-quote]').forEach(approve=>{
      const card=approve.closest('.portal-item');if(!card||card.querySelector('[data-request-change]'))return;
      const actions=document.createElement('div');actions.className='portal-actions';
      approve.parentNode.insertBefore(actions,approve);actions.appendChild(approve);
      const change=document.createElement('button');change.type='button';change.className='btn';change.dataset.requestChange='true';change.textContent='Request a change';
      const label=card.querySelector('strong')?.textContent||'this quote';change.addEventListener('click',()=>requestChange(label));actions.appendChild(change);
    });
  }
  function syncAction(){
    const host=byId('actionRequired');if(!host)return;
    enhanceQuotes();
    const approve=byId('quotesList')?.querySelector('[data-approve-quote]');
    if(approve){
      const card=approve.closest('.portal-item');
      const strongs=card?Array.from(card.querySelectorAll('strong')).map(node=>node.textContent.trim()).filter(Boolean):[];
      const title=strongs[0]||'Quote ready for review', amount=strongs[1]||'';
      host.innerHTML='<article class="h38-action-card"><span class="action-label">Action required</span><h3>'+esc(title)+' is ready for review</h3><div class="action-meta"><span>'+esc(amount)+'</span><span>Highway 38 is waiting for your decision</span></div><div class="portal-actions" style="margin-top:1rem"><button class="btn btn-primary" type="button" id="actionApproveQuote">Review quote</button><button class="btn" type="button" id="actionRequestChange">Request a change</button></div></article>';
      byId('actionApproveQuote')?.addEventListener('click',()=>{document.getElementById('quotes-section')?.scrollIntoView({behavior:'smooth'});setTimeout(()=>approve.focus(),350);});
      byId('actionRequestChange')?.addEventListener('click',()=>requestChange(title));
      return;
    }
    const balance=byId('metricBalance')?.textContent||'$0.00';
    const jobs=Number(byId('metricJobs')?.textContent||0);
    host.innerHTML='<article class="portal-panel"><span class="badge">No action required</span><h3>You are up to date.</h3><p>'+(jobs?'Your active project remains visible below.':'No active project is currently posted.')+' Current outstanding balance: '+esc(balance)+'.</p></article>';
  }
  function syncProject(){
    const host=byId('currentProject');if(!host)return;
    const card=byId('jobsList')?.querySelector('.portal-item');
    if(!card){host.innerHTML='<p class="portal-empty">No active project is posted.</p>';return;}
    const title=card.querySelector('strong')?.textContent||'Current project';
    const spans=Array.from(card.querySelectorAll('span')).map(node=>node.textContent.trim()).filter(Boolean);
    const progress=Math.max(0,Math.min(100,Number(card.querySelector('progress')?.value||0)));
    const stages=[['Request received',5],['Scope approved',20],['Information received',40],['Work in progress',65],['Customer review',85],['Complete',100]];
    const stageHtml=stages.map(([label,threshold],index)=>{
      const previous=index?stages[index-1][1]:0;
      const className=progress>=threshold?'is-complete':progress>=previous?'is-current':'';
      return '<li class="'+className+'">'+esc(label)+'</li>';
    }).join('');
    const next=spans.find(text=>!/open|active|planning|complete|cancel/i.test(text))||'Highway 38 will post the next action here.';
    host.innerHTML='<h3>'+esc(title)+'</h3><p>'+esc(next)+'</p><ol class="h38-project-timeline">'+stageHtml+'</ol><p><strong>Progress:</strong> '+progress+'%</p>';
  }
  function sync(){syncAction();syncProject();}
  function observe(id){const node=byId(id);if(node)new MutationObserver(sync).observe(node,{childList:true,subtree:true,characterData:true});}
  function nav(){
    document.querySelectorAll('.h38-portal-nav a').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.h38-portal-nav a').forEach(item=>item.classList.toggle('is-active',item===link));}));
  }
  function boot(){['jobsList','quotesList','invoicesList','metricBalance','metricJobs'].forEach(observe);nav();sync();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
