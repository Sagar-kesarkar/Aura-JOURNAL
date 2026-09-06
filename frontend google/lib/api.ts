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
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
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
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
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
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
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
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || `Delete error (${response.status})`);
  }

  return response.json();
}

export interface RecurringThread {
  id: string;
  title: string;
  copy: string;
  tag: string;
  entryIds: string[];
}

export interface WeeklyReviewData {
  id?: string;
  weekNumber?: number;
  weekLabel: string;
  dateRange: string;
  summary: string;
  direction: string;
  theme: string;
  goalProgress?: {
    goalTitle: string;
    milestone: string;
    status: 'completed' | 'progressing' | 'recalibrating';
    note: string;
  };
  standout: {
    title: string;
    text: string;
  };
  load: {
    text: string;
    consolation?: string;
  };
  action: {
    title: string;
    text: string;
    sourceEntryId?: string;
    sourceEntryTitle?: string;
  };
  positive: {
    text: string;
    celebration?: string;
  };
}

export const demoWeeklyReviews: WeeklyReviewData[] = [
  {
    id: 'week-4',
    weekNumber: 4,
    weekLabel: 'Week 4',
    dateRange: 'Monday, Aug 31 – Sunday, Sep 6, 2026',
    theme: 'Focus & Reconnection',
    summary: 'You carved out quiet space away from digital noise, made a key project step manageable, and nurtured an authentic friendship.',
    direction: 'Moving from exploratory thinking into disciplined, calm execution with mental clarity.',
    goalProgress: {
      goalTitle: 'Daily Digital Sunset & Mindful Focus',
      milestone: 'Took a phone-free morning walk and sketched the next technical step',
      status: 'completed',
      note: 'Protected your cognitive energy amidst a demanding week.',
    },
    standout: {
      title: 'Finding space in a full week.',
      text: 'Your reflections centered on three distinct anchors: leaving your phone behind for a morning walk, narrowing your creative project down to a single manageable step, and rekindling an enriching conversation with an old friend.',
    },
    load: {
      text: 'A crowded meeting calendar left little unstructured daylight, creating underlying tension about project direction. Feeling behind when deadlines loom is a natural human reaction—it indicates how deeply you care, not a personal limitation.',
      consolation: 'Give yourself credit for staying centered. Even when the schedule felt overwhelming, you did not sacrifice your boundaries or peace of mind.',
    },
    action: {
      title: 'Reserve 20 minutes of protected sketching before your next team review.',
      text: 'You noted that sketching one step made the entire roadmap feel lighter. Block out one brief 20-minute window with zero notifications to outline your next milestone.',
      sourceEntryId: '2',
      sourceEntryTitle: 'A small step, a clearer direction',
    },
    positive: {
      text: 'You intentionally chose human connection over staying glued to work, and you took deliberate time to unplug. These decisions require conscious courage.',
      celebration: '★ Pat on the back: Milestone "Draft project architecture" progressed, and you safeguarded your mental battery.',
    },
  },
  {
    id: 'week-3',
    weekNumber: 3,
    weekLabel: 'Week 3',
    dateRange: 'Monday, Aug 24 – Sunday, Aug 30, 2026',
    theme: 'Navigating Complexity',
    summary: 'A demanding week of competing priorities and technical hurdles, met with patience and deliberate rest.',
    direction: 'Regaining autonomy by simplifying requirements and refusing to burn out.',
    goalProgress: {
      goalTitle: 'Consistent Evening Boundaries',
      milestone: 'Logged off by 8:00 PM every night despite difficult debugging',
      status: 'completed',
      note: 'Demonstrated resilience under pressure.',
    },
    standout: {
      title: 'Weathering ambiguous demands with poise.',
      text: 'You grappled with competing priorities and ambiguous architectural choices. Despite moments of deep fatigue, you paused to write your thoughts down rather than reacting impulsively.',
    },
    load: {
      text: 'Several conflicting requests arrived simultaneously, and a technical task took twice as long as anticipated. High cognitive fatigue is real—it is your brain signaling a legitimate need for rest, not an inability to deliver.',
      consolation: 'Remember: a frustrating day does not diminish your competence. You absorbed the brunt of complex decisions with integrity and patience.',
    },
    action: {
      title: 'Define your "done for today" criteria every morning at 9:00 AM.',
      text: 'Pick two non-negotiable items and treat everything else as a bonus. When those two are complete, allow yourself to mentally log off without guilt.',
      sourceEntryId: '1',
      sourceEntryTitle: 'Making room for what matters',
    },
    positive: {
      text: 'Even when the code would not cooperate, you refused to sacrifice your evening rest. That restraint showed immense maturity.',
      celebration: '★ Pat on the back: You held firm to your health boundary and logged 3 restorative evening walks.',
    },
  },
  {
    id: 'week-2',
    weekNumber: 2,
    weekLabel: 'Week 2',
    dateRange: 'Monday, Aug 17 – Sunday, Aug 23, 2026',
    theme: 'Creative Breakthrough',
    summary: 'Momentum took hold as initial blockers gave way to creative flow and testable milestones.',
    direction: 'Translating creative breakthroughs into systematic, repeatable habits.',
    goalProgress: {
      goalTitle: 'Build Mindful Journaling Habit',
      milestone: 'Completed prototype validation 2 days ahead of schedule',
      status: 'completed',
      note: 'Validating foundational ideas with confidence.',
    },
    standout: {
      title: 'The rhythm of deep work returned.',
      text: 'A surge of flow and focus marked your entries. An experiment that seemed risky the prior week began showing positive results, validating your foundational instincts.',
    },
    load: {
      text: 'Excitement can bring its own form of exhaustion. You noticed difficulty unwinding at night because creative ideas kept racing through your mind.',
      consolation: 'An energized mind is a wonderful gift, but your sleep remains essential. Keep a paper notepad beside your bed to safely deposit late-night ideas.',
    },
    action: {
      title: 'Document the "why" behind your current solution.',
      text: 'Spend 15 minutes writing a brief architectural note so your future self can appreciate the rationale when constraints inevitably change.',
      sourceEntryId: '2',
      sourceEntryTitle: 'A small step, a clearer direction',
    },
    positive: {
      text: 'You proved that steady incremental focus pays compound dividends. The prototype is now tangible and working.',
      celebration: '★ Pat on the back: Goal milestone "Functional Prototype Verified" achieved with flying colors!',
    },
  },
  {
    id: 'week-1',
    weekNumber: 1,
    weekLabel: 'Week 1',
    dateRange: 'Monday, Aug 10 – Sunday, Aug 16, 2026',
    theme: 'New Beginnings & Intention',
    summary: 'Establishing new ground, articulating your core intentions, and taking the first courageous steps.',
    direction: 'Laying the foundation for a month of mindful reflection and purposeful achievement.',
    goalProgress: {
      goalTitle: 'Personal Growth Foundation',
      milestone: 'Initialized reflective journal and defined core priorities',
      status: 'completed',
      note: 'Took the brave first step without waiting for perfection.',
    },
    standout: {
      title: 'Setting the compass on your terms.',
      text: 'You inaugurated your journal and framed what success looks like on your own terms. Rather than adopting someone else\'s playbook, you chose intentional simplicity.',
    },
    load: {
      text: 'Starting anything new triggers subtle self-doubt: "Will I stick with this? Am I focusing on the right things?" These uncertainties are universal.',
      consolation: 'Every great journey begins with an imperfect first step. Showing up to write your first reflection was already a meaningful victory.',
    },
    action: {
      title: 'Keep your reflection prompt open in your morning workspace.',
      text: 'Pair your morning beverage with a two-sentence reflection before opening email or distracting news feeds.',
      sourceEntryId: '3',
      sourceEntryTitle: 'The things a good conversation changes',
    },
    positive: {
      text: 'You showed up for yourself. You created a dedicated space for your thoughts and committed to quiet honesty.',
      celebration: '★ Pat on the back: Goal initialized, intention anchored, and habit planted with care.',
    },
  },
];

export function generateLocalThreadsFallback(
  entries: Array<{ id: string; title: string; date: string; text: string; tag?: string }>
): RecurringThread[] {
  if (!entries || entries.length === 0) return [];

  const threads: RecurringThread[] = [];

  // Theme 1: Focus & Momentum
  const momentumEntries = entries.filter((e) =>
    /(project|work|build|code|tech|plan|goal|step|future|test)/i.test(`${e.title} ${e.text} ${e.tag || ''}`)
  );
  if (momentumEntries.length > 0) {
    threads.push({
      id: 'momentum-and-craft',
      title: 'Building momentum in meaningful projects',
      copy: `Reflections on technical focus, building milestones, and purposeful progress appear across ${momentumEntries.length} of your entries.`,
      tag: 'Focus & Progress',
      entryIds: momentumEntries.map((e) => e.id),
    });
  }

  // Theme 2: Presence & Balance
  const balanceEntries = entries.filter((e) =>
    /(walk|quiet|morning|peace|calm|phone|space|think|breathe|break|friend|rest)/i.test(`${e.title} ${e.text} ${e.tag || ''}`)
  );
  if (balanceEntries.length > 0) {
    threads.push({
      id: 'presence-and-space',
      title: 'Making room for quiet perspective',
      copy: `Moments of reflection, stepping back from noise, and finding mental clarity appear across ${balanceEntries.length} entries.`,
      tag: 'Mindful Space',
      entryIds: balanceEntries.map((e) => e.id),
    });
  }

  // Fallback if no keyword matches or single entry
  if (threads.length === 0) {
    threads.push({
      id: 'unfolding-journey',
      title: 'Exploring what matters most right now',
      copy: `Themes of continuous learning and intentional reflection appear in your recent journal thoughts.`,
      tag: 'Personal Growth',
      entryIds: entries.slice(0, 3).map((e) => e.id),
    });
  }

  return threads;
}

export function generateLocalReviewFallback(
  entries: Array<{ id: string; title: string; date: string; text: string; tag?: string }>
): WeeklyReviewData {
  const firstEntry = entries[0];
  const count = entries.length;

  return {
    id: 'current-week',
    weekNumber: 4,
    weekLabel: 'Week 4',
    dateRange: 'Monday – Sunday (Recent Reflections)',
    theme: 'Grounded Perspective & Growth',
    summary: count > 0
      ? `You actively documented ${count} key reflections, balancing creative focus, personal commitments, and intentional pauses.`
      : 'A calm space ready to synthesize your reflections across the upcoming week.',
    direction: 'Moving towards sustained personal clarity, manageable next steps, and celebrating quiet wins.',
    goalProgress: {
      goalTitle: 'Daily Reflective Awareness',
      milestone: firstEntry ? `Reflected on "${firstEntry.title}"` : 'Formulated personal goals',
      status: 'completed',
      note: 'Maintaining an honest dialogue with yourself.',
    },
    standout: {
      title: firstEntry ? `Perspectives from "${firstEntry.title}"` : 'A week of quiet reflection',
      text: count > 0
        ? `Your reflections show an intentional effort to document progress, maintain clarity, and reflect on what matters across ${count} entries.`
        : 'Take time to write a few entries to capture your week in perspective.',
    },
    load: {
      text: 'Managing evolving responsibilities, active projects, and daily commitments naturally occupies substantial mental energy.',
      consolation: 'Remember that feeling stretched is proof of your ambition and care, not a failure. You navigated every obstacle with calm integrity.',
    },
    action: {
      title: 'Carve out 20 minutes of quiet, unpressured focus.',
      text: firstEntry
        ? `Inspired by "${firstEntry.title}", take one small manageable step without the pressure of completing everything at once.`
        : 'Choose one small intentional step to focus on today.',
      sourceEntryId: firstEntry?.id,
      sourceEntryTitle: firstEntry?.title,
    },
    positive: {
      text: 'You made space to pause and put your thoughts into writing — a meaningful practice of self-awareness.',
      celebration: '★ Pat on the back: You prioritized mindful reflection and gave yourself permission to learn and evolve.',
    },
  };
}

export async function analyzeRecurringThreads(
  entries: Array<{ id: string; title: string; date: string; text: string; tag?: string }>
): Promise<{ threads: RecurringThread[]; modelUsed?: string }> {
  try {
    const idToken = await getAuthToken().catch(() => null);
    if (!idToken) {
      return { threads: generateLocalThreadsFallback(entries), modelUsed: 'local-demo' };
    }

    const response = await fetch('/api/gemini/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ entries }),
    });

    if (!response.ok) {
      return { threads: generateLocalThreadsFallback(entries), modelUsed: 'local-fallback' };
    }

    const data = (await response.json()) as any;
    return {
      threads: Array.isArray(data?.threads) && data.threads.length > 0 ? data.threads : generateLocalThreadsFallback(entries),
      modelUsed: data?.modelUsed,
    };
  } catch (err) {
    console.warn('Threads analysis fallback:', err);
    return { threads: generateLocalThreadsFallback(entries), modelUsed: 'local-fallback' };
  }
}

export async function generateWeeklyReview(
  entries: Array<{ id: string; title: string; date: string; text: string; tag?: string }>
): Promise<{ review: WeeklyReviewData; modelUsed?: string }> {
  try {
    const idToken = await getAuthToken().catch(() => null);
    if (!idToken) {
      return { review: generateLocalReviewFallback(entries), modelUsed: 'local-demo' };
    }

    const response = await fetch('/api/gemini/review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ entries }),
    });

    if (!response.ok) {
      return { review: generateLocalReviewFallback(entries), modelUsed: 'local-fallback' };
    }

    const data = (await response.json()) as any;
    return {
      review: data?.review || generateLocalReviewFallback(entries),
      modelUsed: data?.modelUsed,
    };
  } catch (err) {
    console.warn('Weekly review generation fallback:', err);
    return { review: generateLocalReviewFallback(entries), modelUsed: 'local-fallback' };
  }
}

