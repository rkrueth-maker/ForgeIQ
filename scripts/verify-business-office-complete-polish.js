#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const client=fs.readFileSync(path.join(root,'apps-script/business-office/BusinessOffice_ControlPlane_Client.html'),'utf8');
const server=fs.readFileSync(path.join(root,'apps-script/business-office/BusinessOffice_ControlPlane_26_CompletePolish.gs'),'utf8');
const checks=[
 ['friendly employee selector',/Employee<select id="au">/],
 ['customer selector',/Customer<select id="ac">/],
 ['property selector',/Property<select id="ap">/],
 ['job selector',/Job<select id="aj">/],
 ['arrival window',/Arrival window/],
 ['estimated duration',/Estimated duration/],
 ['proof requirements',/Required closeout/],
 ['dispatch surface',/SCHEDULE & DISPATCH/],
 ['employee my day',/My Day/],
 ['owner attention',/Needs attention/],
 ['job cost',/JOB COST/],
 ['external action boundary',/Nothing was sent automatically/]
];
checks.forEach(([name,re])=>{if(!re.test(client))throw new Error('Missing '+name);});
[
 ['references',/boControlPolishReferences_/],
 ['role guard',/if\(!caps\.assignWork\)/],
 ['attention',/boControlPolishAttention_/],
 ['job costs',/boControlPolishJobCosts_/],
 ['enriched names',/Customer Name/]
].forEach(([name,re])=>{if(!re.test(server))throw new Error('Missing server '+name);});
if(/sendEmail|GmailApp\.sendEmail|UrlFetchApp\.fetch/.test(client+server))throw new Error('External action introduced');
console.log('PASS — Business Office complete-polish operating flow verified.');