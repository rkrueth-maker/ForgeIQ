#!/usr/bin/env node
'use strict';

const fs = require('fs');
const https = require('https');
const path = require('path');
const querystring = require('querystring');
const zlib = require('zlib');

const outputPath = process.argv[2];
if (!outputPath) throw new Error('Output path is required.');
const ownerEmail = String(process.env.CLEAN_OWNER_EMAIL || '').trim().toLowerCase();
const businessName = String(process.env.CLEAN_BUSINESS_NAME || 'Template Business').trim();
const businessId = String(process.env.CLEAN_BUSINESS_ID || 'BUSINESS').trim();
const installationId = String(process.env.CLEAN_INSTALLATION_ID || 'template-business-clean').trim();
if (!ownerEmail) throw new Error('CLEAN_OWNER_EMAIL is required.');
let phase = 'startup';
const partial = {};

function writeEvidence(value) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(value, null, 2) + '\n');
}

function verifyNeutralSchema() {
  const schemaPath = path.resolve(__dirname, '../business-packs/template-business/business-office.schema.json.gz.b64');
  const encoded = fs.readFileSync(schemaPath, 'utf8').trim();
  const schema = JSON.parse(zlib.gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
  if (!schema || !Array.isArray(schema.sheets) || schema.sheets.length !== 81) {
    throw new Error(`Neutral schema must contain 81 sheets; found ${schema && schema.sheets ? schema.sheets.length : 0}.`);
  }
  if (/Highway\s*38|\bH38\b|rkrueth-maker|highway-38-solutions|AKfyc/i.test(JSON.stringify(schema))) {
    throw new Error('Neutral schema contains Highway 38 identity or deployment data.');
  }
  return { sheetCount: schema.sheets.length };
}

function walk(value) {
  if (!value || typeof value !== 'object') return [];
  return [value, ...Object.values(value).flatMap(walk)];
}

function loadOAuth() {
  const raw = JSON.parse(fs.readFileSync(process.env.HOME + '/.clasprc.json', 'utf8'));
  const auth = walk(raw).find(item => item && typeof item === 'object' &&
    (item.refresh_token || item.refreshToken) && (item.client_id || item.clientId) && (item.client_secret || item.clientSecret));
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
  const body = querystring.stringify({ client_id: oauth.clientId, client_secret: oauth.clientSecret,
    refresh_token: oauth.refreshToken, grant_type: 'refresh_token' });
  const result = await request({ method: 'POST', hostname: 'oauth2.googleapis.com', path: '/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, body);
  if (!result.access_token) throw new Error('OAuth token response did not contain access_token.');
  return result.access_token;
}

async function google(token, method, hostname, requestPath, body) {
  return request({ method, hostname, path: requestPath, headers: { Authorization: `Bearer ${token}` } }, body);
}

async function createFolder(token, name, parentId) {
  const body = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) body.parents = [parentId];
  return google(token, 'POST', 'www.googleapis.com', '/drive/v3/files?fields=id,name,webViewLink,parents', body);
}

async function createScriptProject(token) {
  return google(token, 'POST', 'script.googleapis.com', '/v1/projects', {
    title: `${businessName} Business Office — ${installationId}`
  });
}

(async () => {
  phase = 'verify-neutral-schema';
  const schema = verifyNeutralSchema();
  phase = 'oauth';
  const token = await accessToken();
  phase = 'create-root-folder';
  const rootFolder = await createFolder(token, `${businessName} Business Office — ${installationId}`);
  partial.rootFolder = rootFolder;
  phase = 'create-document-folder';
  const documentFolder = await createFolder(token, 'Original Documents', rootFolder.id);
  partial.documentFolder = documentFolder;
  phase = 'create-pdf-folder';
  const pdfFolder = await createFolder(token, 'Generated PDFs', rootFolder.id);
  partial.pdfFolder = pdfFolder;
  phase = 'create-export-folder';
  const exportFolder = await createFolder(token, 'Exports', rootFolder.id);
  partial.exportFolder = exportFolder;
  phase = 'create-backup-folder';
  const backupFolder = await createFolder(token, 'Backups', rootFolder.id);
  partial.backupFolder = backupFolder;
  phase = 'create-apps-script-project';
  const scriptProject = await createScriptProject(token);
  if (!scriptProject.scriptId) throw new Error('Apps Script project creation did not return a scriptId.');
  partial.appsScriptProject = { id: scriptProject.scriptId };
  const result = {
    status: 'RESOURCES PROVISIONED — WORKBOOK AND ACCEPTANCE REQUIRED',
    installationId, businessId, businessName, ownerEmail,
    neutralSchema: { source: 'repository', verifiedSheetCount: schema.sheetCount },
    spreadsheet: null,
    rootFolder, documentFolder, pdfFolder, exportFolder, backupFolder,
    appsScriptProject: { id: scriptProject.scriptId },
    externalActionsEnabled: false, directPaymentProcessing: false,
    directPayrollFunding: false, directTaxFiling: false, sourceBusinessDataCopied: false
  };
  phase = 'complete';
  writeEvidence(result);
  console.log(JSON.stringify({ status: result.status, installationId, businessId, sheetCount: schema.sheetCount, scriptProjectCreated: true }, null, 2));
})().catch(error => {
  writeEvidence({ status: 'HOLD', phase, installationId, businessId, businessName,
    error: error && error.message ? error.message : String(error), partialResources: partial,
    externalActionsOccurred: false, paymentProcessed: false, payrollFundsMoved: false, taxReturnFiled: false });
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
