#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const findings = [];
const passes = [];
const check = (name, condition, detail = '') => {
  (condition ? passes : failures).push({ name, detail });
  console[condition ? 'log' : 'error'](`${condition ? 'PASS' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`);
};
const finding = (name, detail) => {
  findings.push({ name, detail });
  console.warn(`REVIEW: ${name} — ${detail}`);
};

const contractSource = read('apps-script/business-office/BusinessOffice_ModuleContract.gs');
const applicationCore = read('apps-script/core-engine/owner-portal-next/Portal_Application_Client_Core.html');
const uxShell = read('apps-script/core-engine/owner-portal-next/Portal_UX_Client_Shell.html');
const workspaceClient = read('apps-script/core-engine/owner-portal-next/Portal_Experience_Client_Workspace.html');
const viewsClient = read('apps-script/core-engine/owner-portal-next/Portal_Experience_Client_Views.html');

const runtime = { Object, Array, String, Number, Boolean, Math, JSON, Date, RegExp, Error };
vm.createContext(runtime);
new vm.Script(contractSource, { filename: 'BusinessOffice_ModuleContract.gs' }).runInContext(runtime);
const contract = runtime.boGetUnifiedModuleContract_();

const expectedGroups = [
  ['command', 'Today', 10],
  ['sales', 'Customers', 20],
  ['work', 'Work', 30],
  ['money', 'Money', 40],
  ['documents', 'Documents', 50],
  ['growth', 'Growth', 60],
  ['office', 'Office', 70]
];
const expectedModules = {
  command: ['commandCenter', 'assignedTasks', 'approvals', 'calendar'],
  sales: ['requests', 'customers', 'quotes', 'messaging', 'smsConsent'],
  work: ['workOrders', 'jobs', 'time', 'equipment'],
  money: ['invoices', 'payments', 'expenses', 'vendors', 'purchaseOrders', 'vendorBills', 'receipts', 'accounting', 'payroll', 'tax', 'reports'],
  documents: ['documents', 'messageTemplates'],
  growth: ['growth', 'website', 'social', 'advertising'],
  office: ['setup', 'setupWizard', 'users', 'employees', 'contractors', 'backups', 'proof', 'errors', 'systemHealth', 'settings', 'help']
};

check('seven canonical headings are present in exact order',
  JSON.stringify(contract.groups.map(group => [group.id, group.label, group.order])) === JSON.stringify(expectedGroups),
  JSON.stringify(contract.groups.map(group => [group.id, group.label, group.order]))
);

for (const [groupId, expected] of Object.entries(expectedModules)) {
  const actual = contract.modules.filter(module => module.visible && module.group === groupId).map(module => module.module);
  check(`${groupId} contains every intended visible option in exact order`, JSON.stringify(actual) === JSON.stringify(expected), JSON.stringify(actual));
}

const visible = contract.modules.filter(module => module.visible);
const routes = visible.map(module => module.route);
const labels = visible.map(module => module.label);
check('every visible option has one route', visible.every(module => module.route && typeof module.route === 'string'));
check('visible routes are unique', new Set(routes).size === routes.length, routes.join(', '));
check('visible module keys are unique', new Set(visible.map(module => module.module)).size === visible.length);
check('visible labels are unambiguous', new Set(labels).size === labels.length, labels.join(', '));
check('hidden capabilities do not leak into navigation', contract.modules.filter(module => !module.visible).every(module => !module.route));
check('all modules preserve an explicit owner, permission, lifecycle, loading, and external-action policy', contract.modules.every(module => module.dataOwner && module.serverOwner && module.clientOwner && module.permissionPolicy && module.disablePolicy && module.loadStrategy && module.externalActions && module.deletePolicy));

check('Quotes are in Customers', contract.modules.find(module => module.module === 'quotes').group === 'sales');
check('Reports are in Money', contract.modules.find(module => module.module === 'reports').group === 'money');
check('Office contains Settings as a single option rather than a parent heading', contract.groups.find(group => group.id === 'office').label === 'Office' && expectedModules.office.includes('settings'));

const specialRoutes = ['moduleManager', 'setupWizard', 'approvalsCenter', 'calendarCenter', 'userAccess', 'backupCenter'];
check('special native routes have dedicated renderers', specialRoutes.every(route => applicationCore.includes(`${route}:'h38Render`)));
const baseRoutes = ['today', 'growth', 'websiteCenter', 'systemHealth', 'help', 'settings', 'proof', 'errors'];
check('base native routes have explicit rendering paths', baseRoutes.every(route => uxShell.includes(`module==='${route}'`)));
check('all bo: routes use the one Business Office renderer', uxShell.includes("if(String(module).indexOf('bo:')===0)return await uxShowBusinessModule"));

check('Settings route opens Settings & Safety content', workspaceClient.includes("function renderSettings()") && workspaceClient.includes('<h1>Settings & Safety</h1>'));
check('Settings covers application, installation, safety, self-test, and integration contracts', ['<h2>Application</h2>', '<h2>Installation</h2>', '<h2>Safety</h2>', 'Run non-destructive self-test', '<h2>Integration contracts</h2>'].every(marker => workspaceClient.includes(marker)));
check('System Health has a separate live-status purpose', viewsClient.includes('function renderSystemHealth') && viewsClient.includes('<h1>System Health</h1>') && viewsClient.includes('Integration blockers'));
check('Settings and System Health preserve external-action locks', workspaceClient.includes("externalActions:'LOCKED'") && viewsClient.includes("safety.liveExternalActions?'ON':'LOCKED'"));

const settingsModule = contract.modules.find(module => module.module === 'settings');
if (settingsModule.label !== 'Settings & Safety') finding('Settings label does not match its page heading', `Navigation label is “${settingsModule.label}”; page heading is “Settings & Safety”.`);
if (workspaceClient.includes('Accounting CSV')) finding('Accounting export is listed inside Settings', 'Accounting CSV is a Money/Accounting function and should be reviewed for relocation to Accounting Prep or Reports.');
if (workspaceClient.includes('Integration contracts') && viewsClient.includes('Integration health')) finding('Settings and System Health overlap', 'Both pages show integration and safety information; the next pass should define a clear boundary and remove duplication without losing diagnostics.');

const result = {
  status: failures.length ? 'FAIL' : findings.length ? 'REVIEW' : 'PASS',
  generatedAt: new Date().toISOString(),
  groupsChecked: expectedGroups.length,
  visibleOptionsChecked: visible.length,
  settingsSectionsChecked: 5,
  passed: passes.length,
  failed: failures.length,
  findings
};
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
