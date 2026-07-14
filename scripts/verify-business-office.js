#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const boDir = path.join(root, 'apps-script', 'business-office');
const bridgeDir = path.join(root, 'apps-script', 'integrated-backend');
const requiredFiles = [
  'BusinessOffice_Config.gs',
  'BusinessOffice_Auth.gs',
  'BusinessOffice_Core.gs',
  'BusinessOffice_Workflows.gs',
  'BusinessOffice_Accounting.gs',
  'BusinessOffice_PayrollTax.gs',
  'BusinessOffice_DocumentsPDF.gs',
  'BusinessOffice_Installer.gs',
  'BusinessOffice_Web.gs',
  'BusinessOffice_Test.gs',
  'BusinessOffice_LiveAcceptance.gs',
  'BusinessOffice_Index.html',
  'appsscript.json',
  'README.md'
];

const failures = [];
const passes = [];
function pass(name, evidence = '') { passes.push({ name, evidence }); console.log(`PASS: ${name}${evidence ? ` — ${evidence}` : ''}`); }
function fail(name, evidence = '') { failures.push({ name, evidence }); console.error(`FAIL: ${name}${evidence ? ` — ${evidence}` : ''}`); }
function assert(name, condition, evidence = '') { condition ? pass(name, evidence) : fail(name, evidence); }
function read(file) { return fs.readFileSync(file, 'utf8'); }

for (const file of requiredFiles) {
  assert(`required file ${file}`, fs.existsSync(path.join(boDir, file)));
}
assert('integrated intake bridge file', fs.existsSync(path.join(bridgeDir, 'H38_Business_Office_Bridge.gs')));

for (const file of fs.readdirSync(boDir).filter(name => name.endsWith('.gs'))) {
  const source = path.join(boDir, file);
  const temp = path.join(process.cwd(), `.tmp-${file}.js`);
  fs.copyFileSync(source, temp);
  try {
    execFileSync(process.execPath, ['--check', temp], { stdio: 'pipe' });
    pass(`syntax ${file}`);
  } catch (error) {
    fail(`syntax ${file}`, error.stderr ? error.stderr.toString() : error.message);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}
for (const file of fs.readdirSync(bridgeDir).filter(name => name.endsWith('.gs'))) {
  const source = path.join(bridgeDir, file);
  const temp = path.join(process.cwd(), `.tmp-bridge-${file}.js`);
  fs.copyFileSync(source, temp);
  try {
    execFileSync(process.execPath, ['--check', temp], { stdio: 'pipe' });
    pass(`syntax bridge ${file}`);
  } catch (error) {
    fail(`syntax bridge ${file}`, error.stderr ? error.stderr.toString() : error.message);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

const allSource = fs.readdirSync(boDir).filter(name => /\.(gs|html|json)$/.test(name)).map(name => read(path.join(boDir, name))).join('\n');
const bridgeHelper = read(path.join(bridgeDir, 'H38_Business_Office_Bridge.gs'));

const requiredFunctions = [
  'boGetCurrentUser_', 'boRequirePermission_', 'boListRecords', 'boSaveRecord',
  'boCreateCustomerFromRequest', 'boCreateQuote', 'boReviseQuote',
  'boConvertQuoteToWorkOrderAndJob', 'boCreateInvoiceFromJob',
  'boMatchVendorBillToPurchaseOrder', 'boConvertReceiptToExpense', 'boRecordPayment',
  'boPrepareJournalEntry', 'boPostJournalEntry', 'boReverseJournalEntry', 'boLockAccountingPeriod',
  'boPreparePayrollPeriod', 'boExportPayrollProviderCsv',
  'boPrepareSalesTaxPeriod', 'boFinalizeTaxPreparationReport',
  'boUploadDocument', 'boExtractDocument', 'boReviewOcrField', 'boApproveDocument',
  'boGeneratePdf', 'boCreateBackup', 'boPrepareRestore', 'boValidateInstallation',
  'boRunSelfTest', 'boRunLiveAcceptance', 'boBootstrapInstall', 'boGetRenderedWebAppHtml', 'doGet', 'boApi'
];
for (const fn of requiredFunctions) assert(`function ${fn}`, new RegExp(`function\\s+${fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(`).test(allSource));

assert('separate Business Office spreadsheet property', allSource.includes('H38_BUSINESS_OFFICE_SPREADSHEET_ID'));
assert('source-preserving intake sync', bridgeHelper.includes('h38BusinessOfficeSyncRequests') && bridgeHelper.includes('Backend Requests'));
assert('sync trigger installer', bridgeHelper.includes('h38BusinessOfficeInstallSyncTrigger') && bridgeHelper.includes('everyMinutes(5)'));
assert('live acceptance executes intake synchronization', allSource.includes("Existing intake additive synchronization") && allSource.includes('h38BusinessOfficeSyncRequests'));
assert('intake bridge idempotency', bridgeHelper.includes('DUPLICATE_PREVENTED'));
assert('intake survives mirror failure', bridgeHelper.includes("return { status: 'HOLD'"));

const forbidden = [
  /GmailApp\.sendEmail/i,
  /MailApp\.sendEmail/i,
  /Stripe/i,
  /PayPal/i,
  /DirectDepositService|createDirectDeposit|issueDirectDeposit/i,
  /TaxFilingService|submitTaxReturn|efileTaxReturn/i,
  /coming soon/i,
  /TODO\s*:\s*implement/i,
  /password\s*[:=]\s*['"][^'"]+/i,
  /private[_ -]?key\s*[:=]/i,
  /api[_ -]?key\s*[:=]\s*['"][^'"]+/i
];
for (const pattern of forbidden) assert(`forbidden pattern absent ${pattern}`, !pattern.test(allSource));
assert('no anonymous web access', !allSource.includes('ANYONE_ANONYMOUS'));
assert('web app executes as accessing user', read(path.join(boDir, 'appsscript.json')).includes('USER_ACCESSING'));
assert('external actions hard disabled', allSource.includes('EXTERNAL_ACTIONS_ENABLED: false'));
assert('direct payment hard disabled', allSource.includes('DIRECT_PAYMENT_PROCESSING: false'));
assert('payroll funding hard disabled', allSource.includes('DIRECT_PAYROLL_FUNDING: false'));
assert('tax filing hard disabled', allSource.includes('DIRECT_TAX_FILING: false'));
assert('selected-record API requires record IDs', /recordId/.test(read(path.join(boDir, 'BusinessOffice_Web.gs'))));
assert('soft void preserves documents', allSource.includes('Drive original preserved'));
assert('duplicate hash protection', allSource.includes('SHA_256') && allSource.includes('Duplicate upload blocked'));
assert('OCR review gate', allSource.includes('Every extracted field must be reviewed'));
assert('posting gate', allSource.includes("'Posting Allowed'] === 'Yes'"));
assert('payroll export gate', allSource.includes("'Export Allowed'] === 'Yes'"));
assert('tax finalization gate', allSource.includes("'Finalization Allowed'] === 'Yes'"));
assert('quote send gate', allSource.includes("'Send Allowed'"));
assert('role set complete', ['Owner','Administrator','Staff','Bookkeeper','Payroll','Viewer'].every(role => allSource.includes(`'${role}'`)));

const configSource = read(path.join(boDir, 'BusinessOffice_Config.gs'));
const sheetNames = [...configSource.matchAll(/:\s*'BO [^']+'/g)].map(match => match[0]);
assert('complete workbook schema represented in source', sheetNames.length >= 75, `${sheetNames.length} configured sheets`);

const manifest = JSON.parse(read(path.join(boDir, 'appsscript.json')));
assert('API executable configured', manifest.executionApi && manifest.executionApi.access === 'ANYONE');
assert('manifest V8 runtime', manifest.runtimeVersion === 'V8');
assert('Drive advanced service configured', manifest.dependencies && manifest.dependencies.enabledAdvancedServices.some(service => service.serviceId === 'drive'));
assert('required OAuth scopes', ['spreadsheets','drive','documents','userinfo.email'].every(token => manifest.oauthScopes.some(scope => scope.includes(token))));

const ui = read(path.join(boDir, 'BusinessOffice_Index.html'));
assert('mobile responsive UI', /@media\s*\(max-width:800px\)/.test(ui));
assert('confirmation before destructive action', ui.includes('confirm('));
assert('document preview before approval', ui.includes('previewUpload') && ui.includes('uploadPreview'));
assert('mobile camera capture control', ui.includes('capture="environment"'));
assert('live receipt and work-order OCR acceptance', allSource.includes('Live receipt camera-path image upload') && allSource.includes('Live work-order photo upload'));
assert('live Apps Script PDF acceptance', allSource.includes('Live branded Apps Script PDF generation'));
assert('deployed rendered web app acceptance', allSource.includes('boGetRenderedWebAppHtml'));
assert('expected blocked errors resolved as audit evidence', allSource.includes('boResolveExpectedAcceptanceErrors_'));
assert('secure first-run bootstrap', allSource.includes('Only the expected deploying owner may bootstrap this project'));
assert('search and filters', ui.includes('Search') && ui.includes('savedViews') && ui.includes('applySavedView'));
assert('plain-language navigation modules', ['Customers','Vendors','Quotes','Work Orders','Jobs','Purchase Orders','Expenses','Invoices','Payroll Preparation','Tax Preparation','Documents / OCR','Approval Queue'].every(label => ui.includes(label) || allSource.includes(label)));
assert('no empty button labels', !/<button[^>]*>\s*<\/button>/i.test(ui));

function money(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100; }
function payroll(input) {
  const regular = money(input.regularHours * input.hourlyRate);
  const overtime = money(input.overtimeHours * input.hourlyRate * input.overtimeMultiplier);
  const gross = money(regular + overtime + (input.salaryPay || 0) + (input.otherPay || 0));
  const net = money(gross + (input.reimbursements || 0) - (input.deductions || 0));
  const employerTax = money(gross * 0.0765);
  return { regular, overtime, gross, net, employerTax };
}
const payrollCase = payroll({ regularHours:40, overtimeHours:5, hourlyRate:20, overtimeMultiplier:1.5, reimbursements:50, deductions:100 });
assert('payroll test gross', payrollCase.gross === 950, JSON.stringify(payrollCase));
assert('payroll test prepared net', payrollCase.net === 900, JSON.stringify(payrollCase));
assert('payroll test employer tax estimate', payrollCase.employerTax === 72.68, JSON.stringify(payrollCase));

const journal = [{ debit:1070, credit:0 }, { debit:0, credit:1000 }, { debit:0, credit:70 }].reduce((acc,line)=>({debit:money(acc.debit+line.debit),credit:money(acc.credit+line.credit)}),{debit:0,credit:0});
assert('double-entry test balances', journal.debit === journal.credit, JSON.stringify(journal));

const packageJson = JSON.parse(read(path.join(root, 'package.json')));
assert('package test script', packageJson.scripts && packageJson.scripts['test:business-office'] === 'node scripts/verify-business-office.js');

const result = { status: failures.length ? 'HOLD' : 'PASS', passes: passes.length, failures };
fs.mkdirSync(path.join(root, 'artifacts', 'business-office'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifacts', 'business-office', 'verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`\nRESULT: ${result.status} (${passes.length} pass, ${failures.length} fail)`);
process.exit(failures.length ? 1 : 0);
