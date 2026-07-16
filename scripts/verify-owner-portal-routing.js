#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const passes = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}
function pass(name, evidence = '') {
  passes.push({ name, evidence });
  console.log(`PASS: ${name}${evidence ? ` — ${evidence}` : ''}`);
}
function fail(name, evidence = '') {
  failures.push({ name, evidence });
  console.error(`FAIL: ${name}${evidence ? ` — ${evidence}` : ''}`);
}
function assert(name, condition, evidence = '') {
  condition ? pass(name, evidence) : fail(name, evidence);
}

const portal = read('portal.html');
const brand = read('brand-global.js');
const businessUi = read('apps-script/business-office/BusinessOffice_Index.html');
const businessCore = read('apps-script/business-office/BusinessOffice_Core.gs');
const businessWeb = read('apps-script/business-office/BusinessOffice_Web.gs');

const ownerAppUrl = 'https://script.google.com/macros/s/AKfycbzr0hoImRF4iQ1gR90Cr17juP8PODkEWRorXxW6qralEYTGLhOU33E1wYEPU_3duQKpQg/exec';
const officeAppUrl = 'https://script.google.com/macros/s/AKfycbyf9ivM04iKqg9QqM1PgRQgD4Imf6VY_mMpCLLsU6lRbGYsprTEEzlwEE93pRgqPzCcmg/exec?app=business-office';
const launchLinks = [...portal.matchAll(/<a\b[^>]*href=["'](https:\/\/script\.google\.com\/macros\/s\/[^"']+)["'][^>]*>/gi)].map(match => match[1]);

assert('website Owner Portal page exists', /<title>Owner Portal \| Highway 38 Solutions<\/title>/.test(portal));
assert('portal contains Operations and Social tab', /Operations &amp; Social/.test(portal));
assert('portal contains Business Office tab', />Business Office</.test(portal));
assert('portal contains upload tab', /Upload PDF \/ Take Picture/.test(portal));
assert('portal uses secure top-level launchers instead of private Google iframes', !/<iframe\b/i.test(portal));
assert('portal launches accepted Owner Operations deployment', launchLinks.some(href => href === ownerAppUrl));
assert('portal launches accepted Business Office deployment', launchLinks.some(href => href.startsWith(officeAppUrl)));
assert('portal provides same-tab primary secure launch actions', /class="launch-primary"[^>]+href="https:\/\/script\.google\.com\/macros\/s\//.test(portal));
assert('portal provides new-tab fallback launch actions', /class="launch-secondary"[^>]+target="_blank"[^>]+rel="noopener noreferrer"/.test(portal));
assert('portal explains the Google authentication frame boundary', /old embedded frame was blocked by Google\/Chrome authentication protections/i.test(portal));
assert('portal contains no spreadsheet destination', !/docs\.google\.com\/spreadsheets/i.test(portal));
assert('portal has mobile layout rules', /@media\(max-width:600px\)/.test(portal) && /@media\(max-width:900px\)/.test(portal));

assert('legacy Owner Login links are routed to portal.html', /link\.href='portal\.html'/.test(brand));
assert('legacy Owner Login rewrite removes new-window behavior', /link\.removeAttribute\('target'\)/.test(brand));

assert('Business Office dashboard uses calculated owner metrics', /return boGetOwnerDashboard_\(\);/.test(businessCore));
assert('Business Office core does not generate spreadsheet card URLs', !/Open Records URL|spreadsheet\.getUrl\(\)\s*\+\s*['"]#gid=/i.test(businessCore));
assert('dashboard contains no Open source records action', !/Open source records/i.test(businessUi));
assert('dashboard contains no Open Records URL renderer', !/Open Records URL/i.test(businessUi));
assert('dashboard tells owner to use portal navigation', /Use the Owner Portal navigation/.test(businessUi));
assert('ordinary dashboard cards contain no outbound anchor', !/rows\.map\(row\s*=>[\s\S]{0,900}<a\b/i.test(businessUi));
assert('retained spreadsheet links are explicitly administrative', /Administrative spreadsheet/.test(businessUi));
assert('administrative spreadsheet link requires confirmation', /Open the administrative spreadsheet outside the Owner Portal\?/.test(businessUi));
assert('Business Office navigation remains in-app', /onclick="openModule\('/.test(businessUi));
assert('Business Office web app does not redirect to spreadsheet', !/docs\.google\.com\/spreadsheets|SpreadsheetApp\.getActiveSpreadsheet\(\)\.getUrl\(\)/i.test(businessWeb));

const rootHtmlFiles = fs.readdirSync(root).filter(name => name.endsWith('.html'));
const ownerLinks = [];
const badOwnerLinks = [];
const sheetLinks = [];
for (const file of rootHtmlFiles) {
  const html = read(file);
  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  for (const match of anchors) {
    const href = match[1];
    const label = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (/owner\s+(login|portal)/i.test(label) && !href.startsWith('#')) {
      ownerLinks.push({ file, href, label });
      if (!/(^|\/)portal\.html(?:[?#].*)?$/.test(href)) badOwnerLinks.push({ file, href, label });
    }
    if (/docs\.google\.com\/spreadsheets/i.test(href)) sheetLinks.push({ file, href, label });
  }
}
assert('all static Owner Login and Owner Portal links target portal.html', badOwnerLinks.length === 0, badOwnerLinks.length ? JSON.stringify(badOwnerLinks) : `${ownerLinks.length} inspected`);
assert('public static pages contain no direct spreadsheet links', sheetLinks.length === 0, sheetLinks.length ? JSON.stringify(sheetLinks) : `${rootHtmlFiles.length} HTML files inspected`);

const result = {
  status: failures.length ? 'HOLD' : 'PASS',
  sourceCommit: process.env.GITHUB_SHA || '',
  inspected: {
    rootHtmlFiles: rootHtmlFiles.length,
    ownerLinks: ownerLinks.length,
    portalTabs: 3,
    privateFrames: (portal.match(/<iframe\b/g) || []).length,
    secureLaunchLinks: launchLinks.length
  },
  passes,
  failures
};
const outDir = path.join(root, 'artifacts', 'owner-portal-routing');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`\nRESULT: ${result.status} (${passes.length} pass, ${failures.length} fail)`);
process.exit(failures.length ? 1 : 0);
