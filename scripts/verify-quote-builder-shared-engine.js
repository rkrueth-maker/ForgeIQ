#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const requireText = (file, text) => {
  const body = read(file);
  if (!body.includes(text)) failures.push(`${file} missing: ${text}`);
};

const engine = 'apps-script/business-office/BusinessOffice_QuoteBuilder.gs';
const web = 'apps-script/business-office/BusinessOffice_Web.gs';
const guard = 'apps-script/business-office/BusinessOffice_ModuleAccess.gs';
const pkg = 'packages/quote-builder/package.json';

[engine, web, guard, pkg].forEach((file) => {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing file: ${file}`);
});

if (!failures.length) {
  requireText(engine, 'function boQuoteBuilderDashboard_()');
  requireText(engine, 'function boQuoteBuilderPriceBook_(');
  requireText(engine, 'function boDuplicateQuote_(');
  requireText(engine, 'function boPrepareAiQuoteDraft_(');
  requireText(engine, "AI did not invent or approve pricing.");
  requireText(web, 'quoteBuilderDashboard:function()');
  requireText(web, 'prepareAiQuoteDraft:function()');
  requireText(guard, 'prepareAiQuoteDraft');
  const manifest = JSON.parse(read(pkg));
  if (manifest.sharedEngine !== true) failures.push('Quote Builder package must use the shared engine.');
  if (manifest.controls.aiMaySetFinalPrice !== false) failures.push('AI final pricing must remain disabled.');
  if (manifest.controls.ownerApprovalBeforeRelease !== true) failures.push('Owner approval control must remain enabled.');
}

if (failures.length) {
  console.error('QUOTE BUILDER VERIFICATION: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('QUOTE BUILDER VERIFICATION: PASS');
console.log('- shared Business Office quote engine preserved');
console.log('- standalone package manifest present');
console.log('- owner approval and AI pricing boundaries present');
