'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'apps-script/business-office/BusinessOffice_UnifiedDemoSeeder.gs');
const source=fs.readFileSync(file,'utf8');
const required=[
  'function boSeedUnifiedSevenDemoSystem()',
  'function boResetUnifiedSevenDemoSystem()',
  "const H38_DEMO7_MARKER = 'H38-DEMO7'",
  'FLOWER','DRIVE','POND','CLEAR','DECK','IRR','KIT',
  '01 Intake','02 Photos','03 Measurements','04 Quotes','05 Approvals','06 Job Guide','07 Tasks','08 Purchases and Inspections','09 Proof','10 Invoice and Payment','11 Closeout','12 Backup',
  'QUOTE-PDF','JOB-GUIDE-PDF','TASK-LIST-PDF','INVOICE-PDF','CLOSEOUT-PDF',
  'example.invalid','No real customer, purchase, payment','externalActionsPerformed:false'
];
const missing=required.filter(x=>!source.includes(x));
if(missing.length){console.error(JSON.stringify({status:'FAIL',missing},null,2));process.exit(1);}
const projectCount=(source.match(/key:'(?:FLOWER|DRIVE|POND|CLEAR|DECK|IRR|KIT)'/g)||[]).length;
if(projectCount!==7){console.error(JSON.stringify({status:'FAIL',projectCount},null,2));process.exit(1);}
const forbidden=['MailApp.','GmailApp.','UrlFetchApp.fetch(','CalendarApp.','createEvent(','sendEmail(','setValue(true)'];
const found=forbidden.filter(x=>source.includes(x));
if(found.length){console.error(JSON.stringify({status:'FAIL',forbiddenFound:found},null,2));process.exit(1);}
console.log(JSON.stringify({status:'PASS',projectCount,isolatedFolders:12,pdfsPerProject:5,externalActions:false},null,2));
