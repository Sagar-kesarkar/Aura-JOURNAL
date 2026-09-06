import { auth } from './firebase';
import { type Goal, type GoalMilestone, type GoalStatus, calculateGoalProgress } from '../app/journal-data';
import type { Entry } from '../app/journal-data';

export interface EntryPreview {
  id: string;
  title: string;
  date: string;
  textSnippet: string;
}

const LOCAL_GOALS_KEY = 'aura-journal-goals';

/**
 * Retrieves the current authenticated Firebase user's ID token.
 */
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Local storage fallback for demo/unauthenticated mode
// ---------------------------------------------------------------------------

export function readLocalGoals(): Goal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_GOALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveLocalGoals(goals: Goal[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(goals));
  } catch (err) {
    console.warn('Failed to save goals locally:', err);
  }
}

// ---------------------------------------------------------------------------
// Semantic entry-to-goal matching engine (Section 4)
// ---------------------------------------------------------------------------

/**
 * Extracts meaningful keyword tokens from a goal title & description
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'about', 'into', 'through', 'after', 'over', 'between', 'out',
    'more', 'some', 'my', 'your', 'our', 'this', 'that', 'these', 'those', 'is',
    'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
    'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word));
}

/**
 * Scans user entries to find matching mentions for a goal.
 * Reuses the semantic keyword & thematic tag matching approach.
 */
export function matchGoalWithEntries(
  goal: Goal,
  entries: Entry[]
): {
  relatedSessionIds: string[];
  mentionCount: number;
  lastMentionedAt: string | null;
  matchedPreviews: EntryPreview[];
} {
  const keywords = extractKeywords(`${goal.title} ${goal.description || ''}`);
  if (keywords.length === 0 || entries.length === 0) {
    return {
      relatedSessionIds: goal.relatedSessionIds || [],
      mentionCount: goal.mentionCount || 0,
      lastMentionedAt: goal.lastMentionedAt,
      matchedPreviews: [],
    };
  }

  const matched: Array<{ entry: Entry; snippet: string; date: string }> = [];

  for (const e of entries) {
    const titleLower = (e.title || '').toLowerCase();
    const textLower = (e.text || '').toLowerCase();
    const tagLower = (e.tag || '').toLowerCase();

    let hitCount = 0;
    let matchIndex = -1;

    for (const kw of keywords) {
      if (titleLower.includes(kw) || tagLower.includes(kw)) {
        hitCount += 2;
      }
      const idx = textLower.indexOf(kw);
      if (idx !== -1) {
        hitCount += 1;
        if (matchIndex === -1) matchIndex = idx;
      }
    }

    if (hitCount >= 1) {
      const snippetStart = Math.max(0, matchIndex - 30);
      const snippetEnd = Math.min(e.text.length, matchIndex + 120);
      let snippet = e.text.slice(snippetStart, snippetEnd).trim();
      if (snippetStart > 0) snippet = '…' + snippet;
      if (snippetEnd < e.text.length) snippet = snippet + '…';

      matched.push({
        entry: e,
        snippet: snippet || e.text.slice(0, 140) + '…',
        date: e.date,
      });
    }
  }

  // Sort matched entries newest first
  matched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const relatedSessionIds = matched.map((m) => m.entry.id);
  const lastMentionedAt = matched.length > 0 ? matched[0].date : goal.lastMentionedAt;

  const matchedPreviews: EntryPreview[] = matched.slice(0, 10).map((m) => ({
    id: m.entry.id,
    title: m.entry.title || 'Untitled reflection',
    date: m.entry.date,
    textSnippet: m.snippet,
  }));

  return {
    relatedSessionIds,
    mentionCount: matched.length,
    lastMentionedAt,
    matchedPreviews,
  };
}

// ---------------------------------------------------------------------------
// Cloud API Methods with transparent demo fallback
// ---------------------------------------------------------------------------

export async function fetchGoals(entries: Entry[] = []): Promise<Goal[]> {
  const token = await getAuthToken();

  if (!token) {
    // Demo mode: read from localStorage and sync mentions against current entries
    const local = readLocalGoals();
    return local.map((g) => {
      const { relatedSessionIds, mentionCount, lastMentionedAt } = matchGoalWithEntries(g, entries);
      return { ...g, relatedSessionIds, mentionCount, lastMentionedAt };
    });
  }

  try {
    const res = await fetch('/api/goals', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remoteGoals: Goal[] = await res.json();
    return remoteGoals;
  } catch (err) {
    console.warn('Falling back to local goals storage:', err);
    return readLocalGoals();
  }
}

export async function createGoal(
  params: {
    title: string;
    description?: string | null;
    targetDate?: string | null;
    milestones?: Array<{ id?: string; label: string; done?: boolean }>;
    status?: GoalStatus;
    progressPercent?: number | null;
  },
  entries: Entry[] = []
): Promise<Goal> {
  const token = await getAuthToken();

  if (token) {
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || `Failed to create goal (${res.status})`);
      }

      return await res.json();
    } catch (err) {
      console.warn('Cloud goal creation failed, falling back to local storage:', err);
    }
  }

  // Demo fallback
  const now = new Date().toISOString();
  const formattedMilestones: GoalMilestone[] = (params.milestones || []).map((m) => ({
    id: m.id || crypto.randomUUID ? crypto.randomUUID() : 'm-' + Math.random().toString(36).slice(2, 9),
    label: (m.label || '').trim(),
    done: Boolean(m.done),
  }));

  const progress = calculateGoalProgress({
    milestones: formattedMilestones,
    progressPercent: params.progressPercent ?? null,
  });

  const newGoal: Goal = {
    id: crypto.randomUUID ? crypto.randomUUID() : 'goal-' + Date.now(),
    title: params.title.trim(),
    description: params.description ? params.description.trim() : null,
    targetDate: params.targetDate ? params.targetDate.trim() : null,
    milestones: formattedMilestones,
    status: params.status || 'active',
    progressPercent: progress,
    mentionCount: 0,
    relatedSessionIds: [],
    lastMentionedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const { relatedSessionIds, mentionCount, lastMentionedAt } = matchGoalWithEntries(newGoal, entries);
  newGoal.relatedSessionIds = relatedSessionIds;
  newGoal.mentionCount = mentionCount;
  newGoal.lastMentionedAt = lastMentionedAt;

  const current = readLocalGoals();
  saveLocalGoals([newGoal, ...current]);
  return newGoal;
}

export async function fetchGoalDetails(
  goalId: string,
  entries: Entry[] = []
): Promise<Goal & { entryPreviews: EntryPreview[] }> {
  const token = await getAuthToken();

  if (token) {
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Could not fetch goal details from cloud:', err);
    }
  }

  // Demo fallback
  const current = readLocalGoals();
  const found = current.find((g) => g.id === goalId);
  if (!found) {
    throw new Error('Goal not found');
  }

  const { relatedSessionIds, mentionCount, lastMentionedAt, matchedPreviews } = matchGoalWithEntries(found, entries);
  return {
    ...found,
    relatedSessionIds,
    mentionCount,
    lastMentionedAt,
    entryPreviews: matchedPreviews,
  };
}

export async function patchGoal(
  goalId: string,
  updates: Partial<Goal>,
  entries: Entry[] = []
): Promise<Goal> {
  const token = await getAuthToken();

  if (token) {
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || `Failed to update goal (${res.status})`);
      }

      return await res.json();
    } catch (err) {
      console.warn('Cloud goal patch failed, updating local storage:', err);
    }
  }

  // Demo fallback
  const current = readLocalGoals();
  const idx = current.findIndex((g) => g.id === goalId);
  if (idx === -1) throw new Error('Goal not found');

  const existing = current[idx];
  const now = new Date().toISOString();

  let updatedMilestones = existing.milestones;
  if (updates.milestones !== undefined) {
    updatedMilestones = updates.milestones.map((m) => ({
      id: m.id || crypto.randomUUID ? crypto.randomUUID() : 'm-' + Math.random().toString(36).slice(2, 9),
      label: (m.label || '').trim(),
      done: Boolean(m.done),
    }));
  }

  const progress = calculateGoalProgress({
    milestones: updatedMilestones,
    progressPercent: updates.progressPercent !== undefined ? updates.progressPercent : existing.progressPercent,
  });

  const updatedGoal: Goal = {
    ...existing,
    ...updates,
    milestones: updatedMilestones,
    progressPercent: progress,
    updatedAt: now,
  };

  const { relatedSessionIds, mentionCount, lastMentionedAt } = matchGoalWithEntries(updatedGoal, entries);
  updatedGoal.relatedSessionIds = relatedSessionIds;
  updatedGoal.mentionCount = mentionCount;
  updatedGoal.lastMentionedAt = updates.lastMentionedAt !== undefined ? updates.lastMentionedAt : lastMentionedAt;

  current[idx] = updatedGoal;
  saveLocalGoals(current);
  return updatedGoal;
}

export async function deleteGoal(goalId: string): Promise<boolean> {
  const token = await getAuthToken();

  if (token) {
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        // Also clean up local mirror
        const current = readLocalGoals().filter((g) => g.id !== goalId);
        saveLocalGoals(current);
        return true;
      }
    } catch (err) {
      console.warn('Cloud goal delete failed:', err);
    }
  }

  // Demo fallback
  const current = readLocalGoals().filter((g) => g.id !== goalId);
  saveLocalGoals(current);
  return true;
}

export async function fetchGoalSuggestions(
  goalId: string,
  entryPreviews: EntryPreview[] = []
): Promise<{ suggestions: string[]; sourceSessionIds: string[] }> {
  const token = await getAuthToken();

  if (token) {
    try {
      const res = await fetch(`/api/goals/${goalId}/suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Cloud suggestions request failed:', err);
    }
  }

  // Grounded constraint: Only generate if matching entries exist, referencing specific entries
  if (!entryPreviews || entryPreviews.length === 0) {
    return { suggestions: [], sourceSessionIds: [] };
  }

  const suggestions: string[] = [];
  const sourceSessionIds: string[] = [];

  for (const preview of entryPreviews.slice(0, 2)) {
    suggestions.push(`Reflected in "${preview.title}": consider taking a small 15-minute step based on this thought.`);
    sourceSessionIds.push(preview.id);
  }

  return { suggestions, sourceSessionIds };
}
