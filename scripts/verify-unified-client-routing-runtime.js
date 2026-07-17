#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const clientRoot = path.join(root, 'apps-script', 'core-engine', 'owner-portal-next');
const shellPath = path.join(clientRoot, 'Portal_UX_Client_Shell.html');
const applicationPath = path.join(clientRoot, 'Portal_Application_Client_Core.html');
const shell = fs.readFileSync(shellPath, 'utf8');
const application = fs.readFileSync(applicationPath, 'utf8');

assert.match(shell, /async function h38PortalBaseShow\s*\(module\)/, 'The base route must have a stable unique function name.');
assert.doesNotMatch(application, /H38_BASE_SHOW\s*=\s*show/, 'The application wrapper must not capture a hoisted show declaration.');
assert.match(application, /await h38PortalBaseShow\s*\(module\)/, 'The application wrapper must call the named base route.');

function makeNode() {
  return {
    innerHTML: '',
    textContent: '',
    className: '',
    style: {},
    firstChild: { nextSibling: null },
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
    appendChild() {},
    insertBefore() {},
    insertAdjacentHTML(_position, html) { this.innerHTML += html; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    setAttribute() {},
    getAttribute() { return ''; },
    focus() {},
    select() {},
  };
}

const nodes = new Map();
const getNode = id => {
  if (!nodes.has(id)) nodes.set(id, makeNode());
  return nodes.get(id);
};
let businessRenderCount = 0;

const context = {
  console,
  Promise,
  URLSearchParams,
  setTimeout,
  clearTimeout,
  encodeURIComponent,
  navigator: { onLine: true },
  location: { hash: '' },
  history: { replaceState() {} },
  localStorage: { getItem() { return null; }, setItem() {} },
  document: {
    body: makeNode(),
    getElementById: getNode,
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() { return makeNode(); },
  },
  window: { addEventListener() {} },
  CURRENT: 'bo:assignedTasks',
  TITLES: {},
  SAVED_VIEWS: [],
  BOOT: {},
  SCHEMA: {},
  EXPERIENCE: { views: {} },
  BO_NATIVE: { module: '', query: '' },
  money(value) { return String(value == null ? '' : value); },
  esc(value) { return String(value == null ? '' : value); },
  attr(value) { return String(value == null ? '' : value); },
  humanize(value) { return String(value == null ? '' : value); },
  notice() {},
  ownerSafeFailure(error) { throw error; },
  renderQuickCreate() {},
  renderTaskSurface() {},
  renderGrowth() {},
  renderWebsiteCenter() {},
  renderSystemHealth() {},
  renderHelp() {},
  renderTasks() {},
  renderSettings() {},
  renderRecords() {},
  renderDashboard() { getNode('view').innerHTML = '<div>Today loaded</div>'; },
  uxDashboardApproval() { return ''; },
  uxTaskList() { return ''; },
  uxActivity() { return ''; },
  uxFinancial() { return ''; },
  uxException() { return ''; },
  h38InstructionalEmpty() { return '<div>Unavailable</div>'; },
  renderBusinessModule: async module => {
    businessRenderCount += 1;
    getNode('view').innerHTML = `<div data-module="${module}">My Work loaded</div>`;
    return { status: 'PASS', module };
  },
  call: async () => ({ status: 'PASS' }),
};
context.window = Object.assign(context.window, context);
vm.createContext(context);

// Apps Script emits all includes inside one script element. Concatenating before
// evaluation reproduces browser declaration hoisting and prevents a false pass.
new vm.Script(`${shell}\n${application}`, { filename: 'assembled-unified-client.js' }).runInContext(context);
context.H38_UNIFIED = {
  ownerMode: true,
  packageName: 'Complete Business System',
  user: { role: 'Owner' },
  groups: [{
    id: 'command',
    label: 'Today',
    items: [{ key: 'bo:assignedTasks', label: 'My Work', module: 'assignedTasks', gate: 'assignedTasks' }],
  }],
};
context.H38_APP_MODULE_MANAGER = {
  modules: [{ key: 'assignedTasks', enabled: true, canView: true }],
};

(async () => {
  const result = await context.show('bo:assignedTasks');
  assert.strictEqual(result, true, 'The application wrapper should complete successfully.');
  assert.strictEqual(businessRenderCount, 1, 'The base Business Office route must execute exactly once.');
  assert.match(getNode('view').innerHTML, /My Work loaded/, 'The selected workspace must render visible content.');
  console.log('PASS: assembled unified client routes My Work once without recursive show calls.');
})().catch(error => {
  console.error(`FAIL: ${error.stack || error.message || error}`);
  process.exit(1);
});
