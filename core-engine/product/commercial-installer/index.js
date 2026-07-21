#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const OPERATIONS = Object.freeze([
  'NEW_INSTALL',
  'VALIDATE_ONLY',
  'RESUME',
  'REPAIR',
  'UPGRADE',
  'ROLLBACK_VERIFY',
  'CONTROLLED_ACCEPTANCE'
]);

const INSTALLATION_STATES = Object.freeze([
  'DRAFT',
  'PREFLIGHT_PASSED',
  'PLANNED',
  'PROVISIONING',
  'CONFIGURING',
  'VERIFYING',
  'ACCEPTANCE_PENDING',
  'COMMITTED',
  'HOLD',
  'QUARANTINED',
  'ROLLBACK_PENDING',
  'ROLLED_BACK'
]);

const PHASES = Object.freeze([
  'preflight',
  'identity-and-ownership-validation',
  'business-pack-validation',
  'resource-planning',
  'resource-provisioning',
  'core-installation',
  'product-entitlement',
  'role-and-permission-configuration',
  'price-book-and-template-seeding',
  'portal-and-integration-configuration',
  'verification',
  'acceptance',
  'commit',
  'recovery-or-quarantine'
]);

const PHASE_STATUSES = Object.freeze(['NOT_STARTED', 'RUNNING', 'PASS', 'HOLD', 'SKIPPED', 'ROLLED_BACK']);
const RESOURCE_STATES = Object.freeze([
  'PLANNED',
  'PRE_EXISTING',
  'CREATED_UNCOMMITTED',
  'CONFIGURED',
  'VERIFIED',
  'COMMITTED',
  'QUARANTINED',
  'DELETED',
  'RESTORED'
]);
const PROVIDER_STATES = Object.freeze(['LOCKED', 'CONFIGURED_DISABLED', 'TESTED_DISABLED', 'OWNER_ENABLED']);
const CANONICAL_ROLES = Object.freeze(['Owner', 'Administrator', 'Staff', 'Viewer']);
const INTERNAL_ROLE_MIGRATIONS = Object.freeze({
  owner: { role: 'Owner', permissions: [] },
  administrator: { role: 'Administrator', permissions: [] },
  staff: { role: 'Staff', permissions: [] },
  viewer: { role: 'Viewer', permissions: [] },
  operator: { role: 'Staff', permissions: ['operations.execute.selected'] },
  reviewer: { role: 'Viewer', permissions: ['approvals.review'] },
  bookkeeper: { role: 'Staff', permissions: ['financial-preparation'] },
  payroll: { role: 'Staff', permissions: ['payroll-preparation'] },
  customer: { role: null, accessProfile: 'CustomerPortalUser', permissions: [] }
});

function assert(condition, message, code = 'VALIDATION_ERROR') {
  if (!condition) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function stableClone(value) {
  if (Array.isArray(value)) return value.map(stableClone);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableClone(value[key]);
      return result;
    }, {});
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableClone(value));
}

function sha256(value) {
  const source = typeof value === 'string' ? value : stableStringify(value);
  return crypto.createHash('sha256').update(source).digest('hex');
}

function randomId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizeOperation(operation) {
  const value = String(operation || '').trim().toUpperCase().replace(/-/g, '_');
  assert(OPERATIONS.includes(value), `Unsupported installer operation: ${operation}`, 'UNSUPPORTED_OPERATION');
  return value;
}

function normalizeEnvironment(environment) {
  const value = String(environment || 'sanitized-test').trim().toLowerCase();
  assert(['sanitized-test', 'customer-assisted', 'controlled-beta-acceptance'].includes(value), `Unsupported environment: ${environment}`);
  return value;
}

function validateBusinessPackV1(pack) {
  const errors = [];
  const requiredObjects = [
    'schema', 'core', 'business', 'branding', 'productEntitlement', 'modules', 'routes', 'roles', 'services',
    'priceBook', 'templates', 'numbering', 'storage', 'customerPortal', 'providers', 'approvals', 'backups',
    'installation', 'resources', 'migrationHistory', 'proof', 'errors'
  ];
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) return ['Business Pack must be an object.'];
  for (const key of requiredObjects) {
    if (!(key in pack)) errors.push(`Missing Business Pack section: ${key}.`);
  }
  if (pack.schema) {
    if (pack.schema.name !== 'Business Pack Manifest') errors.push('schema.name must be Business Pack Manifest.');
    if (pack.schema.version !== 1) errors.push('schema.version must be 1.');
  }
  if (!pack.business || !pack.business.id || !pack.business.name) errors.push('business.id and business.name are required.');
  if (!pack.core || !pack.core.version) errors.push('core.version is required.');
  if (!pack.productEntitlement || !pack.productEntitlement.packageId || !pack.productEntitlement.version) {
    errors.push('productEntitlement.packageId and version are required.');
  }
  if (!Array.isArray(pack.modules.enabled)) errors.push('modules.enabled must be an array.');
  if (!Array.isArray(pack.roles.definitions)) errors.push('roles.definitions must be an array.');
  if (Array.isArray(pack.roles && pack.roles.definitions)) {
    for (const role of pack.roles.definitions) {
      if (!CANONICAL_ROLES.includes(role.name)) errors.push(`Unsupported internal role: ${role.name}.`);
    }
  }
  if (pack.approvals && pack.approvals.ownerRequiredForExternalActions !== true) {
    errors.push('Owner approval must be required for external actions.');
  }
  if (pack.approvals && pack.approvals.externalActionsEnabled !== false) {
    errors.push('External actions must be disabled in a Business Pack.');
  }
  if (pack.customerPortal && pack.customerPortal.released !== false) {
    errors.push('Customer Portal must default to unreleased.');
  }
  if (pack.providers && typeof pack.providers === 'object') {
    for (const [providerId, provider] of Object.entries(pack.providers)) {
      if (!PROVIDER_STATES.includes(provider.state)) errors.push(`Provider ${providerId} has invalid state ${provider.state}.`);
      if (provider.state === 'OWNER_ENABLED' && provider.ownerApprovalReference == null) {
        errors.push(`Provider ${providerId} cannot be OWNER_ENABLED without ownerApprovalReference.`);
      }
    }
  }
  if (pack.installation && !INSTALLATION_STATES.includes(pack.installation.state)) {
    errors.push(`Invalid installation state: ${pack.installation.state}.`);
  }
  if (pack.resources && !Array.isArray(pack.resources.items)) errors.push('resources.items must be an array.');
  if (pack.migrationHistory && !Array.isArray(pack.migrationHistory.items)) errors.push('migrationHistory.items must be an array.');
  return errors;
}

function validateProductPackage(productPackage) {
  const errors = [];
  if (!productPackage || typeof productPackage !== 'object' || Array.isArray(productPackage)) return ['Product Package must be an object.'];
  if (!productPackage.schema || productPackage.schema.name !== 'Product Package Manifest' || productPackage.schema.version !== 1) {
    errors.push('Product Package schema must be Product Package Manifest v1.');
  }
  if (!productPackage.id || !productPackage.version || !productPackage.name) errors.push('Product Package id, version, and name are required.');
  for (const key of ['applicationAreas', 'capabilities', 'excludedCapabilities', 'routes', 'serverFunctions', 'storage', 'reports', 'permissions', 'acceptanceTests']) {
    if (!Array.isArray(productPackage[key])) errors.push(`${key} must be an array.`);
  }
  if (!productPackage.controls || productPackage.controls.externalActionsEnabled !== false) {
    errors.push('Product Package external actions must default to false.');
  }
  if (!productPackage.controls || productPackage.controls.ownerApprovalRequired !== true) {
    errors.push('Product Package ownerApprovalRequired must be true.');
  }
  return errors;
}

function validateInstallationManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return ['Installation Manifest must be an object.'];
  if (!manifest.schema || manifest.schema.name !== 'Installation Manifest' || manifest.schema.version !== 1) {
    errors.push('Installation Manifest schema must be Installation Manifest v1.');
  }
  if (!manifest.installationId || !manifest.attemptId) errors.push('installationId and attemptId are required.');
  if (!OPERATIONS.includes(manifest.operation)) errors.push(`Invalid operation: ${manifest.operation}.`);
  if (!INSTALLATION_STATES.includes(manifest.state)) errors.push(`Invalid installation state: ${manifest.state}.`);
  if (!Array.isArray(manifest.phaseHistory)) errors.push('phaseHistory must be an array.');
  if (!Array.isArray(manifest.resources)) errors.push('resources must be an array.');
  if (!Array.isArray(manifest.quarantine)) errors.push('quarantine must be an array.');
  if (!manifest.controls || manifest.controls.externalActionsEnabled !== false) errors.push('External actions must remain disabled.');
  if (!manifest.controls || manifest.controls.customerPortalReleased !== false) errors.push('Customer Portal must remain unreleased.');
  return errors;
}

function classifyBusinessPackSource(source) {
  if (source && source.schema && source.schema.name === 'Business Pack Manifest' && source.schema.version === 1) return 'BUSINESS_PACK_MANIFEST_V1';
  if (source && source.installationId && source.business && source.resources && source.website) return 'BUSINESS_OFFICE_CONFIG';
  if (source && source.packId && source.business && source.branding && source.modules) return 'LEGACY_BUSINESS_PACK';
  if (source && source.businessPack && source.tenant && source.engine) return 'EFFECTIVE_CONFIG';
  return 'UNKNOWN';
}

function normalizeLegacyRoles(sourceRoles) {
  const values = Array.isArray(sourceRoles)
    ? sourceRoles
    : sourceRoles && typeof sourceRoles === 'object'
      ? Object.keys(sourceRoles)
      : [];
  const definitions = [];
  const customerProfiles = [];
  const changes = [];
  for (const value of values) {
    const key = String(value).toLowerCase();
    const mapping = INTERNAL_ROLE_MIGRATIONS[key];
    if (!mapping) {
      changes.push({ source: value, status: 'UNMAPPED' });
      continue;
    }
    if (mapping.accessProfile) {
      customerProfiles.push({ name: mapping.accessProfile, sourceRole: value });
      changes.push({ source: value, targetAccessProfile: mapping.accessProfile, approvalRequired: true });
      continue;
    }
    if (!definitions.some(role => role.name === mapping.role)) {
      definitions.push({ name: mapping.role, permissions: [...mapping.permissions] });
    } else if (mapping.permissions.length) {
      const target = definitions.find(role => role.name === mapping.role);
      target.permissions = [...new Set([...target.permissions, ...mapping.permissions])];
    }
    changes.push({ source: value, targetRole: mapping.role, permissions: [...mapping.permissions], approvalRequired: key !== mapping.role.toLowerCase() });
  }
  for (const role of CANONICAL_ROLES) {
    if (!definitions.some(item => item.name === role)) definitions.push({ name: role, permissions: [] });
  }
  return { definitions, customerProfiles, changes };
}

function createBusinessPackV1FromLegacy(source, options = {}) {
  const sourceType = classifyBusinessPackSource(source);
  assert(sourceType !== 'UNKNOWN', 'Unsupported Business Pack source format.', 'UNSUPPORTED_SOURCE_SCHEMA');
  if (sourceType === 'BUSINESS_PACK_MANIFEST_V1') {
    return {
      classification: 'COMPATIBLE',
      sourceType,
      sourceHash: sha256(source),
      preview: [],
      manifest: JSON.parse(JSON.stringify(source)),
      approvalRequired: false
    };
  }

  const business = source.business || {};
  const branding = source.branding || {};
  const legacyModules = Array.isArray(source.modules)
    ? source.modules
    : source.modules && Array.isArray(source.modules.enabled)
      ? source.modules.enabled
      : source.modules && typeof source.modules === 'object'
        ? Object.keys(source.modules).filter(key => source.modules[key] === true)
        : [];
  const legacyRoles = source.roles || (source.workflow && source.workflow.roles) || [];
  const roleResult = normalizeLegacyRoles(legacyRoles);
  const packageId = options.packageId || (source.package && source.package.id) || 'business-system';
  const packageVersion = options.packageVersion || (source.package && source.package.version) || '1.0.0';
  const businessId = business.id || business.businessId || source.packId || source.installationId || 'UNASSIGNED';
  const businessName = business.name || business.legalName || source.name || 'Unnamed business';
  const website = source.website || source.urls || {};
  const storage = source.storage || source.resources || {};
  const contacts = source.contact ? [source.contact] : Array.isArray(business.contacts) ? business.contacts : [];
  const providerEntries = ['payments', 'sms', 'email', 'scheduling'].reduce((result, id) => {
    result[id] = { state: 'LOCKED', ownerApprovalReference: null, proofReference: null };
    return result;
  }, {});

  const manifest = {
    schema: { name: 'Business Pack Manifest', version: 1 },
    core: { id: 'business-office-core', version: options.coreVersion || '2.0.0' },
    business: {
      id: String(businessId),
      name: String(businessName),
      legalName: business.legalName || businessName,
      contacts,
      regional: source.regional || business.regional || {}
    },
    branding: {
      brandName: branding.brandName || branding.name || businessName,
      logo: branding.logo || branding.logoUrl || '',
      accentColor: branding.accentColor || '#17324d',
      surfaceColor: branding.surfaceColor || '#ffffff'
    },
    productEntitlement: { packageId, version: packageVersion, immutable: true },
    modules: { enabled: legacyModules.map(String), disabled: [] },
    routes: {
      publicWebsite: website.publicSite || website.publicWebsite || '',
      ownerPortal: website.ownerPortal || '',
      quoteBuilder: website.quoteBuilder || '',
      customerPortal: website.customerPortal || ''
    },
    roles: {
      definitions: roleResult.definitions,
      customerAccessProfiles: roleResult.customerProfiles,
      migrationPreview: roleResult.changes
    },
    services: {
      categories: source.serviceCategories || (source.catalog && source.catalog.categories) || []
    },
    priceBook: {
      mode: source.catalog && source.catalog.mode ? source.catalog.mode : 'EMPTY',
      source: source.catalog && source.catalog.source ? source.catalog.source : null,
      version: source.catalog && source.catalog.version ? source.catalog.version : null,
      ownerConfirmed: false,
      records: []
    },
    templates: {
      version: source.templates && source.templates.version ? source.templates.version : null,
      defaults: source.templates && source.templates.defaults ? source.templates.defaults : source.templates || {}
    },
    numbering: source.numbering || { sequences: [] },
    storage: {
      propertyKeys: storage.propertyKeys || {},
      folders: storage.folders || {},
      ownership: { customerOwned: true, ownerAccount: null, deployingAccount: null }
    },
    customerPortal: {
      configured: false,
      released: false,
      releaseApprovalReference: null,
      accessRules: []
    },
    providers: providerEntries,
    approvals: {
      ownerRequiredForExternalActions: true,
      externalActionsEnabled: false,
      ownerOnlyControls: [
        'product-entitlement-change', 'ownership-transfer', 'external-provider-activation',
        'customer-portal-release', 'production-publishing', 'destructive-cleanup', 'live-data-rollback'
      ]
    },
    backups: { enabled: true, strategy: 'PRE_WRITE_AND_ACCEPTANCE', retentionDays: 30 },
    installation: { installationId: source.installationId || null, state: 'DRAFT', environment: 'sanitized-test' },
    resources: { items: [] },
    migrationHistory: { items: [] },
    proof: { required: true, logReference: null },
    errors: { required: true, logReference: null }
  };

  const validationErrors = validateBusinessPackV1(manifest);
  assert(validationErrors.length === 0, `Generated Business Pack is invalid: ${validationErrors.join(' ')}`);
  const preview = [
    { section: 'schema', action: 'CREATE', target: 'Business Pack Manifest v1' },
    { section: 'productEntitlement', action: 'SEPARATE_FROM_BUSINESS_CONFIGURATION', target: `${packageId}@${packageVersion}` },
    { section: 'roles', action: 'MIGRATE_WITH_OWNER_APPROVAL', changes: roleResult.changes },
    { section: 'providers', action: 'LOCK_ALL' },
    { section: 'customerPortal', action: 'SET_UNRELEASED' }
  ];
  return {
    classification: 'MIGRATABLE',
    sourceType,
    sourceHash: sha256(source),
    preview,
    manifest,
    approvalRequired: true
  };
}

function createInstallationManifest(options) {
  const operation = normalizeOperation(options.operation || 'VALIDATE_ONLY');
  const environment = normalizeEnvironment(options.environment);
  const businessPackErrors = validateBusinessPackV1(options.businessPack);
  assert(businessPackErrors.length === 0, businessPackErrors.join(' '));
  const packageErrors = validateProductPackage(options.productPackage);
  assert(packageErrors.length === 0, packageErrors.join(' '));
  assert(options.ownerAccount, 'Customer owner account is required.');
  assert(options.deployingAccount, 'Deploying account is required.');
  const installationId = options.installationId || options.businessPack.installation.installationId || randomId('installation');
  const attemptId = options.attemptId || randomId('attempt');
  const now = options.now || new Date().toISOString();
  const inputHash = sha256({
    businessPack: options.businessPack,
    productPackage: options.productPackage,
    operation,
    environment,
    targetCoreVersion: options.targetCoreVersion || options.businessPack.core.version
  });
  const phases = PHASES.map(name => ({ name, status: 'NOT_STARTED', idempotencyKey: sha256(`${installationId}|${operation}|${name}|${inputHash}`), attempts: 0 }));
  const manifest = {
    schema: { name: 'Installation Manifest', version: 1 },
    installationId,
    attemptId,
    operation,
    environment,
    state: 'DRAFT',
    createdAt: now,
    updatedAt: now,
    businessPack: {
      businessId: options.businessPack.business.id,
      schemaVersion: options.businessPack.schema.version,
      sourceHash: sha256(options.businessPack)
    },
    productPackage: {
      id: options.productPackage.id,
      version: options.productPackage.version,
      sourceHash: sha256(options.productPackage)
    },
    sourceCoreVersion: options.sourceCoreVersion || options.businessPack.core.version,
    targetCoreVersion: options.targetCoreVersion || options.businessPack.core.version,
    inputHash,
    ownerAccount: options.ownerAccount,
    deployingAccount: options.deployingAccount,
    authorizedAdministrators: options.authorizedAdministrators || [],
    supportAccess: options.supportAccess || { enabled: false, expiresAt: null, removalProcedure: null },
    currentPhase: null,
    phases,
    phaseHistory: [],
    resources: [],
    snapshots: [],
    seedVersions: [],
    providerStates: Object.fromEntries(Object.keys(options.businessPack.providers).map(id => [id, 'LOCKED'])),
    temporaryEndpoints: [],
    migrationHistory: [],
    quarantine: [],
    proofReferences: [],
    errorReferences: [],
    previousDeployment: options.previousDeployment || null,
    targetDeployment: null,
    acceptance: { status: 'NOT_STARTED', acceptedBy: null, acceptedAt: null, endpointExpiresAt: null },
    commit: { status: 'NOT_COMMITTED', committedBy: null, committedAt: null },
    controls: {
      externalActionsEnabled: false,
      customerPortalReleased: false,
      automaticCustomerEmail: false,
      automaticCustomerSms: false,
      automaticPaymentActions: false,
      automaticWorkStart: false,
      ownerApprovalRequired: true
    }
  };
  const errors = validateInstallationManifest(manifest);
  assert(errors.length === 0, errors.join(' '));
  return manifest;
}

function phaseRecord(manifest, phaseName) {
  const phase = manifest.phases.find(item => item.name === phaseName);
  assert(phase, `Unknown installer phase: ${phaseName}.`, 'UNKNOWN_PHASE');
  return phase;
}

function completePhase(manifest, phaseName, status, detail = {}, now = new Date().toISOString()) {
  assert(PHASE_STATUSES.includes(status), `Invalid phase status: ${status}.`);
  const phase = phaseRecord(manifest, phaseName);
  const phaseIndex = PHASES.indexOf(phaseName);
  const earlierIncomplete = manifest.phases.slice(0, phaseIndex).find(item => !['PASS', 'SKIPPED'].includes(item.status));
  if (!['HOLD', 'ROLLED_BACK'].includes(status)) {
    assert(!earlierIncomplete, `Cannot complete ${phaseName}; earlier phase ${earlierIncomplete && earlierIncomplete.name} is incomplete.`, 'PHASE_ORDER_ERROR');
  }
  phase.status = status;
  phase.attempts += 1;
  phase.startedAt = phase.startedAt || now;
  phase.completedAt = ['PASS', 'HOLD', 'SKIPPED', 'ROLLED_BACK'].includes(status) ? now : null;
  manifest.currentPhase = phaseName;
  manifest.updatedAt = now;
  manifest.phaseHistory.push({ phase: phaseName, status, at: now, attemptId: manifest.attemptId, detail });
  const stateByPhase = {
    preflight: 'PREFLIGHT_PASSED',
    'resource-planning': 'PLANNED',
    'resource-provisioning': 'PROVISIONING',
    'core-installation': 'CONFIGURING',
    verification: 'VERIFYING',
    acceptance: 'ACCEPTANCE_PENDING',
    commit: 'COMMITTED',
    'recovery-or-quarantine': detail.quarantined ? 'QUARANTINED' : detail.rolledBack ? 'ROLLED_BACK' : manifest.state
  };
  if (status === 'HOLD') manifest.state = 'HOLD';
  else if (stateByPhase[phaseName]) manifest.state = stateByPhase[phaseName];
  if (phaseName === 'commit' && status === 'PASS') {
    manifest.commit = { status: 'COMMITTED', committedBy: detail.committedBy || manifest.ownerAccount, committedAt: now };
    for (const resource of manifest.resources) {
      if (['CONFIGURED', 'VERIFIED', 'CREATED_UNCOMMITTED'].includes(resource.state)) resource.state = 'COMMITTED';
    }
  }
  return manifest;
}

function getResumePhase(manifest) {
  const phase = manifest.phases.find(item => !['PASS', 'SKIPPED'].includes(item.status));
  return phase ? phase.name : null;
}

function recordResource(manifest, resource) {
  assert(resource && resource.resourceType, 'resourceType is required.');
  assert(resource.resourceName, 'resourceName is required.');
  assert(RESOURCE_STATES.includes(resource.state), `Invalid resource state: ${resource.state}.`);
  const identity = resource.resourceId || resource.idempotencyKey;
  assert(identity, 'resourceId or idempotencyKey is required.');
  const existing = manifest.resources.find(item => (resource.resourceId && item.resourceId === resource.resourceId) || (resource.idempotencyKey && item.idempotencyKey === resource.idempotencyKey));
  if (existing) {
    Object.assign(existing, resource, { updatedAt: new Date().toISOString() });
    return existing;
  }
  const entry = {
    resourceType: resource.resourceType,
    resourceId: resource.resourceId || null,
    resourceName: resource.resourceName,
    ownerAccount: resource.ownerAccount || manifest.ownerAccount,
    deployingAccount: resource.deployingAccount || manifest.deployingAccount,
    createdByAttempt: resource.createdByAttempt || manifest.attemptId,
    createdAt: resource.createdAt || new Date().toISOString(),
    preExisting: resource.preExisting === true,
    committed: resource.committed === true,
    sharedWith: resource.sharedWith || [],
    referencedBy: resource.referencedBy || [],
    containsData: resource.containsData === true,
    idempotencyKey: resource.idempotencyKey || sha256(`${manifest.installationId}|resource|${resource.resourceType}|${resource.resourceName}`),
    state: resource.state,
    safeDeleteEligible: false,
    quarantineUntil: null,
    proofReference: resource.proofReference || null
  };
  entry.safeDeleteEligible = canAutoRemoveResource(entry, manifest.attemptId);
  manifest.resources.push(entry);
  return entry;
}

function canAutoRemoveResource(resource, currentAttemptId) {
  return resource.createdByAttempt === currentAttemptId
    && resource.preExisting === false
    && resource.committed === false
    && resource.containsData === false
    && Array.isArray(resource.sharedWith) && resource.sharedWith.length === 0
    && Array.isArray(resource.referencedBy) && resource.referencedBy.length === 0
    && resource.state === 'CREATED_UNCOMMITTED';
}

function quarantineResource(manifest, resourceId, reason, now = new Date()) {
  const resource = manifest.resources.find(item => item.resourceId === resourceId || item.idempotencyKey === resourceId);
  assert(resource, `Resource not found for quarantine: ${resourceId}.`);
  const quarantineUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  resource.state = 'QUARANTINED';
  resource.safeDeleteEligible = false;
  resource.quarantineUntil = quarantineUntil;
  const entry = {
    resourceId: resource.resourceId,
    resourceType: resource.resourceType,
    resourceName: resource.resourceName,
    installationAttempt: manifest.attemptId,
    quarantinedAt: now.toISOString(),
    quarantineUntil,
    containsData: resource.containsData,
    sharedWith: resource.sharedWith,
    referencedBy: resource.referencedBy,
    reason,
    ownerDeletionRequired: true,
    recommendedAction: 'OWNER_REVIEW'
  };
  manifest.quarantine.push(entry);
  manifest.state = 'QUARANTINED';
  return entry;
}

function createSanitizedResourceAdapter(seed = 'commercial-installer-v1') {
  const resources = new Map();
  return {
    mode: 'SANITIZED_TEST',
    discoverOrCreate(plan, context) {
      const key = plan.idempotencyKey;
      if (resources.has(key)) return { ...resources.get(key), discovered: true };
      const resource = {
        resourceType: plan.resourceType,
        resourceId: `test-${sha256(`${seed}|${key}`).slice(0, 20)}`,
        resourceName: plan.resourceName,
        idempotencyKey: key,
        state: 'CREATED_UNCOMMITTED',
        preExisting: false,
        committed: false,
        containsData: false,
        sharedWith: [],
        referencedBy: [],
        ownerAccount: context.ownerAccount,
        deployingAccount: context.deployingAccount,
        createdByAttempt: context.attemptId
      };
      resources.set(key, resource);
      return { ...resource, discovered: false };
    },
    list() {
      return [...resources.values()].map(item => ({ ...item }));
    }
  };
}

function buildDefaultResourcePlan(manifest) {
  const prefix = manifest.businessPack.businessId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return [
    ['DRIVE_ROOT_FOLDER', `${prefix}-business-office`],
    ['DRIVE_UPLOADS_FOLDER', `${prefix}-uploads`],
    ['DRIVE_BACKUPS_FOLDER', `${prefix}-backups`],
    ['SPREADSHEET', `${prefix}-business-office-data`],
    ['APPS_SCRIPT_PROJECT', `${prefix}-business-office-app`],
    ['WEB_APP_DEPLOYMENT', `${prefix}-business-office-web`]
  ].map(([resourceType, resourceName]) => ({
    resourceType,
    resourceName,
    idempotencyKey: sha256(`${manifest.installationId}|resource|${resourceType}|${resourceName}`)
  }));
}

function runSanitizedInstallation({ manifest, businessPack, productPackage, adapter = createSanitizedResourceAdapter(), ownerApprovalReference = null }) {
  assert(manifest.environment === 'sanitized-test', 'Sanitized runner may only operate in sanitized-test.');
  assert(manifest.controls.externalActionsEnabled === false, 'External actions must remain disabled.');
  const packErrors = validateBusinessPackV1(businessPack);
  const packageErrors = validateProductPackage(productPackage);
  completePhase(manifest, 'preflight', packErrors.length || packageErrors.length ? 'HOLD' : 'PASS', { packErrors, packageErrors });
  if (manifest.state === 'HOLD') return manifest;
  completePhase(manifest, 'identity-and-ownership-validation', 'PASS', { customerOwned: true, ownerAccount: manifest.ownerAccount });
  completePhase(manifest, 'business-pack-validation', 'PASS', { sourceHash: manifest.businessPack.sourceHash });
  const plan = buildDefaultResourcePlan(manifest);
  completePhase(manifest, 'resource-planning', 'PASS', { resourceCount: plan.length, plan });
  for (const item of plan) recordResource(manifest, adapter.discoverOrCreate(item, manifest));
  completePhase(manifest, 'resource-provisioning', 'PASS', { resourceCount: manifest.resources.length, adapter: adapter.mode });
  completePhase(manifest, 'core-installation', 'PASS', { coreVersion: manifest.targetCoreVersion });
  completePhase(manifest, 'product-entitlement', 'PASS', { packageId: productPackage.id, enforcement: ['interface', 'route', 'server', 'permission', 'storage', 'report'] });
  completePhase(manifest, 'role-and-permission-configuration', 'PASS', { roles: CANONICAL_ROLES });
  completePhase(manifest, 'price-book-and-template-seeding', 'PASS', {
    priceBookMode: businessPack.priceBook.mode,
    ownerConfirmed: businessPack.priceBook.mode === 'EMPTY' ? true : businessPack.priceBook.ownerConfirmed
  });
  completePhase(manifest, 'portal-and-integration-configuration', 'PASS', { customerPortalReleased: false, providers: manifest.providerStates });
  for (const resource of manifest.resources) resource.state = 'VERIFIED';
  completePhase(manifest, 'verification', 'PASS', {
    tenantIsolation: true,
    duplicateProtection: true,
    externalActionsEnabled: false,
    customerPortalReleased: false
  });
  completePhase(manifest, 'acceptance', 'PASS', {
    mode: 'SANITIZED_TEST',
    acceptedBy: ownerApprovalReference || manifest.ownerAccount,
    nonProduction: true
  });
  manifest.acceptance = {
    status: 'ACCEPTED',
    acceptedBy: ownerApprovalReference || manifest.ownerAccount,
    acceptedAt: new Date().toISOString(),
    endpointExpiresAt: null
  };
  completePhase(manifest, 'commit', 'PASS', { committedBy: ownerApprovalReference || manifest.ownerAccount });
  completePhase(manifest, 'recovery-or-quarantine', 'SKIPPED', { reason: 'No recovery required.' });
  return manifest;
}

function validateUpgrade(sourceManifest, targetProductPackage) {
  const errors = validateInstallationManifest(sourceManifest);
  if (errors.length) return { status: 'HOLD', errors };
  if (sourceManifest.productPackage.id !== 'quote-builder') return { status: 'HOLD', errors: ['Only Quote Builder installations may use the Quote Builder-to-Business-System upgrade contract.'] };
  if (targetProductPackage.id !== 'business-system') return { status: 'HOLD', errors: ['Upgrade target must be business-system.'] };
  const preserved = [
    'installationId', 'ownerAccount', 'deployingAccount', 'resources', 'snapshots', 'seedVersions',
    'providerStates', 'proofReferences', 'errorReferences', 'previousDeployment'
  ];
  return {
    status: 'PASS',
    preserved,
    targetPackage: { id: targetProductPackage.id, version: targetProductPackage.version },
    requiresOwnerApproval: true,
    existingProjectPreserved: true,
    deploymentIdentityPreservedWhenPossible: true,
    recordReentryRequired: false
  };
}

module.exports = {
  OPERATIONS,
  INSTALLATION_STATES,
  PHASES,
  PHASE_STATUSES,
  RESOURCE_STATES,
  PROVIDER_STATES,
  CANONICAL_ROLES,
  readJson,
  writeJson,
  stableStringify,
  sha256,
  normalizeOperation,
  normalizeEnvironment,
  validateBusinessPackV1,
  validateProductPackage,
  validateInstallationManifest,
  classifyBusinessPackSource,
  normalizeLegacyRoles,
  createBusinessPackV1FromLegacy,
  createInstallationManifest,
  completePhase,
  getResumePhase,
  recordResource,
  canAutoRemoveResource,
  quarantineResource,
  createSanitizedResourceAdapter,
  buildDefaultResourcePlan,
  runSanitizedInstallation,
  validateUpgrade
};
