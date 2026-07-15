#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'artifacts', 'business-office-separation');
const TARGETS = [
  'apps-script/business-office',
  'apps-script/business-office-sync',
  'apps-script/integrated-backend',
  'apps-script/core-engine/owner-portal-next',
  'portal.html',
  'ecosystem.js',
  'brand-global.js',
  'scripts',
  '.github/workflows'
];
const TEXT_EXTENSIONS = new Set(['.gs', '.js', '.html', '.json', '.md', '.yml', '.yaml', '.sh', '.ps1', '.txt', '.css']);

const rules = [
  { kind: 'business-identity', regex: /Highway\s*38|Highway 38 Solutions|\bH38\b/gi },
  { kind: 'owner-contact', regex: /rkrueth(?:-maker)?|rkrueth@gmail\.com/gi },
  { kind: 'website-route', regex: /highway-38-solutions|rkrueth-maker\.github\.io/gi },
  { kind: 'apps-script-deployment', regex: /https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+(?:\/exec)?/gi },
  { kind: 'spreadsheet-route', regex: /https:\/\/docs\.google\.com\/spreadsheets\/[A-Za-z0-9_?=\/.&#-]*/gi },
  { kind: 'drive-route', regex: /https:\/\/drive\.google\.com\/[A-Za-z0-9_?=\/.&#-]*/gi },
  { kind: 'approval-wording', regex: /owner approval|owner decision|Owner review|owner-approval|approval gate/gi },
  { kind: 'business-prefix', regex: /\bH38_[A-Z0-9_]+\b|\bH38_BO[A-Z0-9_]*\b/g },
  { kind: 'logo-branding', regex: /highway38-logo|Highway 38 Business Office|Highway 38 Owner Portal/gi }
];

function walk(target) {
  const absolute = path.join(ROOT, target);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [target];
  const files = [];
  for (const name of fs.readdirSync(absolute)) {
    const relative = path.join(target, name);
    const full = path.join(ROOT, relative);
    const item = fs.statSync(full);
    if (item.isDirectory()) files.push(...walk(relative));
    else if (TEXT_EXTENSIONS.has(path.extname(name).toLowerCase())) files.push(relative);
  }
  return files;
}

const files = [...new Set(TARGETS.flatMap(walk))].sort();
const findings = [];
const fileSummary = {};

for (const file of files) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of rules) {
      rule.regex.lastIndex = 0;
      const matches = [...line.matchAll(rule.regex)];
      for (const match of matches) {
        findings.push({
          kind: rule.kind,
          file: file.replace(/\\/g, '/'),
          line: index + 1,
          match: match[0],
          snippet: line.trim().slice(0, 500)
        });
      }
    }

    const idAssignment = line.match(/(?:SPREADSHEET|FOLDER|DEPLOYMENT|SCRIPT|DOCUMENT|ROOT|BACKUP|EXPORT|PDF|WORKBOOK|SHEET)[A-Z0-9_]*_ID\s*[:=]\s*['"]([A-Za-z0-9_-]{20,})['"]/i);
    if (idAssignment) {
      findings.push({ kind: 'hardcoded-resource-id', file: file.replace(/\\/g, '/'), line: index + 1, match: idAssignment[1], snippet: line.trim().slice(0, 500) });
    }
  });
}

for (const finding of findings) {
  fileSummary[finding.file] ||= {};
  fileSummary[finding.file][finding.kind] = (fileSummary[finding.file][finding.kind] || 0) + 1;
}

const businessOfficeFiles = files.filter(file => file.replace(/\\/g, '/').startsWith('apps-script/business-office/'));
const coreLeakage = findings.filter(item => item.file.startsWith('apps-script/business-office/'));
const highRiskKinds = new Set(['business-identity', 'owner-contact', 'website-route', 'apps-script-deployment', 'spreadsheet-route', 'drive-route', 'hardcoded-resource-id', 'logo-branding']);
const highRisk = coreLeakage.filter(item => highRiskKinds.has(item.kind));

const result = {
  status: highRisk.length ? 'SEPARATION_REQUIRED' : 'CORE_NEUTRAL',
  generatedAt: new Date().toISOString(),
  sourceCommit: process.env.GITHUB_SHA || '',
  branch: process.env.GITHUB_REF_NAME || '',
  scope: TARGETS,
  inspectedFiles: files.length,
  businessOfficeFiles: businessOfficeFiles.length,
  totalFindings: findings.length,
  coreFindings: coreLeakage.length,
  highRiskCoreFindings: highRisk.length,
  findings,
  fileSummary
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'inventory.json'), JSON.stringify(result, null, 2) + '\n');

const counts = Object.entries(findings.reduce((acc, item) => {
  acc[item.kind] = (acc[item.kind] || 0) + 1;
  return acc;
}, {})).sort((a, b) => b[1] - a[1]);

const markdown = [
  '# Business Office Separation Inventory',
  '',
  `- Status: **${result.status}**`,
  `- Source commit: \`${result.sourceCommit || 'local'}\``,
  `- Branch: \`${result.branch || 'local'}\``,
  `- Files inspected: ${result.inspectedFiles}`,
  `- Business Office files: ${result.businessOfficeFiles}`,
  `- Total findings: ${result.totalFindings}`,
  `- High-risk findings inside Business Office: ${result.highRiskCoreFindings}`,
  '',
  '## Findings by category',
  '',
  ...counts.map(([kind, count]) => `- ${kind}: ${count}`),
  '',
  '## High-risk Business Office findings',
  '',
  ...(highRisk.length ? highRisk.map(item => `- \`${item.file}:${item.line}\` **${item.kind}** — ${item.snippet.replace(/\|/g, '\\|')}`) : ['- None']),
  '',
  '## All affected files',
  '',
  ...Object.keys(fileSummary).sort().map(file => `- \`${file}\`: ${Object.entries(fileSummary[file]).map(([kind, count]) => `${kind}=${count}`).join(', ')}`),
  ''
].join('\n');
fs.writeFileSync(path.join(OUT, 'inventory.md'), markdown);

console.log(markdown);
console.log(`Inventory written to ${path.relative(ROOT, OUT)}`);
