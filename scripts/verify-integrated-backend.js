const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'apps-script', 'integrated-backend');
const required = ['Backend_Config.gs','Backend_Repository.gs','Backend_Intake.gs','Backend_Workflows.gs','appsscript.json','README.md'];
const failures = [];
for (const file of required) if (!fs.existsSync(path.join(dir,file))) failures.push(`missing ${file}`);
const source = required.filter(f=>f.endsWith('.gs')).map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
const must = ['Owner Approval Required','LIVE_EXTERNAL_ACTIONS_ENABLED: false','H38_BACKEND_OWNER_EMAILS','Idempotency Key','LockService.getScriptLock','AUTHORIZE FULFILLMENT START','BLOCKED — OWNER APPROVAL REQUIRED','h38BackendBusinessOsSnapshot'];
for (const marker of must) if (!source.includes(marker)) failures.push(`missing safety marker: ${marker}`);
for (const forbidden of ['firebase','localStorage','MailApp.sendEmail','GmailApp.sendEmail','UrlFetchApp.fetch']) if (source.toLowerCase().includes(forbidden.toLowerCase())) failures.push(`forbidden runtime dependency/action: ${forbidden}`);
const manifest = JSON.parse(fs.readFileSync(path.join(dir,'appsscript.json'),'utf8'));
if (manifest.runtimeVersion !== 'V8') failures.push('manifest must use V8');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Integrated backend source verification: PASS');
console.log('Scopes: intake + fulfillment + owner workflows + Business OS');
console.log('External actions: LOCKED');

