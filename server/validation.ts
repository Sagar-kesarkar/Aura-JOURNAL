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
