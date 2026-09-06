export type JournalMessage = {
  id: string;
  text: string;
  createdAt: string;
  role?: 'user' | 'model';
  modelUsed?: string;
};
export type Entry = {
  id: string;
  title: string;
  text: string;
  date: string;
  mode: string;
  tag: string;
  updatedAt?: string;
  createdAt?: string;
  sample?: boolean;
  messages?: JournalMessage[];
};
export type Draft = {
  title: string;
  body: string;
  mode: string;
  followup: string;
};
export type Preferences = {
  statuses: Record<string, string>;
  feedback: string;
  weekly: boolean;
  cadence: string;
  reviewTime: string;
  windowDays: string;
  concept: string;
};
export const defaultPreferences: Preferences = {
  statuses: {},
  feedback: '',
  weekly: false,
  cadence: 'Sunday',
  reviewTime: '18:00',
  windowDays: '30',
  concept: 'Modern Notebook',
};
export const modes = [
  'Philosophical Reflection',
  'Synthesize and Summarize',
  'Brainstorm Paths',
  'Action Steps',
  'Free Journal',
];
export const samples: Entry[] = [
  {
    id: '1',
    title: 'Making room for what matters',
    text: 'I took a walk without my phone this morning. It was a small thing, but I noticed how much more space there was to think. I want to make more room for these quiet moments, even when the week gets busy.',
    date: 'Sep 6, 2026',
    createdAt: '2026-09-06T08:00:00+05:30',
    updatedAt: '2026-09-06T08:00:00+05:30',
    mode: 'Philosophical Reflection',
    tag: 'Finding balance',
    sample: true,
  },
  {
    id: '2',
    title: 'A small step, a clearer direction',
    text: 'We finally narrowed the project down to one idea. Instead of trying to get everything right at once, I sketched out the next small step. That felt like progress.',
    date: 'Sep 5, 2026',
    createdAt: '2026-09-05T09:00:00+05:30',
    updatedAt: '2026-09-05T09:00:00+05:30',
    mode: 'Action Steps',
    tag: 'Creative work',
    sample: true,
  },
  {
    id: '3',
    title: 'The things a good conversation changes',
    text: 'I caught up with an old friend over coffee. We talked about making time for the things we keep putting off. I left wanting to be more intentional about staying in touch.',
    date: 'Sep 3, 2026',
    createdAt: '2026-09-03T11:00:00+05:30',
    updatedAt: '2026-09-03T11:00:00+05:30',
    mode: 'Free Journal',
    tag: 'Connections',
    sample: true,
  },
];
export const entryKey = 'aura-demo-entries';
export const draftKey = 'aura-drafts-v2';
export const preferenceKey = 'aura-preferences-v2';
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function normalizeEntry(raw: any): Entry {
  if (!raw || typeof raw !== 'object') {
    const now = new Date().toISOString();
    return {
      id: String(Date.now()),
      title: 'Untitled thought',
      text: '',
      date: new Date().toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }),
      mode: 'Free Journal',
      tag: 'Reflection',
      updatedAt: now,
      createdAt: now,
    };
  }

  const id = String(raw.id || raw.uid || Date.now());
  const title = String(raw.title || raw.analysis?.title || 'An untitled thought');
  const text = typeof raw.text === 'string'
    ? raw.text
    : (typeof raw.content === 'string'
      ? raw.content
      : (typeof raw.body === 'string' ? raw.body : ''));

  let updatedAtStr: string | undefined;
  if (typeof raw.updatedAt === 'string' && raw.updatedAt) {
    updatedAtStr = raw.updatedAt;
  } else if (typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt)) {
    updatedAtStr = new Date(raw.updatedAt).toISOString();
  } else if (raw.updatedAt?.toDate && typeof raw.updatedAt.toDate === 'function') {
    updatedAtStr = raw.updatedAt.toDate().toISOString();
  }

  let createdAtStr: string | undefined;
  if (typeof raw.createdAt === 'string' && raw.createdAt) {
    createdAtStr = raw.createdAt;
  } else if (typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)) {
    createdAtStr = new Date(raw.createdAt).toISOString();
  } else if (raw.createdAt?.toDate && typeof raw.createdAt.toDate === 'function') {
    createdAtStr = raw.createdAt.toDate().toISOString();
  }

  const effectiveUpdatedAt = updatedAtStr || createdAtStr || new Date().toISOString();
  const effectiveCreatedAt = createdAtStr || effectiveUpdatedAt;

  let date = typeof raw.date === 'string' && raw.date.trim() ? raw.date : '';
  if (!date) {
    try {
      const d = new Date(effectiveCreatedAt);
      if (!isNaN(d.getTime())) {
        date = d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {
      date = 'Earlier entry';
    }
  }

  let tag = typeof raw.tag === 'string' && raw.tag.trim() ? raw.tag : '';
  if (!tag && Array.isArray(raw.tags) && raw.tags.length > 0 && typeof raw.tags[0] === 'string') {
    tag = raw.tags[0];
  }
  if (!tag && raw.analysis?.tags && Array.isArray(raw.analysis.tags) && raw.analysis.tags.length > 0) {
    tag = String(raw.analysis.tags[0]);
  }
  if (!tag) {
    tag = typeof raw.mode === 'string' && raw.mode ? raw.mode : 'Reflection';
  }

  const mode = typeof raw.mode === 'string' && raw.mode ? raw.mode : 'Free Journal';

  let messages: JournalMessage[] = [];
  if (Array.isArray(raw.messages)) {
    messages = raw.messages.map((m: any) => ({
      id: String(m.id || Date.now() + Math.random().toString(36).slice(2)),
      text: typeof m.text === 'string' ? m.text : (typeof m.content === 'string' ? m.content : ''),
      createdAt: typeof m.createdAt === 'string'
        ? m.createdAt
        : (typeof m.timestamp === 'number' ? new Date(m.timestamp).toISOString() : new Date().toISOString()),
      role: m.role === 'model' ? 'model' : 'user',
      modelUsed: typeof m.modelUsed === 'string' ? m.modelUsed : undefined,
    }));
  }

  return {
    id,
    title,
    text,
    date: date || 'Earlier entry',
    mode,
    tag,
    updatedAt: effectiveUpdatedAt,
    createdAt: effectiveCreatedAt,
    sample: Boolean(raw.sample),
    messages,
  };
}

export function readEntries(storage: StorageLike): Entry[] {
  const raw = storage.getItem(entryKey);
  if (raw === null) return samples.map((e) => ({ ...e }));
  const parsed: unknown = JSON.parse(raw);
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (e) =>
        e &&
        typeof e === 'object' &&
        typeof (e as any).id === 'string' &&
        typeof (e as any).title === 'string' &&
        (typeof (e as any).text === 'string' ||
          typeof (e as any).content === 'string' ||
          (e as any).text === undefined),
    )
  )
    throw new Error(
      'Stored entries could not be read. Export or repair the browser data before saving.',
    );
  if (new Set(parsed.map((e: any) => e.id)).size !== parsed.length)
    throw new Error('Duplicate entry identifiers in browser storage.');
  return parsed.map((e: any) => {
    const normalized = normalizeEntry(e);
    const original = samples.find(
      (s) => s.id === normalized.id && s.text === normalized.text,
    );
    return {
      ...normalized,
      sample: !!original && normalized.sample !== false,
      updatedAt:
        typeof e.updatedAt === 'string' ? e.updatedAt : original?.updatedAt,
    };
  });
}
export function emptyDraft(entry?: Entry): Draft {
  return {
    title: entry?.title || '',
    body: entry?.text || (entry as any)?.content || '',
    mode: entry?.mode || 'Free Journal',
    followup: '',
  };
}
export function mergeTranscript(
  draft: Draft,
  transcript: string,
  target: 'body' | 'followup' = 'body',
): Draft {
  const text = transcript.trim();
  return text
    ? {
        ...draft,
        [target]: draft[target] + (draft[target] ? '\n\n' : '') + text,
      }
    : draft;
}
export function readDrafts(storage: StorageLike): Record<string, Draft> {
  const raw = storage.getItem(draftKey);
  const result: Record<string, Draft> = {};
  if (raw) {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('Saved drafts could not be read.');
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Draft;
      if (
        ['title', 'body', 'mode', 'followup'].every(
          (k) => typeof v[k as keyof Draft] === 'string',
        )
      )
        Object.defineProperty(result, key, {
          value: v,
          writable: true,
          enumerable: true,
          configurable: true,
        });
    }
  }
  const legacy = storage.getItem('aura-draft');
  if (!result.new && legacy) {
    const v = JSON.parse(legacy);
    if (v && typeof v.title === 'string' && typeof v.body === 'string')
      result.new = {
        title: v.title,
        body: v.body,
        mode: typeof v.mode === 'string' ? v.mode : 'Free Journal',
        followup: '',
      };
  }
  return result;
}
export function saveEntries(storage: StorageLike, entries: Entry[]) {
  storage.setItem(entryKey, JSON.stringify(entries));
}
export function saveDrafts(
  storage: StorageLike,
  drafts: Record<string, Draft>,
) {
  storage.setItem(draftKey, JSON.stringify(drafts));
  storage.removeItem('aura-draft');
}
export function formatEntryDate(entry: Entry, now = new Date()): string {
  if (!entry) return '';
  const updatedAtVal = entry.updatedAt;
  let parsedTime = NaN;
  if (typeof updatedAtVal === 'string') {
    parsedTime = Date.parse(updatedAtVal);
  } else if (typeof updatedAtVal === 'number') {
    parsedTime = updatedAtVal;
  }
  if (!Number.isFinite(parsedTime)) {
    const fallbackDate = entry.date || 'Earlier entry';
    return ['Today', 'Yesterday'].includes(fallbackDate)
      ? 'Earlier entry'
      : fallbackDate;
  }
  const d = new Date(parsedTime);
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}
export function readingMinutes(text?: string | null): number {
  if (!text || typeof text !== 'string') return 1;
  return Math.max(
    1,
    Math.ceil(text.trim().split(/\s+/).filter(Boolean).length / 200),
  );
}
const routes: Record<string, string> = {
  'New entry': 'new',
  'Voice reflection': 'voice',
  Overview: 'overview',
  History: 'history',
  'Recurring threads': 'threads',
  'Weekly review': 'review',
  Settings: 'settings',
  Welcome: 'welcome',
};
export function viewToHash(view: string) {
  return (
    '#' +
    (view.startsWith('entry:')
      ? 'entry/' + encodeURIComponent(view.slice(6))
      : routes[view] || 'overview')
  );
}
export function hashToView(hash: string) {
  const raw = hash.replace(/^#/, '');
  if (raw.startsWith('entry/')) {
    try {
      return 'entry:' + decodeURIComponent(raw.slice(6));
    } catch {
      return 'Overview';
    }
  }
  return Object.keys(routes).find((k) => routes[k] === raw) || 'Overview';
}

export function remainingDraftAfterSave(
  draft: Draft,
  entry: Entry,
  includeFollowup: boolean,
): Draft | undefined {
  return !includeFollowup && draft.followup.trim()
    ? { ...emptyDraft(entry), followup: draft.followup }
    : undefined;
}
