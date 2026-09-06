// Input Validation & Schema Sanitization

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Checks for prototype pollution patterns recursively
 */
export function containsPrototypePollution(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;

  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key)) return true;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (containsPrototypePollution(obj[key])) return true;
    }
  }
  return false;
}

/**
 * Recursively strip undefined properties to ensure clean database and API payloads
 */
export function stripUndefined<T>(val: T): T {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) {
    return val.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (typeof val === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined && !FORBIDDEN_KEYS.has(k)) {
        res[k] = stripUndefined(v);
      }
    }
    return res as T;
  }
  return val;
}

export interface ValidatedReflectInput {
  messages: Array<{ role: 'user' | 'model'; content: string }>;
  mode: 'reflection' | 'summary' | 'brainstorm' | 'action_items';
  entryTitle?: string;
}

export function validateReflectPayload(body: any): { error?: string; data?: ValidatedReflectInput } {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid request body: Expected JSON object' };
  }

  if (containsPrototypePollution(body)) {
    return { error: 'Security violation: Prototype pollution attempt detected' };
  }

  const { messages, mode, entryTitle } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: 'Validation error: "messages" must be a non-empty array' };
  }

  if (messages.length > 20) {
    return { error: 'Validation error: "messages" exceeds maximum history length (20 items)' };
  }

  const validatedMessages: Array<{ role: 'user' | 'model'; content: string }> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== 'object') {
      return { error: `Validation error: message at index ${i} is not an object` };
    }

    if (msg.role !== 'user' && msg.role !== 'model') {
      return { error: `Validation error: message at index ${i} has invalid role "${msg.role}"` };
    }

    if (typeof msg.content !== 'string' || !msg.content.trim()) {
      return { error: `Validation error: message at index ${i} has invalid or empty content` };
    }

    if (msg.content.length > 15000) {
      return { error: `Validation error: message at index ${i} exceeds maximum length of 15,000 characters` };
    }

    validatedMessages.push({
      role: msg.role,
      content: msg.content.trim(),
    });
  }

  const validModes = ['reflection', 'summary', 'brainstorm', 'action_items'] as const;
  const validatedMode = validModes.includes(mode) ? mode : 'reflection';

  let sanitizedTitle: string | undefined = undefined;
  if (typeof entryTitle === 'string') {
    sanitizedTitle = entryTitle.trim().slice(0, 250);
  }

  return {
    data: {
      messages: validatedMessages,
      mode: validatedMode,
      entryTitle: sanitizedTitle,
    },
  };
}

export function validateSummarizePayload(body: any): { error?: string; content?: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid request body: Expected JSON object' };
  }

  if (containsPrototypePollution(body)) {
    return { error: 'Security violation: Prototype pollution attempt detected' };
  }

  const { content } = body;

  if (typeof content !== 'string' || !content.trim()) {
    return { error: 'Validation error: "content" must be a non-empty string' };
  }

  if (content.length > 50000) {
    return { error: 'Validation error: "content" exceeds maximum length of 50,000 characters' };
  }

  return { content: content.trim() };
}

/**
 * Validates and sanitizes structured analysis output from Gemini
 */
export function validateAndSanitizeAnalysis(raw: any) {
  const fallback = {
    title: 'Journal Synthesis',
    summary: 'A reflection on key themes and insights.',
    tags: ['Mindfulness', 'Personal Growth'],
    sentiment: 'Contemplative',
    keyTakeaways: ['Meaningful insights captured in this session.'],
  };

  if (!raw || typeof raw !== 'object') return fallback;

  return {
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim().slice(0, 200) : fallback.title,
    summary: typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary.trim().slice(0, 2000) : fallback.summary,
    tags: Array.isArray(raw.tags)
      ? raw.tags
          .filter((t: any) => typeof t === 'string' && t.trim())
          .map((t: string) => t.trim().slice(0, 30))
          .slice(0, 8)
      : fallback.tags,
    sentiment: typeof raw.sentiment === 'string' && raw.sentiment.trim() ? raw.sentiment.trim().slice(0, 50) : fallback.sentiment,
    keyTakeaways: Array.isArray(raw.keyTakeaways)
      ? raw.keyTakeaways
          .filter((k: any) => typeof k === 'string' && k.trim())
          .map((k: string) => k.trim().slice(0, 500))
          .slice(0, 10)
      : fallback.keyTakeaways,
  };
}

export interface InputEntrySummary {
  id: string;
  title: string;
  date: string;
  text: string;
  tag?: string;
}

export interface RecurringThread {
  id: string;
  title: string;
  copy: string;
  tag: string;
  entryIds: string[];
}

export interface WeeklyReviewData {
  dateRange: string;
  standout: {
    title: string;
    text: string;
  };
  load: {
    text: string;
  };
  action: {
    title: string;
    text: string;
    sourceEntryId?: string;
    sourceEntryTitle?: string;
  };
  positive: {
    text: string;
  };
}

/**
 * Validates cross-entry payload for threads
 */
export function validateThreadsPayload(body: any): { error?: string; entries?: InputEntrySummary[] } {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid request body: Expected JSON object' };
  }

  if (containsPrototypePollution(body)) {
    return { error: 'Security violation: Prototype pollution attempt detected' };
  }

  const { entries } = body;
  if (!Array.isArray(entries)) {
    return { error: 'Validation error: "entries" must be an array' };
  }

  const validated: InputEntrySummary[] = [];
  for (const item of entries.slice(0, 20)) {
    if (!item || typeof item !== 'object') continue;
    const id = typeof item.id === 'string' ? item.id.slice(0, 100) : String(item.id || '');
    const title = typeof item.title === 'string' ? item.title.trim().slice(0, 150) : 'Reflection';
    const date = typeof item.date === 'string' ? item.date.slice(0, 50) : '';
    const text = typeof item.text === 'string' ? item.text.trim().slice(0, 4000) : '';
    const tag = typeof item.tag === 'string' ? item.tag.trim().slice(0, 50) : undefined;

    if (text || title) {
      validated.push({ id, title, date, text, tag });
    }
  }

  return { entries: validated };
}

/**
 * Validates and sanitizes recurring threads generated by Gemini
 */
export function validateAndSanitizeThreads(
  raw: any,
  availableEntries: InputEntrySummary[]
): RecurringThread[] {
  const validEntryIds = new Set(availableEntries.map((e) => e.id));
  const fallbackThreads: RecurringThread[] = availableEntries.length > 0
    ? [
        {
          id: 'focus-and-growth',
          title: 'Deepening Focus & Direction',
          copy: `Themes around intentional progress and personal clarity appear across ${Math.min(availableEntries.length, 3)} of your reflections.`,
          tag: 'Growth & Focus',
          entryIds: availableEntries.slice(0, 3).map((e) => e.id),
        },
      ]
    : [];

  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.threads)) {
    return fallbackThreads;
  }

  const sanitized: RecurringThread[] = [];

  for (let i = 0; i < raw.threads.length && sanitized.length < 6; i++) {
    const item = raw.threads[i];
    if (!item || typeof item !== 'object') continue;

    const title = typeof item.title === 'string' && item.title.trim()
      ? item.title.trim().slice(0, 120)
      : `Recurring Thread ${i + 1}`;

    const copy = typeof item.copy === 'string' && item.copy.trim()
      ? item.copy.trim().slice(0, 350)
      : 'Patterns and recurring thoughts observed across your reflections.';

    const tag = typeof item.tag === 'string' && item.tag.trim()
      ? item.tag.trim().slice(0, 40)
      : 'Insight';

    let matchedIds: string[] = [];
    if (Array.isArray(item.entryIds)) {
      matchedIds = item.entryIds.filter((id: any) => typeof id === 'string' && validEntryIds.has(id));
    }

    // If Gemini provided no matching IDs or nonexistent IDs, map to available entries
    if (matchedIds.length === 0 && availableEntries.length > 0) {
      matchedIds = availableEntries.slice(0, Math.min(2, availableEntries.length)).map((e) => e.id);
    }

    const id = typeof item.id === 'string' && item.id.trim()
      ? item.id.trim().toLowerCase().replace(/[^\w-]/g, '-').slice(0, 50)
      : 'thread-' + (i + 1) + '-' + Math.random().toString(36).slice(2, 7);

    sanitized.push({
      id,
      title,
      copy,
      tag,
      entryIds: matchedIds,
    });
  }

  return sanitized.length > 0 ? sanitized : fallbackThreads;
}

/**
 * Validates and sanitizes weekly review output from Gemini
 */
export function validateAndSanitizeReview(
  raw: any,
  availableEntries: InputEntrySummary[]
): WeeklyReviewData {
  const defaultRange = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const firstEntry = availableEntries[0];

  const fallback: WeeklyReviewData = {
    dateRange: defaultRange,
    standout: {
      title: firstEntry ? `Perspectives from "${firstEntry.title}"` : 'A week of quiet reflection.',
      text: availableEntries.length > 0
        ? `Your reflections reflect a steady commitment to self-honesty, thoughtful balance, and intentional progress.`
        : 'Take time to write a few entries to capture your week in perspective.',
    },
    load: {
      text: 'Balancing demanding projects, shifting schedules, and personal headspace can create subtle background tension.',
    },
    action: {
      title: 'Carve out 15 minutes of uninterrupted space.',
      text: firstEntry
        ? `Inspired by your thought "${firstEntry.title}", take one small unhurried step forward without pressure.`
        : 'Dedicate 15 minutes of quiet reflection to pause and reset your priorities.',
      sourceEntryId: firstEntry?.id,
      sourceEntryTitle: firstEntry?.title,
    },
    positive: {
      text: 'You made space to record your thoughts and stay grounded amidst daily responsibilities.',
    },
  };

  if (!raw || typeof raw !== 'object') return fallback;

  return {
    dateRange: typeof raw.dateRange === 'string' && raw.dateRange.trim() ? raw.dateRange.trim().slice(0, 60) : fallback.dateRange,
    standout: {
      title: typeof raw.standout?.title === 'string' && raw.standout.title.trim() ? raw.standout.title.trim().slice(0, 140) : fallback.standout.title,
      text: typeof raw.standout?.text === 'string' && raw.standout.text.trim() ? raw.standout.text.trim().slice(0, 600) : fallback.standout.text,
    },
    load: {
      text: typeof raw.load?.text === 'string' && raw.load.text.trim() ? raw.load.text.trim().slice(0, 600) : fallback.load.text,
    },
    action: {
      title: typeof raw.action?.title === 'string' && raw.action.title.trim() ? raw.action.title.trim().slice(0, 140) : fallback.action.title,
      text: typeof raw.action?.text === 'string' && raw.action.text.trim() ? raw.action.text.trim().slice(0, 600) : fallback.action.text,
      sourceEntryId: typeof raw.action?.sourceEntryId === 'string' ? raw.action.sourceEntryId : firstEntry?.id,
      sourceEntryTitle: typeof raw.action?.sourceEntryTitle === 'string' ? raw.action.sourceEntryTitle : firstEntry?.title,
    },
    positive: {
      text: typeof raw.positive?.text === 'string' && raw.positive.text.trim() ? raw.positive.text.trim().slice(0, 600) : fallback.positive.text,
    },
  };
}

