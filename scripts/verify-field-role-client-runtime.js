#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'apps-script/core-engine/owner-portal-next/Portal_Field_Roles_Client.html'), 'utf8');
let baseBrandCalls = 0;
const release = { textContent: '', title: '', dataset: { fullRelease: 'Owner Portal' } };
const sandbox = {
  console,
  document: {
    getElementById(id) { return id === 'release' ? release : null; },
    createElement() { return {}; },
    body: { appendChild() {} },
  },
  renderDashboard() {},
  h38NormalizeBrand() {
    baseBrandCalls += 1;
    release.textContent = 'Owner Portal';
    release.title = 'Owner Portal';
  },
  h38AppRouteAllowed() { return true; },
  h38AppModuleKeyFromRoute(route) { return String(route || '').replace(/^bo:/, ''); },
  h38AppModuleState() { return null; },
  H38_UNIFIED: { user: { role: 'Employee' } },
  EXPERIENCE: {},
  BOOT: {},
};

try {
  vm.createContext(sandbox);
  new vm.Script(source, { filename: 'Portal_Field_Roles_Client.html' }).runInContext(sandbox);

  sandbox.h38NormalizeBrand();
  if (baseBrandCalls !== 1) throw new Error(`Expected one base-brand call, received ${baseBrandCalls}.`);
  if (release.textContent !== 'Employee Portal') throw new Error(`Employee branding did not render: ${release.textContent}.`);
  if (sandbox.h38AppRouteAllowed('bo:invoices') !== false) throw new Error('Employee invoice access was not blocked.');
  if (sandbox.h38AppRouteAllowed('bo:time') !== true) throw new Error('Employee time access was not preserved.');

  sandbox.H38_UNIFIED.user.role = 'Owner';
  sandbox.h38NormalizeBrand();
  if (baseBrandCalls !== 2) throw new Error(`Owner branding did not call the base exactly once: ${baseBrandCalls}.`);
  if (release.textContent !== 'Owner Portal') throw new Error(`Owner branding was not restored: ${release.textContent}.`);

  console.log('PASS: field-role brand override is non-recursive and role routes remain bounded');
} catch (error) {
  console.error(`FAIL: field-role client runtime — ${error.message}`);
  process.exit(1);
}
