'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {ROLES, cleanEmail, cleanRole, cleanUid, assertOwnerAccountChange} = require('../policy');

test('declares the four controlled roles', () => {
  assert.deepEqual(ROLES, ['Owner', 'Administrator', 'Staff', 'Viewer']);
});

test('normalizes invited email addresses', () => {
  assert.equal(cleanEmail('  OWNER@Example.COM '), 'owner@example.com');
});

test('rejects invalid email addresses', () => {
  assert.throws(() => cleanEmail('not-an-email'), /valid email/i);
});

test('accepts only controlled roles', () => {
  for (const role of ROLES) assert.equal(cleanRole(role), role);
  assert.throws(() => cleanRole('SuperAdmin'), /Role must be/);
});

test('validates Firebase user IDs', () => {
  assert.equal(cleanUid('abcDEF_12345'), 'abcDEF_12345');
  assert.throws(() => cleanUid('../owner'), /Valid user ID/);
});

test('blocks self-disable and self-remove', () => {
  for (const operation of ['disable', 'remove']) {
    assert.throws(() => assertOwnerAccountChange({
      operation, actorUid:'owner123456', targetUid:'owner123456',
      targetRole:'Owner', targetStatus:'active', activeOwnerCount:2
    }), /your own Owner account/);
  }
});

test('protects the last active Owner', () => {
  for (const operation of ['demote', 'disable', 'remove']) {
    assert.throws(() => assertOwnerAccountChange({
      operation, actorUid:'owner123456', targetUid:'owner654321',
      targetRole:'Owner', targetStatus:'active', activeOwnerCount:1
    }), /last active Owner/);
  }
});

test('allows changes that preserve another active Owner', () => {
  assert.doesNotThrow(() => assertOwnerAccountChange({
    operation:'disable', actorUid:'owner123456', targetUid:'owner654321',
    targetRole:'Owner', targetStatus:'active', activeOwnerCount:2
  }));
  assert.doesNotThrow(() => assertOwnerAccountChange({
    operation:'remove', actorUid:'owner123456', targetUid:'staff123456',
    targetRole:'Staff', targetStatus:'active', activeOwnerCount:1
  }));
});
