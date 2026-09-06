import crypto from 'crypto';
import { getFirebaseAdminApp } from './auth';
import { getFirestore } from 'firebase-admin/firestore';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';

export interface GoalMilestone {
  id: string;
  label: string;
  done: boolean;
}

export interface Goal {
  id: string;
  userId?: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  milestones: GoalMilestone[];
  status: GoalStatus;
  progressPercent: number | null;
  mentionCount: number;
  relatedSessionIds: string[];
  lastMentionedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EntryPreview {
  id: string;
  title: string;
  date: string;
  textSnippet: string;
}

// In-memory fallback map for test environments & offline development: key = `${uid}:${goalId}`
const memoryGoals = new Map<string, Goal>();

function getFirestoreDb() {
  // If explicitly in unit test mode without Firestore emulator, use memory store directly
  if (process.env.NODE_ENV === 'test' && !process.env.FIRESTORE_EMULATOR_HOST) {
    return null;
  }
  try {
    const app = getFirebaseAdminApp();
    return getFirestore(app);
  } catch (err: any) {
    return null;
  }
}

export function calculateProgress(milestones: GoalMilestone[], manualPercent: number | null): number | null {
  if (milestones && milestones.length > 0) {
    const completed = milestones.filter((m) => m.done).length;
    return Math.round((completed / milestones.length) * 100);
  }
  return typeof manualPercent === 'number'
    ? Math.max(0, Math.min(100, Math.round(manualPercent)))
    : null;
}

export async function listGoals(uid: string): Promise<Goal[]> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const snapshot = await db.collection('users').doc(uid).collection('goals').get();
      const goals: Goal[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Goal;
        return {
          ...data,
          id: docSnap.id,
          milestones: Array.isArray(data.milestones) ? data.milestones : [],
          relatedSessionIds: Array.isArray(data.relatedSessionIds) ? data.relatedSessionIds : [],
        };
      });
      return sortGoals(goals);
    } catch (err) {
      console.warn('[GOALS] Firestore list failed, using memory store:', (err as any)?.message);
    }
  }

  const userGoals: Goal[] = [];
  for (const [key, goal] of memoryGoals.entries()) {
    if (key.startsWith(`${uid}:`)) {
      userGoals.push(goal);
    }
  }
  return sortGoals(userGoals);
}

function sortGoals(goals: Goal[]): Goal[] {
  const statusWeight: Record<GoalStatus, number> = {
    active: 0,
    completed: 1,
    paused: 2,
    abandoned: 3,
  };

  return goals.sort((a, b) => {
    const wA = statusWeight[a.status] ?? 0;
    const wB = statusWeight[b.status] ?? 0;
    if (wA !== wB) return wA - wB;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function getGoal(uid: string, goalId: string): Promise<Goal | null> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const docSnap = await db.collection('users').doc(uid).collection('goals').doc(goalId).get();
      if (docSnap.exists) {
        const data = docSnap.data() as Goal;
        return {
          ...data,
          id: docSnap.id,
          milestones: Array.isArray(data.milestones) ? data.milestones : [],
          relatedSessionIds: Array.isArray(data.relatedSessionIds) ? data.relatedSessionIds : [],
        };
      }
      return null;
    } catch (err) {
      console.warn('[GOALS] Firestore get failed, using memory store:', (err as any)?.message);
    }
  }

  return memoryGoals.get(`${uid}:${goalId}`) || null;
}

export async function createGoal(
  uid: string,
  params: {
    title: string;
    description?: string | null;
    targetDate?: string | null;
    milestones?: Array<{ id?: string; label: string; done?: boolean }>;
    status?: GoalStatus;
    progressPercent?: number | null;
    relatedSessionIds?: string[];
  }
): Promise<Goal> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const formattedMilestones: GoalMilestone[] = (params.milestones || []).map((m) => ({
    id: m.id || crypto.randomUUID(),
    label: String(m.label || '').trim(),
    done: Boolean(m.done),
  }));

  const progress = calculateProgress(formattedMilestones, params.progressPercent ?? null);

  const goal: Goal = {
    id,
    title: params.title.trim(),
    description: params.description ? params.description.trim() : null,
    targetDate: params.targetDate ? params.targetDate.trim() : null,
    milestones: formattedMilestones,
    status: params.status || 'active',
    progressPercent: progress,
    mentionCount: (params.relatedSessionIds || []).length,
    relatedSessionIds: params.relatedSessionIds || [],
    lastMentionedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection('users').doc(uid).collection('goals').doc(id).set(goal);
    } catch (err) {
      console.warn('[GOALS] Firestore create failed, persisting in memory:', (err as any)?.message);
    }
  }

  memoryGoals.set(`${uid}:${id}`, goal);
  return goal;
}

export async function updateGoal(
  uid: string,
  goalId: string,
  updates: {
    title?: string;
    description?: string | null;
    targetDate?: string | null;
    milestones?: Array<{ id?: string; label: string; done?: boolean }>;
    status?: GoalStatus;
    progressPercent?: number | null;
    lastMentionedAt?: string | null;
    relatedSessionIds?: string[];
  }
): Promise<Goal | null> {
  const existing = await getGoal(uid, goalId);
  if (!existing) return null;

  const now = new Date().toISOString();
  let updatedMilestones = existing.milestones;
  if (updates.milestones !== undefined) {
    updatedMilestones = updates.milestones.map((m) => ({
      id: m.id || crypto.randomUUID(),
      label: String(m.label || '').trim(),
      done: Boolean(m.done),
    }));
  }

  const progress = calculateProgress(
    updatedMilestones,
    updates.progressPercent !== undefined ? updates.progressPercent : existing.progressPercent
  );

  const related = updates.relatedSessionIds !== undefined ? updates.relatedSessionIds : existing.relatedSessionIds;

  const updated: Goal = {
    ...existing,
    title: updates.title !== undefined ? updates.title.trim() : existing.title,
    description: updates.description !== undefined ? updates.description : existing.description,
    targetDate: updates.targetDate !== undefined ? updates.targetDate : existing.targetDate,
    milestones: updatedMilestones,
    status: updates.status !== undefined ? updates.status : existing.status,
    progressPercent: progress,
    mentionCount: related.length,
    relatedSessionIds: related,
    lastMentionedAt: updates.lastMentionedAt !== undefined ? updates.lastMentionedAt : existing.lastMentionedAt,
    updatedAt: now,
  };

  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection('users').doc(uid).collection('goals').doc(goalId).set(updated, { merge: true });
    } catch (err) {
      console.warn('[GOALS] Firestore update failed, writing to memory store:', (err as any)?.message);
    }
  }

  memoryGoals.set(`${uid}:${goalId}`, updated);
  return updated;
}

export async function deleteGoal(uid: string, goalId: string): Promise<boolean> {
  const existing = await getGoal(uid, goalId);
  if (!existing) return false;

  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection('users').doc(uid).collection('goals').doc(goalId).delete();
    } catch (err) {
      console.warn('[GOALS] Firestore delete failed:', (err as any)?.message);
    }
  }

  memoryGoals.delete(`${uid}:${goalId}`);
  return true;
}

export async function resolveEntryPreviews(uid: string, sessionIds: string[]): Promise<EntryPreview[]> {
  if (!sessionIds || sessionIds.length === 0) return [];
  const previews: EntryPreview[] = [];
  const db = getFirestoreDb();

  if (db) {
    try {
      for (const id of sessionIds.slice(0, 10)) {
        const docSnap = await db.collection('users').doc(uid).collection('entries').doc(id).get();
        if (docSnap.exists) {
          const d = docSnap.data() || {};
          const text = String(d.text || d.content || '');
          previews.push({
            id: docSnap.id,
            title: d.title || 'Untitled Thought',
            date: d.date || d.updatedAt || new Date().toISOString(),
            textSnippet: text.length > 160 ? text.slice(0, 160) + '…' : text,
          });
        }
      }
      return previews;
    } catch (err) {
      console.warn('[GOALS] Entry preview resolution error:', (err as any)?.message);
    }
  }

  return sessionIds.map((id) => ({
    id,
    title: 'Journal Entry',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    textSnippet: 'Reflection referencing this goal.',
  }));
}
