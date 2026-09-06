import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { type Entry, normalizeEntry } from '../app/journal-data';

/**
 * Recursively removes any undefined values to strictly comply with Firestore requirements
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as unknown as T;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore) as unknown as T;
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeForFirestore(value);
    }
  }
  return cleaned as T;
}

/**
 * Saves or updates a journal entry in Firestore under /users/{userId}/entries/{entryId}
 */
export async function saveCloudEntry(userId: string, entry: Entry): Promise<void> {
  if (!userId || !entry || !entry.id) return;
  try {
    const entryRef = doc(db, 'users', userId, 'entries', entry.id);
    const data = sanitizeForFirestore({
      ...entry,
      content: entry.text,
      userId,
      updatedAt: entry.updatedAt || new Date().toISOString(),
    });
    await setDoc(entryRef, data, { merge: true });
  } catch (err) {
    console.error('Failed to save entry to Firestore:', err);
    throw err;
  }
}

/**
 * Deletes a journal entry from Firestore
 */
export async function deleteCloudEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) return;
  try {
    const entryRef = doc(db, 'users', userId, 'entries', entryId);
    await deleteDoc(entryRef);
  } catch (err) {
    console.error('Failed to delete entry from Firestore:', err);
    throw err;
  }
}

/**
 * Real-time subscription to cloud entries for the authenticated user
 */
export function subscribeToCloudEntries(
  userId: string,
  onUpdate: (entries: Entry[]) => void,
  onError?: (err: Error) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const entriesCol = collection(db, 'users', userId, 'entries');
  const q = query(entriesCol, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) =>
        normalizeEntry({ id: docSnap.id, ...docSnap.data() }),
      );
      onUpdate(items);
    },
    (err) => {
      console.warn('Firestore subscription status:', err.message);
      if (onError) onError(err);
    }
  );
}
