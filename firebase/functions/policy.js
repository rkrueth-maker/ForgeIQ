'use strict';

const ROLES = Object.freeze(['Owner', 'Administrator', 'Staff', 'Viewer']);

function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('A valid email address is required.');
  }
  return email;
}

function cleanRole(value) {
  const role = String(value || '');
  if (!ROLES.includes(role)) {
    throw new Error('Role must be Owner, Administrator, Staff, or Viewer.');
  }
  return role;
}

function cleanUid(value) {
  const uid = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{10,128}$/.test(uid)) throw new Error('Valid user ID required.');
  return uid;
}

function assertOwnerAccountChange({operation, actorUid, targetUid, targetRole, targetStatus, activeOwnerCount}) {
  const affectsActiveOwner = targetRole === 'Owner' && targetStatus === 'active';
  if ((operation === 'disable' || operation === 'remove') && targetUid === actorUid) {
    throw new Error(`You cannot ${operation} your own Owner account.`);
  }
  if (affectsActiveOwner && activeOwnerCount <= 1 && ['demote', 'disable', 'remove'].includes(operation)) {
    throw new Error(`The last active Owner cannot be ${operation === 'demote' ? 'demoted' : operation + 'd'}.`);
  }
}

module.exports = {ROLES, cleanEmail, cleanRole, cleanUid, assertOwnerAccountChange};
