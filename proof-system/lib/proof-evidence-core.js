'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function hashFile(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function hashText(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function assertPrivateWorkPath(value) {
  const resolved = path.resolve(value);
  const normalized = resolved.replace(/\\/g, '/').toLowerCase();
  if (!normalized.includes('/private') && !normalized.includes('/proof-work') && !normalized.includes('/evidence-work')) {
    throw new Error('Working directory must be explicitly private and include private, proof-work, or evidence-work in its path.');
  }
  return resolved;
}

async function preservePstSource({ sourceFile, workDir, expectedFileName = 'backup.pst' }) {
  const source = path.resolve(sourceFile);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw new Error('PST source file does not exist.');
  if (path.basename(source).toLowerCase() !== expectedFileName.toLowerCase()) throw new Error(`Expected source filename ${expectedFileName}.`);
  const targetRoot = assertPrivateWorkPath(workDir);
  fs.mkdirSync(targetRoot, { recursive: true, mode: 0o700 });
  const sourceStatBefore = fs.statSync(source);
  const sourceHashBefore = await hashFile(source);
  const workingCopy = path.join(targetRoot, `working-${sourceHashBefore.slice(0, 12)}.pst`);
  fs.copyFileSync(source, workingCopy, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(workingCopy, 0o400);
  const workingHash = await hashFile(workingCopy);
  const sourceHashAfter = await hashFile(source);
  const sourceStatAfter = fs.statSync(source);
  if (sourceHashBefore !== workingHash || sourceHashBefore !== sourceHashAfter) throw new Error('PST integrity verification failed.');
  if (sourceStatBefore.size !== sourceStatAfter.size || sourceStatBefore.mtimeMs !== sourceStatAfter.mtimeMs) throw new Error('Original PST metadata changed during preservation.');
  const manifest = {
    status: 'PRESERVED_WORKING_COPY_READY',
    sourceFileName: path.basename(source),
    sourceSizeBytes: sourceStatBefore.size,
    sourceSha256: sourceHashBefore,
    sourceModifiedTime: sourceStatBefore.mtime.toISOString(),
    workingCopy,
    workingCopySha256: workingHash,
    originalModified: false,
    createdAt: new Date().toISOString()
  };
  writeJson(path.join(targetRoot, 'pst-preservation-manifest.json'), manifest);
  return manifest;
}

function walkFiles(root, output = []) {
  if (!fs.existsSync(root)) return output;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walkFiles(full, output);
    else if (entry.isFile()) output.push(full);
  }
  return output;
}

function parseMailHeaders(text) {
  const headerText = String(text || '').split(/\r?\n\r?\n/, 1)[0];
  const unfolded = headerText.replace(/\r?\n[ \t]+/g, ' ');
  const headers = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (!headers[key]) headers[key] = value;
  }
  return headers;
}

function domainClass(addressValue) {
  const match = String(addressValue || '').match(/@([A-Za-z0-9.-]+)/);
  if (!match) return 'UNKNOWN';
  const domain = match[1].toLowerCase();
  if (['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'].includes(domain)) return 'PERSONAL_PROVIDER';
  return `PRIVATE_DOMAIN_${hashText(domain).slice(0, 12)}`;
}

function normalizeSearchPlan(searchPlan) {
  const terms = [];
  for (const group of searchPlan.groups || []) {
    for (const term of group.terms || []) terms.push({ groupId: group.id, term: String(term), lower: String(term).toLowerCase() });
  }
  return terms;
}

function scanTextForGroups(text, searchPlan) {
  const lower = String(text || '').toLowerCase();
  const matches = new Map();
  for (const item of normalizeSearchPlan(searchPlan)) {
    if (!lower.includes(item.lower)) continue;
    const set = matches.get(item.groupId) || new Set();
    set.add(item.term);
    matches.set(item.groupId, set);
  }
  return [...matches.entries()].map(([groupId, values]) => ({ groupId, matchedTerms: [...values].sort() }));
}

function indexExtractedEvidence({ extractedDir, searchPlan, sourceHash }) {
  const root = assertPrivateWorkPath(extractedDir);
  if (!fs.existsSync(root)) throw new Error('Extracted evidence directory does not exist.');
  const files = walkFiles(root);
  const messages = [];
  const attachments = [];
  for (const file of files) {
    const relative = path.relative(root, file).replace(/\\/g, '/');
    const extension = path.extname(file).toLowerCase();
    const stat = fs.statSync(file);
    if (['.eml', '.txt', '.mbox'].includes(extension)) {
      const content = fs.readFileSync(file, 'utf8').slice(0, 2_000_000);
      const headers = parseMailHeaders(content);
      const groups = scanTextForGroups(`${headers.subject || ''}\n${content}`, searchPlan);
      if (!groups.length) continue;
      messages.push({
        evidenceId: `MSG-${hashText(`${sourceHash}|${relative}`).slice(0, 20)}`,
        sourceHash,
        folder: path.dirname(relative),
        messageDate: headers.date ? new Date(headers.date).toISOString() : null,
        subjectDigest: hashText(headers.subject || '').slice(0, 24),
        senderDomainClass: domainClass(headers.from),
        matchedGroups: groups,
        sourceRelativeDigest: hashText(relative).slice(0, 24),
        sizeBytes: stat.size,
        contextSummaryPrivate: '',
        corroborationStatus: 'UNREVIEWED',
        privacyStatus: 'PRIVATE_SOURCE',
        publicCaseStudyId: null
      });
    } else {
      const groups = scanTextForGroups(path.basename(file), searchPlan);
      if (!groups.length) continue;
      attachments.push({
        evidenceId: `ATT-${hashText(`${sourceHash}|${relative}`).slice(0, 20)}`,
        sourceHash,
        folderDigest: hashText(path.dirname(relative)).slice(0, 24),
        attachmentNameDigest: hashText(path.basename(file)).slice(0, 24),
        attachmentExtension: extension || 'none',
        matchedGroups: groups,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        corroborationStatus: 'UNREVIEWED',
        privacyStatus: 'PRIVATE_SOURCE',
        publicCaseStudyId: null
      });
    }
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceHash,
    extractedRootDigest: hashText(root).slice(0, 24),
    counts: { filesScanned: files.length, messagesMatched: messages.length, attachmentsMatched: attachments.length },
    messages,
    attachments,
    rawContentIncluded: false
  };
}

function reviewPhotoRecord(record, taxonomy) {
  const risks = new Set(record.risks || []);
  const allowedStages = new Set(taxonomy.photoStages || []);
  if (!allowedStages.has(record.stage)) throw new Error(`Photo stage is invalid for ${record.id}.`);
  const hardHold = ['family', 'customer', 'employee', 'medical-record', 'credentials', 'proprietary-drawing', 'pricing'];
  const redactable = ['person', 'address', 'vendor', 'vehicle-identifier', 'location-metadata', 'part-number'];
  let decision = 'PUBLIC_SAFE';
  if ([...risks].some(risk => hardHold.includes(risk))) decision = 'HOLD';
  else if ([...risks].some(risk => redactable.includes(risk))) decision = 'REDACT_AND_REVIEW';
  if (record.ownerApproved !== true && decision === 'PUBLIC_SAFE') decision = 'HOLD';
  return {
    id: record.id,
    sourceDigest: record.sourceDigest,
    stage: record.stage,
    projectClass: record.projectClass || 'unknown',
    risks: [...risks].sort(),
    peopleVisible: Boolean(record.peopleVisible),
    locationMetadataRemoved: Boolean(record.locationMetadataRemoved),
    ownerApproved: Boolean(record.ownerApproved),
    decision,
    publicAssetPath: decision === 'PUBLIC_SAFE' ? record.publicAssetPath || null : null,
    notes: record.notes || ''
  };
}

function compilePublicCaseStudies(registry, taxonomy) {
  const allowed = new Set(taxonomy.allowedProofClassifications || []);
  const required = taxonomy.minimumPublicRecord || [];
  const output = [];
  for (const item of registry.cases || []) {
    if (item.publicationStatus !== 'PUBLIC_SAFE') continue;
    if (!allowed.has(item.classification)) throw new Error(`Invalid classification for ${item.id}.`);
    if (item.privacyStatus !== 'PUBLIC_SAFE' && item.classification !== 'anonymized reconstruction') throw new Error(`Non-public privacy status for ${item.id}.`);
    if (item.classification === 'verified historical' && Number(item.sourceCount || 0) < 1) throw new Error(`Verified historical item ${item.id} lacks corroboration.`);
    const publicItem = {
      id: item.id,
      title: item.publicTitle,
      classification: item.classification,
      domain: item.domain,
      summary: item.publicSummary,
      evidenceStatus: item.evidenceStatus,
      privacyStatus: 'PUBLIC_SAFE',
      sourceCount: Number(item.sourceCount || 0),
      relatedProducts: item.relatedProducts || [],
      boundary: item.boundary,
      unresolvedQuestions: item.unresolvedQuestions || []
    };
    for (const field of required) if (publicItem[field] === undefined || publicItem[field] === null || publicItem[field] === '') throw new Error(`Public case ${item.id} missing ${field}.`);
    const serialized = JSON.stringify(publicItem);
    if (/\bClow\b|\bCSC\b|@|\\|private-work|backup\.pst/i.test(serialized)) throw new Error(`Private-source indicator found in public case ${item.id}.`);
    output.push(publicItem);
  }
  return {
    schemaVersion: 1,
    release: registry.release,
    generatedAt: new Date().toISOString(),
    publicationPolicy: 'Only explicitly PUBLIC_SAFE summaries are included. Raw messages, attachments, addresses, people, customers, vendors, employees, employers, programs, drawings, pricing, and production data are excluded.',
    items: output
  };
}

function validateToolManifest(manifest) {
  const errors = [];
  if (!manifest || manifest.schemaVersion !== 1) errors.push('Tool manifest schemaVersion must be 1.');
  if (!Array.isArray(manifest.tools) || manifest.tools.length !== 8) errors.push('Exactly eight public tools are required.');
  if (!Array.isArray(manifest.downloads) || manifest.downloads.length < 2) errors.push('At least two downloads are required.');
  const ids = [...(manifest.tools || []), ...(manifest.downloads || [])].map(item => item.id);
  if (new Set(ids).size !== ids.length) errors.push('Tool and download IDs must be unique.');
  for (const tool of manifest.tools || []) {
    for (const field of ['id', 'name', 'version', 'formulaId', 'assumptions', 'disclaimer', 'analyticsEvent', 'relatedProduct']) if (!tool[field] || (Array.isArray(tool[field]) && !tool[field].length)) errors.push(`${tool.id || 'tool'} missing ${field}.`);
  }
  for (const download of manifest.downloads || []) {
    for (const field of ['id', 'name', 'version', 'file', 'readme', 'disclaimer', 'relatedProduct']) if (!download[field]) errors.push(`${download.id || 'download'} missing ${field}.`);
  }
  const serialized = JSON.stringify(manifest);
  if (/\bClow\b|\bCSC\b|customer name|vendor name|part number/i.test(serialized)) errors.push('Tool manifest contains prohibited private-source terminology.');
  return errors;
}

module.exports = {
  readJson,
  writeJson,
  hashFile,
  hashText,
  preservePstSource,
  parseMailHeaders,
  scanTextForGroups,
  indexExtractedEvidence,
  reviewPhotoRecord,
  compilePublicCaseStudies,
  validateToolManifest,
  walkFiles
};
