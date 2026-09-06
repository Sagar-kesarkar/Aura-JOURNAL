import { auth } from './firebase';

export interface ReflectResponse {
  reply: string;
  modelUsed: string;
}

export interface JournalAnalysis {
  title: string;
  summary: string;
  tags: string[];
  sentiment: string;
  keyTakeaways: string[];
}

export interface SummarizeResponse {
  analysis: JournalAnalysis;
  modelUsed: string;
}

/**
 * Retrieves the current authenticated Firebase user's ID token.
 */
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required: Please sign in with Google to generate reflections.');
  }
  const token = await user.getIdToken();
  if (!token) {
    throw new Error('Failed to obtain authentication credential. Please refresh and re-authenticate.');
  }
  return token;
}

export async function checkBackendHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error(`Backend health check returned ${res.status}`);
  return res.json();
}

export async function reflectWithGemini(
  messages: Array<{ role: 'user' | 'model'; content: string }>,
  mode: string,
  entryTitle?: string
): Promise<ReflectResponse> {
  const idToken = await getAuthToken();

  const response = await fetch('/api/gemini/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      messages,
      mode: mode.toLowerCase().replace(/\s+/g, '_'),
      entryTitle,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(errorData.error || `Server error (${response.status})`);
  }

  return response.json();
}

export async function summarizeJournalEntry(content: string): Promise<SummarizeResponse> {
  const idToken = await getAuthToken();

  const response = await fetch('/api/gemini/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(errorData.error || `Server error (${response.status})`);
  }

  return response.json();
}

export async function exportJournalEntriesApi(userId: string): Promise<{ status: string; owner: string }> {
  const idToken = await getAuthToken();

  const response = await fetch('/api/journal/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to authorize export' }));
    throw new Error(errorData.error || `Export error (${response.status})`);
  }

  return response.json();
}

export async function deleteJournalEntryApi(userId: string, entryId: string): Promise<{ status: string }> {
  const idToken = await getAuthToken();

  const response = await fetch('/api/journal/entry', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ userId, entryId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to authorize deletion' }));
    throw new Error(errorData.error || `Delete error (${response.status})`);
  }

  return response.json();
}

