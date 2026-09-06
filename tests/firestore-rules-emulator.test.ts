import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const PROJECT_ID = 'aura-journal-emulator-test';

describe('Firestore Security Rules Genuine Emulator Suite (@firebase/rules-unit-testing)', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    // Requires the official Firestore Emulator (firebase emulators:exec --only firestore)
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error(
        'FIRESTORE_EMULATOR_HOST is not set. The genuine Firestore Emulator suite requires the Firebase Local Emulator (Java runtime + firebase-tools). In environments without Java, this test suite is marked BLOCKED.'
      );
    }

    const rawHost = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').replace(/^https?:\/\//, '');
    const lastColonIndex = rawHost.lastIndexOf(':');
    const host = lastColonIndex !== -1 ? rawHost.substring(0, lastColonIndex) : '127.0.0.1';
    const port = lastColonIndex !== -1 ? Number(rawHost.substring(lastColonIndex + 1)) : 8080;

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8'),
        host,
        port,
      },
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  test('1. Unauthenticated read denial: unauthenticated visitor cannot read journal data', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const docRef = doc(unauthedDb, 'users/user-a/entries/entry-1');
    await assertFails(getDoc(docRef));
  });

  test('2. Unauthenticated write denial: unauthenticated visitor cannot create/update/delete journal data', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const docRef = doc(unauthedDb, 'users/user-a/entries/entry-1');
    await assertFails(setDoc(docRef, { title: 'Hacked', content: 'Unauthorized write' }));
  });

  test('3. User A accessing User A data: User A can create and read their own entries', async () => {
    const userADb = testEnv.authenticatedContext('user-a').firestore();
    const docRef = doc(userADb, 'users/user-a/entries/entry-1');
    await assertSucceeds(setDoc(docRef, { title: 'User A Entry', content: 'Private reflections' }));
    await assertSucceeds(getDoc(docRef));
  });

  test('4. User B accessing User B data: User B can create and read their own entries', async () => {
    const userBDb = testEnv.authenticatedContext('user-b').firestore();
    const docRef = doc(userBDb, 'users/user-b/entries/entry-1');
    await assertSucceeds(setDoc(docRef, { title: 'User B Entry', content: 'Private thoughts' }));
    await assertSucceeds(getDoc(docRef));
  });

  test('5. User A denied access to User B data: User A cannot read User B entries', async () => {
    const userADb = testEnv.authenticatedContext('user-a').firestore();
    const docRef = doc(userADb, 'users/user-b/entries/entry-1');
    await assertFails(getDoc(docRef));
  });

  test('6. User B denied access to User A data: User B cannot read User A entries', async () => {
    const userBDb = testEnv.authenticatedContext('user-b').firestore();
    const docRef = doc(userBDb, 'users/user-a/entries/entry-1');
    await assertFails(getDoc(docRef));
  });

  test('7. Cross-user update denial: User A cannot update User B records', async () => {
    const userADb = testEnv.authenticatedContext('user-a').firestore();
    const docRef = doc(userADb, 'users/user-b/entries/entry-1');
    await assertFails(updateDoc(docRef, { title: 'Defaced by User A' }));
  });

  test('8. Cross-user deletion denial: User A cannot delete User B records', async () => {
    const userADb = testEnv.authenticatedContext('user-a').firestore();
    const docRef = doc(userADb, 'users/user-b/entries/entry-1');
    await assertFails(deleteDoc(docRef));
  });

  test('9. Ownership-field hijacking denial: User A cannot create records in User B path by spoofing fields', async () => {
    const userADb = testEnv.authenticatedContext('user-a').firestore();
    const docRef = doc(userADb, 'users/user-b/entries/hijack-entry');
    await assertFails(setDoc(docRef, { ownerId: 'user-b', title: 'Spoofed Ownership' }));
  });

  test('10. Unexpected-collection denial: default catch-all denies root documents or arbitrary collections', async () => {
    const userADb = testEnv.authenticatedContext('user-a').firestore();
    const rootDocRef = doc(userADb, 'system_config/credentials');
    await assertFails(getDoc(rootDocRef));
    await assertFails(setDoc(rootDocRef, { secret: 'exposed' }));

    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(rootDocRef));
  });

  test('11. Nested message/subcollection isolation: User B cannot read or write to User A nested subcollections', async () => {
    const userBDb = testEnv.authenticatedContext('user-b').firestore();
    const nestedDocRef = doc(userBDb, 'users/user-a/entries/entry-1/messages/msg-1');
    await assertFails(getDoc(nestedDocRef));
    await assertFails(setDoc(nestedDocRef, { role: 'user', content: 'Injected message' }));
  });
});
