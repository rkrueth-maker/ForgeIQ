#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const need=(text,marker,label)=>{if(!text.includes(marker))throw new Error(`Missing ${label}: ${marker}`);};
const ordered=(text,a,b,label)=>{if(text.indexOf(a)<0||text.indexOf(b)<0||text.indexOf(a)>=text.indexOf(b))throw new Error(`Invalid ${label} order`);};

const portalIndex=read('apps-script/core-engine/owner-portal-next/Portal_Index.html');
const addon=read('apps-script/core-engine/owner-portal-next/Portal_QuoteBuilder_Addon_Client.html');
const quoteIndex=read('apps-script/business-office/BusinessOffice_QuoteBuilder_Index.html');
const launch=read('apps-script/business-office/BusinessOffice_QuoteBuilder_Launch_Context.html');
const pack=JSON.parse(read('business-packs/highway38/business-pack.json'));
const generatedPack=read('business-packs/highway38/apps-script/BusinessOffice_Pack.gs');

need(portalIndex,"h38PortalRawInclude_('Portal_QuoteBuilder_Addon_Client')",'unified Quote Builder add-on include');
ordered(portalIndex,"h38PortalRawInclude_('Portal_Application_Client_Core')","h38PortalRawInclude_('Portal_QuoteBuilder_Addon_Client')",'application core before add-on');
ordered(portalIndex,"h38PortalRawInclude_('Portal_QuoteBuilder_Addon_Client')","h38PortalRawInclude_('Portal_UX_Client_Boot')",'add-on before boot');

need(addon,"module==='bo:quotes'||module==='quotes'",'Work → Quotes route replacement');
need(addon,"renderBusinessModule=async function",'legacy quote workspace shutdown');
need(addon,"openBusinessRecord=async function",'existing quote redirect');
need(addon,"openBusinessRecordForm=function",'legacy quote editor shutdown');
need(addon,"return h38OpenQuoteBuilder({view:'new'",'new quote routing');
need(addon,"return h38OpenQuoteBuilder({quoteId:recordId})",'existing quote context routing');
need(addon,"customerId:h38QuoteBuilderCustomerContext()",'customer context routing');
need(addon,"runQuickCreate=async function",'Quick Create replacement');
need(addon,"h38RunCommand=function",'command palette replacement');
need(addon,"label.textContent='Quote Builder'",'visible Business Office navigation label');
need(addon,"url.searchParams.set('returnUrl',serviceUrl)",'Business Office return route');
need(addon,"location.assign(H38_QUOTE_BUILDER_ADDON.pendingUrl)",'same-tab app launch');

need(quoteIndex,"boInclude_('BusinessOffice_QuoteBuilder_Launch_Context')",'Quote Builder launch-context include');
need(launch,"params.get('view')",'requested Quote Builder view');
need(launch,"params.get('customerId')",'selected customer context');
need(launch,"params.get('quoteId')",'selected quote context');
need(launch,"window.qbDetails(quoteId)",'existing quote open');
need(launch,"select.value=customerId",'new quote customer preselection');
need(launch,"button.textContent='Business Office'",'clear Business Office return action');
need(launch,"configured.hash='module=today'",'return to unified Business Office');

if(pack.modules.quoteBuilder!==true)throw new Error('Highway 38 Business Pack must explicitly enable quoteBuilder.');
need(generatedPack,'quotes:true,quoteBuilder:true','generated Business Pack add-on flag');

new Function(addon);
const launchBody=(launch.match(/<script>([\s\S]*?)<\/script>/)||[])[1];
if(!launchBody)throw new Error('Quote Builder launch context script body was not found.');
new Function(launchBody);

console.log('PASS — Business Office opens the installed Quote Builder, legacy quote UI/editor routes are superseded, new/existing/customer context is preserved, and the direct app returns to Business Office.');
