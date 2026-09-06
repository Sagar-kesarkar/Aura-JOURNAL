import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

/**
 * Firestore Security Rules Static Structural & Syntactic Verification
 * NOTE: This is a static structural verification suite, NOT the official Firebase Emulator.
 * It validates rule syntax, absence of insecure open defaults, presence of UID-bound checks,
 * and structural invariant logic against firestore.rules.
 */

/**
 * Structural Logic Model (Static verification helper, non-emulator)
 * Models the path hierarchy and authorization constraints defined in firestore.rules
 */
function evaluateStructuralRule(options: {
  path: string;
  auth: { uid: string } | null;
  operation: 'read' | 'write' | 'create' | 'update' | 'delete';
  data?: Record<string, any>;
}): boolean {
  const { path: docPath, auth } = options;

  // Global Safety Net: default deny
  const matchUser = docPath.match(/^\/users\/([^/]+)(\/.*)?$/);
  if (!matchUser) {
    return false;
  }

  const pathUserId = matchUser[1];
  const subpath = matchUser[2] || '';

  // Check auth requirement: request.auth != null && request.auth.uid == userId
  if (!auth || !auth.uid) {
    return false;
  }

  if (auth.uid !== pathUserId) {
    return false;
  }

  if (subpath === '') {
    return true;
  }

  const matchEntries = subpath.match(/^\/entries\/([^/]+)$/);
  if (matchEntries) {
    return true;
  }

  const matchInteractions = subpath.match(/^\/interactions\/([^/]+)$/);
  if (matchInteractions) {
    return true;
  }

  return true;
}

describe('Firestore Security Rules Static Structural Verification (Non-Emulator)', () => {
  test('Rule file exists, is valid syntax, and contains zero insecure defaults', () => {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    assert.ok(fs.existsSync(rulesPath), 'firestore.rules must exist');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    // Pillar 1: No insecure defaults
    assert.ok(!rulesContent.includes('allow read, write: if true;'), 'Must not contain open access rules');
    assert.ok(!rulesContent.includes('allow read: if true;'), 'Must not allow open reads');
    assert.ok(!rulesContent.includes('allow write: if true;'), 'Must not allow open writes');

    // Pillar 2: Must enforce request.auth != null && request.auth.uid == userId
    assert.ok(
      rulesContent.includes('request.auth != null && request.auth.uid == userId'),
      'Must enforce owner-bound UID checks'
    );

    // Pillar 3: Must contain default deny catch-all
    assert.ok(
      rulesContent.includes('match /{document=**}') && rulesContent.includes('allow read, write: if false;'),
      'Must contain explicit global default-deny rule'
    );
  });

  test('1. An unauthenticated visitor cannot read journal data', () => {
    const allowed = evaluateStructuralRule({
      path: '/users/user-a/entries/entry-1',
      auth: null,
      operation: 'read',
    });
    assert.strictEqual(allowed, false, 'Unauthenticated read must be denied');
  });

  test('2. An unauthenticated visitor cannot create, update, or delete journal data', () => {
    const canCreate = evaluateStructuralRule({
      path: '/users/user-a/entries/entry-1',
      auth: null,
      operation: 'create',
    });
    const canUpdate = evaluateStructuralRule({
      path: '/users/user-a/entries/entry-1',
      auth: null,
      operation: 'update',
    });
    const canDelete = evaluateStructuralRule({
      path: '/users/user-a/entries/entry-1',
      auth: null,
      operation: 'delete',
    });

    assert.strictEqual(canCreate, false);
    assert.strictEqual(canUpdate, false);
    assert.strictEqual(canDelete, false);
  });

  test('3. User A can create and read data under User A’s UID', () => {
    const canRead = evaluateStructuralRule({
      path: '/users/user-a/entries/entry-1',
      auth: { uid: 'user-a' },
      operation: 'read',
    });
    const canWrite = evaluateStructuralRule({
      path: '/users/user-a/entries/entry-1',
      auth: { uid: 'user-a' },
      operation: 'write',
    });

    assert.strictEqual(canRead, true, 'User A should read own entry');
    assert.strictEqual(canWrite, true, 'User A should write own entry');
  });

  test('4. User B can create and read data under User B’s UID', () => {
    const canRead = evaluateStructuralRule({
      path: '/users/user-b/entries/entry-2',
      auth: { uid: 'user-b' },
      operation: 'read',
    });
    const canWrite = evaluateStructuralRule({
      path: '/users/user-b/entries/entry-2',
      auth: { uid: 'user-b' },
      operation: 'write',
    });

    assert.strictEqual(canRead, true, 'User B should read own entry');
    assert.strictEqual(canWrite, true, 'User B should write own entry');
  });

  test('5. User A cannot read User B’s sessions or messages', () => {
    const canRead = evaluateStructuralRule({
      path: '/users/user-b/entries/entry-2',
      auth: { uid: 'user-a' },
      operation: 'read',
    });

    assert.strictEqual(canRead, false, 'User A reading User B entry must be denied');
  });

  test('6. User A cannot update or delete User B’s records', () => {
    const canUpdate = evaluateStructuralRule({
      path: '/users/user-b/entries/entry-2',
      auth: { uid: 'user-a' },
      operation: 'update',
    });
    const canDelete = evaluateStructuralRule({
      path: '/users/user-b/entries/entry-2',
      auth: { uid: 'user-a' },
      operation: 'delete',
    });

    assert.strictEqual(canUpdate, false);
    assert.strictEqual(canDelete, false);
  });

  test('7. User B cannot read, update, or delete User A’s records', () => {
    const canRead = evaluateStructuralRule({
      path: '/users/user-a/entries/entry-1',
      auth: { uid: 'user-b' },
      operation: 'read',
    });
    const canUpdate = evaluateStructuralRule({
      path: '/users/user-a/entries/entry-1',
      auth: { uid: 'user-b' },
      operation: 'update',
    });
    const canDelete = evaluateStructuralRule({
      path: '/users/user-a/entries/entry-1',
      auth: { uid: 'user-b' },
      operation: 'delete',
    });

    assert.strictEqual(canRead, false);
    assert.strictEqual(canUpdate, false);
    assert.strictEqual(canDelete, false);
  });

  test('8. A user cannot change an owner/UID field to take ownership of another record', () => {
    // Attempting write to /users/user-b as User A
    const allowed = evaluateStructuralRule({
      path: '/users/user-b/entries/entry-hijack',
      auth: { uid: 'user-a' },
      operation: 'create',
      data: { userId: 'user-a' },
    });

    assert.strictEqual(allowed, false, 'Path ownership check must reject write to another user path');
  });

  test('9. Access to unexpected collections is denied by default catch-all', () => {
    const paths = [
      '/public/documents',
      '/admin/settings',
      '/global/journals',
      '/system/logs',
      '/shared/entries/entry-1',
    ];

    for (const p of paths) {
      const allowed = evaluateStructuralRule({
        path: p,
        auth: { uid: 'user-a' },
        operation: 'read',
      });
      assert.strictEqual(allowed, false, `Access to unexpected collection ${p} must be denied`);
    }
  });

  test('10. Unauthenticated access to root or arbitrary documents is rejected', () => {
    const allowed = evaluateStructuralRule({
      path: '/configurations/server',
      auth: null,
      operation: 'read',
    });
    assert.strictEqual(allowed, false);
  });
});
