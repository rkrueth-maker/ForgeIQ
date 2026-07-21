#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const need=(text,marker,label)=>{if(!text.includes(marker))throw new Error(`Missing ${label}: ${marker}`)};
const checkScript=(text,label)=>{
  const matches=[...text.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if(!matches.length)throw new Error(`${label} script block missing`);
  matches.forEach((match,index)=>new Function(match[1]));
};

const web=read('apps-script/business-office/BusinessOffice_Web.gs');
const clientManifest=read('apps-script/business-office/BusinessOffice_ClientManifest.gs');
const workspace=read('apps-script/business-office/BusinessOffice_QuoteBuilder_Client.html');
const completion=read('apps-script/business-office/BusinessOffice_QuoteBuilder_Completion.html');
const gateway=read('quote-builder.html');
const portal=read('customer-portal.html');
const decisions=read('customer-portal-quote-decisions.js');
const migration=read('supabase/migrations/20260718_customer_quote_decisions.sql');

need(web,'boRenderClientIncludes_()','controlled client renderer');
need(clientManifest,"'BusinessOffice_QuoteBuilder_Client'",'Quote Builder workspace manifest entry');
need(clientManifest,"'BusinessOffice_QuoteBuilder_Completion'",'Quote Builder completion manifest entry');
if((clientManifest.match(/BusinessOffice_QuoteBuilder_Client/g)||[]).length!==1)throw new Error('Quote Builder workspace must be included exactly once.');
if((clientManifest.match(/BusinessOffice_QuoteBuilder_Completion/g)||[]).length!==1)throw new Error('Quote Builder completion must be included exactly once.');
need(gateway,'quoteBuilder=1#module=quoteBuilder','focused secure gateway');
need(completion,"new URLSearchParams(location.search).get('quoteBuilder')==='1'",'focus-mode query');
need(completion,'type="file" multiple','photo/PDF intake');
need(completion,"call('uploadDocument'",'private document upload');
need(completion,"documentType:'Quote Field Photo'",'quote photo classification');
need(completion,"accessClassification:'Private Customer'",'private customer access classification');
need(workspace,"call('createQuote'",'quote creation');
need(workspace,"call('prepareAiQuoteDraft'",'AI draft staging');
need(portal,'customer-portal-quote-decisions.js','customer decision client include');
need(decisions,"rpc('customer_portal_decide_quote'",'customer decision RPC');
need(decisions,"'revision_requested'",'revision request decision');
need(decisions,"'declined'",'decline decision');
need(migration,'security definer','secured decision function');
need(migration,"v_decision not in ('approved', 'declined', 'revision_requested')",'decision allowlist');
need(migration,'external_action_occurred','no-external-action proof');
need(migration,'p_expected_version','version protection');
need(migration,'customer_portal_customer_id()','customer ownership protection');
need(migration,'revoke execute on function public.customer_portal_decide_quote','anonymous execution revocation');

checkScript(workspace,'Quote Builder workspace');
checkScript(completion,'Quote Builder completion');
new Function(decisions);

console.log('PASS — Quote Builder focus mode, controlled client manifest, photo/PDF intake, shared quote workflows, and customer approve/revise/decline controls verified.');
