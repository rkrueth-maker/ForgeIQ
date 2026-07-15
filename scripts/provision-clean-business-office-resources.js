#!/usr/bin/env node
'use strict';

const fs = require('fs');
const https = require('https');
const querystring = require('querystring');

const outputPath = process.argv[2];
if (!outputPath) throw new Error('Output path is required.');

const ownerEmail = String(process.env.CLEAN_OWNER_EMAIL || '').trim().toLowerCase();
const businessName = String(process.env.CLEAN_BUSINESS_NAME || 'Template Business').trim();
const businessId = String(process.env.CLEAN_BUSINESS_ID || 'BUSINESS').trim();
const installationId = String(process.env.CLEAN_INSTALLATION_ID || 'template-business-clean').trim();
const templateTitle = String(process.env.CLEAN_TEMPLATE_TITLE || 'Business Office Platform — Neutral Workbook Template').trim();
if (!ownerEmail) throw new Error('CLEAN_OWNER_EMAIL is required.');

function walk(value) {
  if (!value || typeof value !== 'object') return [];
  return [value, ...Object.values(value).flatMap(walk)];
}

function loadOAuth() {
  const raw = JSON.parse(fs.readFileSync(process.env.HOME + '/.clasprc.json', 'utf8'));
  const auth = walk(raw).find(item => item && typeof item === 'object' &&
    (item.refresh_token || item.refreshToken) &&
    (item.client_id || item.clientId) &&
    (item.client_secret || item.clientSecret));
  if (!auth) throw new Error('No refreshable OAuth credential was found.');
  return {
    refreshToken: auth.refresh_token || auth.refreshToken,
    clientId: auth.client_id || auth.clientId,
    clientSecret: auth.client_secret || auth.clientSecret
  };
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? '' : (typeof body === 'string' ? body : JSON.stringify(body));
    const headers = Object.assign({}, options.headers || {});
    if (payload) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = https.request(Object.assign({}, options, { headers }), res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`${options.method || 'GET'} ${options.hostname}${options.path} returned ${res.statusCode}: ${data}`));
          return;
        }
        if (!data) return resolve({});
        try { resolve(JSON.parse(data)); } catch (error) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function accessToken() {
  const oauth = loadOAuth();
  const body = querystring.stringify({
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret,
    refresh_token: oauth.refreshToken,
    grant_type: 'refresh_token'
  });
  const result = await request({
    method: 'POST',
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }, body);
  if (!result.access_token) throw new Error('OAuth token response did not contain access_token.');
  return result.access_token;
}

async function google(token, method, hostname, path, body) {
  return request({ method, hostname, path, headers: { Authorization: `Bearer ${token}` } }, body);
}

async function createFolder(token, name, parentId) {
  const body = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) body.parents = [parentId];
  return google(token, 'POST', 'www.googleapis.com', '/drive/v3/files?fields=id,name,webViewLink,parents', body);
}

async function findNeutralTemplate(token) {
  const q = `name='${templateTitle.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const path = '/drive/v3/files?' + querystring.stringify({
    q,
    fields: 'files(id,name,modifiedTime,parents)',
    orderBy: 'modifiedTime desc',
    pageSize: 20
  });
  const result = await google(token, 'GET', 'www.googleapis.com', path);
  if (!result.files || result.files.length !== 1) {
    throw new Error(`Expected exactly one neutral workbook template named ${templateTitle}; found ${(result.files || []).length}.`);
  }
  return result.files[0];
}

async function copyTemplate(token, templateId, rootId) {
  return google(token, 'POST', 'www.googleapis.com', `/drive/v3/files/${templateId}/copy?fields=id,name,webViewLink,parents`, {
    name: `${businessName} — Business Office — ${installationId}`,
    parents: [rootId]
  });
}

async function verifyWorkbook(token, spreadsheetId) {
  const metadata = await google(token, 'GET', 'sheets.googleapis.com', `/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties,sheets.properties`);
  const sheets = metadata.sheets || [];
  if (sheets.length !== 81) throw new Error(`Clean workbook must contain 81 sheets; found ${sheets.length}.`);
  const names = new Set(sheets.map(sheet => sheet.properties.title));
  for (const required of ['BO Businesses', 'BO Users', 'BO Roles', 'BO Permissions', 'BO Documents', 'BO Proof Log', 'BO Error Log', 'BO Settings', 'BO Products & Services']) {
    if (!names.has(required)) throw new Error(`Clean workbook is missing required sheet: ${required}`);
  }
  return metadata;
}

async function writeInstallationRows(token, spreadsheetId, resources) {
  const now = new Date().toISOString();
  const businessRow = [
    businessId, businessName, businessName, 'Active', 'Etc/UTC', 'USD', '', 0,
    resources.rootFolder.id, resources.documentFolder.id, resources.pdfFolder.id,
    resources.exportFolder.id, resources.backupFolder.id, 'USER-OWNER-001',
    `${businessName} Business Office`, '', '#263746', '2.0.0', now, now
  ];
  const userRow = [
    'USER-OWNER-001', businessId, ownerEmail, 'Owner', 'ROLE-OWNER', 'Active',
    'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', now, now
  ];
  const migrationRow = [
    `MIGRATION-${installationId}`, businessId, 'Neutral Workbook Template', '2.0.0',
    'Provisioned — Acceptance Required', '', 0, 0, 0,
    'Separate resources created; live acceptance pending.', '', now, '',
    'No customer, vendor, financial, payroll, tax, document, proof, or error data copied from another installation.'
  ];
  await google(token, 'POST', 'sheets.googleapis.com', `/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    valueInputOption: 'RAW',
    data: [
      { range: "'BO Businesses'!A2:T2", values: [businessRow] },
      { range: "'BO Users'!A2:N2", values: [userRow] },
      { range: "'BO Migrations'!A2:N2", values: [migrationRow] }
    ]
  });
  await google(token, 'POST', 'sheets.googleapis.com', `/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    requests: [{ updateSpreadsheetProperties: { properties: { timeZone: 'Etc/UTC' }, fields: 'timeZone' } }]
  });
}

async function createScriptProject(token) {
  return google(token, 'POST', 'script.googleapis.com', '/v1/projects', {
    title: `${businessName} Business Office — ${installationId}`
  });
}

(async () => {
  const token = await accessToken();
  const template = await findNeutralTemplate(token);
  const rootFolder = await createFolder(token, `${businessName} Business Office — ${installationId}`);
  const documentFolder = await createFolder(token, 'Original Documents', rootFolder.id);
  const pdfFolder = await createFolder(token, 'Generated PDFs', rootFolder.id);
  const exportFolder = await createFolder(token, 'Exports', rootFolder.id);
  const backupFolder = await createFolder(token, 'Backups', rootFolder.id);
  const workbook = await copyTemplate(token, template.id, rootFolder.id);
  const workbookMetadata = await verifyWorkbook(token, workbook.id);
  const resources = { rootFolder, documentFolder, pdfFolder, exportFolder, backupFolder };
  await writeInstallationRows(token, workbook.id, resources);
  const scriptProject = await createScriptProject(token);
  if (!scriptProject.scriptId) throw new Error('Apps Script project creation did not return a scriptId.');
  const result = {
    status: 'PROVISIONED — ACCEPTANCE REQUIRED',
    installationId,
    businessId,
    businessName,
    ownerEmail,
    neutralTemplate: { title: templateTitle, verifiedSheetCount: workbookMetadata.sheets.length },
    spreadsheet: { id: workbook.id, url: workbook.webViewLink || `https://docs.google.com/spreadsheets/d/${workbook.id}/edit` },
    rootFolder,
    documentFolder,
    pdfFolder,
    exportFolder,
    backupFolder,
    appsScriptProject: { id: scriptProject.scriptId },
    externalActionsEnabled: false,
    directPaymentProcessing: false,
    directPayrollFunding: false,
    directTaxFiling: false,
    sourceBusinessDataCopied: false
  };
  fs.mkdirSync(require('path').dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ status: result.status, installationId, businessId, sheetCount: workbookMetadata.sheets.length, scriptProjectCreated: true }, null, 2));
})().catch(error => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
