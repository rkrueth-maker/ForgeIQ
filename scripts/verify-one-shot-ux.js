#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const failures=[];
const pass=[];
const check=(name,condition,detail='')=>(condition?pass:failures).push({name,detail});
const need=(file,marker,label)=>check(label,read(file).includes(marker),`${file} must contain ${marker}`);

const required=[
  'ux-unified-public.css','request-flow.js','customer-portal-ux.js','index.html','products.html','start-request.html','customer-portal.html','public-expansion.js',
  'apps-script/core-engine/owner-portal-next/Portal_OneShot_UX_Styles.html','apps-script/core-engine/owner-portal-next/Portal_OneShot_Client.html',
  'apps-script/core-engine/owner-portal-next/Portal_RawIncludes.js','apps-script/core-engine/owner-portal-next/Portal_Index.html'
];
required.forEach(file=>check(`required ${file}`,exists(file)));

['public-expansion.js','request-flow.js','customer-portal-ux.js','apps-script/core-engine/owner-portal-next/Portal_OneShot_Client.html'].forEach(file=>{
  try{new vm.Script(read(file),{filename:file});check(`syntax ${file}`,true);}catch(error){check(`syntax ${file}`,false,error.message);}
});

need('public-expansion.js','Solutions & Pricing','public navigation uses one commercial label');
need('public-expansion.js','Examples','public navigation uses Examples');
need('public-expansion.js','Customer Portal','public navigation exposes customer access');
need('public-expansion.js','Owner Login','one public owner-access label');
check('draft offers excluded from primary public navigation',!/\["services"|\["business-os"/.test(read('public-expansion.js')));

need('index.html','h38-home-hero','homepage uses approved split hero');
need('index.html','Big problems.','homepage preserves primary promise');
need('index.html','Clear plans.','homepage preserves primary promise completion');
need('index.html','h38-outcome-grid','homepage routes by outcome');
need('index.html','h38-trust-strip','homepage shows buying assurances');
need('index.html','homepage-hero-garage-workspace.webp','homepage uses approved representative image');

const request=read('start-request.html');
[1,2,3].forEach(step=>check(`request step ${step}`,request.includes(`data-request-step="${step}"`)));
['What result do you need?','Tell us about the problem.','Contact and review.'].forEach(text=>check(`request copy ${text}`,request.includes(text)));
check('request preserves approved catalog selectors',request.includes('id="product"')&&request.includes('id="bundle"')&&request.includes('id="business-system-interest"'));
check('request preserves buying-term truth', ['price','payment','turnaround','revisions','exclusions'].every(term=>request.toLowerCase().includes(term)));
check('request no-charge control',/No charge|no-charge/i.test(request));

const customer=read('customer-portal.html');
check('customer action required host',customer.includes('id="actionRequired"'));
check('customer current project host',customer.includes('id="currentProject"'));
check('customer project-first navigation',customer.includes('Projects')&&customer.includes('Quotes')&&customer.includes('Invoices')&&customer.includes('Files')&&customer.includes('Messages'));
check('customer UX enhancement loaded',customer.includes('customer-portal-ux.js'));
check('customer portal remains noindex',customer.includes('noindex,nofollow'));
const customerUx=read('customer-portal-ux.js');
check('quote review action mirrored safely',customerUx.includes('actionApproveQuote')&&customerUx.includes("approve.click"));
check('quote change becomes owner-review message',customerUx.includes('Request a change')&&customerUx.includes('messageBody'));
check('project timeline present',customerUx.includes('h38-project-timeline'));

const portalIndex=read('apps-script/core-engine/owner-portal-next/Portal_Index.html');
const raw=read('apps-script/core-engine/owner-portal-next/Portal_RawIncludes.js');
check('Owner one-shot styles included',portalIndex.includes("Portal_OneShot_UX_Styles")&&raw.includes("Portal_OneShot_UX_Styles"));
check('Owner one-shot client included',portalIndex.includes("Portal_OneShot_Client")&&raw.includes("Portal_OneShot_Client"));
const owner=read('apps-script/core-engine/owner-portal-next/Portal_OneShot_Client.html');
['Needs decision','Due today','Late items','Money in','Holds / errors','Next up','Today\\\'s calendar','Recent activity','System health'].forEach(marker=>check(`Owner Today marker ${marker}`,owner.includes(marker.replace('\\\'','\''))||owner.includes(marker)));
check('Owner external actions remain gated',owner.includes('remain approval gated'));
check('Owner selected record controls preserved',read('apps-script/core-engine/owner-portal-next/Portal_Application_Client_Views.html').includes('Selected record only'));

const css=read('ux-unified-public.css');
['h38-home-hero','h38-choice-grid','h38-portal-layout','@media(max-width:760px)'].forEach(marker=>check(`responsive visual contract ${marker}`,css.includes(marker)));
const ownerCss=read('apps-script/core-engine/owner-portal-next/Portal_OneShot_UX_Styles.html');
check('Owner five-metric layout',ownerCss.includes('repeat(5,minmax(145px,1fr))'));
check('Owner responsive metric collapse',ownerCss.includes('@media(max-width:1180px)')&&ownerCss.includes('@media(max-width:850px)'));

const result={status:failures.length?'FAIL':'PASS',passed:pass.length,failed:failures.length,failures};
console.log(JSON.stringify(result,null,2));
process.exit(failures.length?1:0);
