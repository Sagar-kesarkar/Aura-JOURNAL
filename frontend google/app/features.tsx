'use client';
/* oxlint-disable react/react-compiler -- Synchronizes route-selected drafts and MediaRecorder lifecycle; experimental compiler lint also reports an internal invariant on the recording closure. */
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Download,
  GitBranch,
  Mic,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Palette,
  RefreshCw,
  Heart,
  Trophy,
  Calendar,
} from 'lucide-react';
import {
  analyzeRecurringThreads,
  generateWeeklyReview,
  generateLocalThreadsFallback,
  generateLocalReviewFallback,
  demoWeeklyReviews,
  type RecurringThread,
  type WeeklyReviewData,
} from '../lib/api';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardMotif } from '@/components/background-motif';
import {
  type Entry,
  type Preferences,
  type ThemeId,
  type MotifId,
  themeList,
  motifList,
  modes,
  formatEntryDate,
} from './journal-data';
const disclaimer =
  "This isn't medical or therapeutic advice — for ongoing stress or difficulty, a professional is a better source of support than a summary of your own notes.";
export function Features({
  view,
  navigate,
  entries,
  update,
  deleteEntry,
  notify,
  preferences,
  patchPreferences,
  clearDrafts,
}: {
  view: string;
  navigate: (v: string) => void;
  entries: Entry[];
  update: (e: Entry[]) => boolean;
  deleteEntry?: (id: string) => Promise<boolean>;
  notify: (s: string) => void;
  preferences: Preferences;
  patchPreferences: (p: Partial<Preferences>) => boolean;
  clearDrafts: () => void;
}) {
  const [query, setQuery] = useState('');
  const [threadFilter, setThreadFilter] = useState('active');
  const [filter, setFilter] = useState('All modes');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [thread, setThread] = useState<string | null>(null);

  // Cross-entry Gemini Analysis State
  const [analyzedThreads, setAnalyzedThreads] = useState<RecurringThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReviewData | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('week-4');

  useEffect(() => {
    if (view === 'Welcome') {
      navigate('Overview');
    }
  }, [view, navigate]);

  // Load and cache recurring threads when on Recurring threads view
  useEffect(() => {
    if (view !== 'Recurring threads' || entries.length === 0) return;

    const cacheKey = 'aura-threads-cache-v2';
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.threads) && parsed.threads.length > 0 && parsed.entryCount === entries.length) {
          setAnalyzedThreads(parsed.threads);
          return;
        }
      }
    } catch {
      // cache miss
    }

    let mounted = true;
    setLoadingThreads(true);
    analyzeRecurringThreads(entries)
      .then((res) => {
        if (!mounted) return;
        setAnalyzedThreads(res.threads);
        setLoadingThreads(false);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ threads: res.threads, entryCount: entries.length }));
        } catch {}
      })
      .catch(() => {
        if (!mounted) return;
        setAnalyzedThreads(generateLocalThreadsFallback(entries));
        setLoadingThreads(false);
      });

    return () => {
      mounted = false;
    };
  }, [view, entries.length]);

  // Load and cache weekly review when on Weekly review view
  useEffect(() => {
    if (view !== 'Weekly review' || entries.length === 0) return;

    const cacheKey = 'aura-weekly-review-v2';
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.review && parsed.entryCount === entries.length) {
          setWeeklyReview(parsed.review);
          return;
        }
      }
    } catch {
      // cache miss
    }

    let mounted = true;
    setLoadingReview(true);
    generateWeeklyReview(entries)
      .then((res) => {
        if (!mounted) return;
        setWeeklyReview(res.review);
        setLoadingReview(false);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ review: res.review, entryCount: entries.length }));
        } catch {}
      })
      .catch(() => {
        if (!mounted) return;
        setWeeklyReview(generateLocalReviewFallback(entries));
        setLoadingReview(false);
      });

    return () => {
      mounted = false;
    };
  }, [view, entries.length]);

  const handleRefreshThreads = async () => {
    if (loadingThreads) return;
    setLoadingThreads(true);
    try {
      const res = await analyzeRecurringThreads(entries);
      setAnalyzedThreads(res.threads);
      try {
        localStorage.setItem('aura-threads-cache-v2', JSON.stringify({ threads: res.threads, entryCount: entries.length }));
      } catch {}
      notify('Recurring threads updated with Gemini analysis.');
    } catch (err: any) {
      notify('Could not refresh threads: ' + (err?.message || 'Please retry'));
    } finally {
      setLoadingThreads(false);
    }
  };

  const handleRefreshReview = async () => {
    if (loadingReview) return;
    setLoadingReview(true);
    try {
      const res = await generateWeeklyReview(entries);
      setWeeklyReview(res.review);
      try {
        localStorage.setItem('aura-weekly-review-v2', JSON.stringify({ review: res.review, entryCount: entries.length }));
      } catch {}
      notify('Weekly review updated with Gemini analysis.');
    } catch (err: any) {
      notify('Could not refresh review: ' + (err?.message || 'Please retry'));
    } finally {
      setLoadingReview(false);
    }
  };
  const { statuses, feedback, weekly, cadence, concept, theme, backgroundMotif } = preferences;
  const setFeedback = (feedback: string) => patchPreferences({ feedback });
  const setWeekly = (weekly: boolean) => patchPreferences({ weekly });
  const setCadence = (cadence: string) => patchPreferences({ cadence });
  const setConcept = (concept: string) => patchPreferences({ concept });
  const activeTheme: ThemeId = theme || 'sage';
  const activeMotif: MotifId = backgroundMotif || 'none';
  const setTheme = (t: ThemeId) => {
    patchPreferences({ theme: t });
    notify(`Atmosphere set to ${themeList.find((item) => item.id === t)?.name || t}.`);
  };
  const setMotif = (m: MotifId) => {
    patchPreferences({ backgroundMotif: m });
    notify(`Corner artwork set to ${motifList.find((item) => item.id === m)?.name || m}.`);
  };
  function deleteConfirmed() {
    if (confirm === 'all') {
      if (update([])) {
        clearDrafts();
        patchPreferences({
          statuses: { balance: 'dismissed', creative: 'dismissed' },
          feedback: '',
        });
        notify('All journal entries and drafts removed from this device.');
        navigate('Overview');
      }
    } else if (confirm?.startsWith('thread:')) {
      const [, id, status] = confirm.split(':');
      if (patchPreferences({ statuses: { ...statuses, [id]: status } })) {
        setThread(null);
        notify('Thread status updated.');
      }
    } else if (confirm) {
      if (deleteEntry) {
        deleteEntry(confirm);
      } else {
        update(entries.filter((e) => e.id !== confirm));
      }
      notify('Entry deleted.');
      navigate('History');
    }
    setConfirm(null);
  }
  function exportData() {
    try {
      const blob = new Blob(
        [
          JSON.stringify(
            { format: 'Aura Journal personal export', entries },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aura-journal-export.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Journal JSON export downloaded.');
    } catch {
      notify('Export failed. Your entries are still available.');
    }
  }
  function exportMarkdown() {
    try {
      const md = entries
        .map((e) => {
          const header = `# ${e.title || 'Untitled Thought'}\n\n**Date:** ${formatEntryDate(e)} | **Mode:** ${e.mode} | **Tag:** ${e.tag}\n\n${e.text}\n`;
          const conversation = (e.messages || [])
            .map((m) => {
              const speaker =
                m.role === 'model'
                  ? `> **Aura AI (${m.modelUsed || 'Reflection'})**`
                  : `> **Your Follow-Up**`;
              return `${speaker}\n> ${m.text.replace(/\n/g, '\n> ')}\n`;
            })
            .join('\n');
          return (
            header +
            (conversation ? `\n### Reflections & Insights\n\n${conversation}` : '')
          );
        })
        .join('\n\n---\n\n');

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aura-journal-export.md';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Markdown journal export downloaded.');
    } catch {
      notify('Export failed. Your entries are still available.');
    }
  }
  return (
    <div className="features">
      <button className="back-button" onClick={() => navigate('Overview')}>
        <ArrowLeft size={16} /> Back to overview
      </button>
      {view === 'History' ? (
        <>
          <div className="feature-title">
            <div>
              <div className="eyebrow">YOUR WORDS, OVER TIME</div>
              <h1>Every entry has a place.</h1>
            </div>
            <button className="primary" onClick={() => navigate('New entry')}>
              <Plus size={17} /> New entry
            </button>
          </div>
          <div className="search-row">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="Search entries"
                placeholder="Search titles or your words…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
              <SelectTrigger aria-label="Filter entries by reflection mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['All modes', ...modes].map((m) => (
                  <SelectItem value={m} key={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="history-list">
            {entries
              .filter(
                (e) =>
                  ((e.title || '') + ' ' + (e.text || ''))
                    .toLowerCase()
                    .includes(query.toLowerCase()) &&
                  (filter === 'All modes' || e.mode === filter),
              )
              .map((e) => (
                <button key={e.id} onClick={() => navigate('entry:' + e.id)}>
                  <span className="thread-icon">
                    <BookOpen size={20} />
                  </span>
                  <div>
                    <h3>{e.title || 'Untitled thought'}</h3>
                    <p>{e.text || ''}</p>
                    <small>
                      {formatEntryDate(e)} · {e.mode || 'Reflection'}
                    </small>
                  </div>
                  <ArrowUpRight size={18} />
                </button>
              ))}
            {!entries.some(
              (e) =>
                ((e.title || '') + ' ' + (e.text || ''))
                  .toLowerCase()
                  .includes(query.toLowerCase()) &&
                (filter === 'All modes' || e.mode === filter),
            ) && (
              <div className="empty-state">
                <Search />
                <h2>
                  {entries.length
                    ? 'No matching thoughts.'
                    : 'Your story starts here.'}
                </h2>
                <p>
                  {entries.length
                    ? 'Try a different word or reflection mode.'
                    : 'Write your first entry whenever you’re ready.'}
                </p>
                <button
                  className="secondary"
                  onClick={() => {
                    setQuery('');
                    setFilter('All modes');
                    if (!entries.length) navigate('New entry');
                  }}
                >
                  {entries.length ? 'Clear filters' : 'Write an entry'}
                </button>
              </div>
            )}
          </div>
        </>
      ) : view === 'Recurring threads' ? (
        <>
          <div className="eyebrow">NOTICING, WITHOUT JUDGING</div>
          <h1>The threads that connect.</h1>
          <p className="intro">
            Topics you return to can tell a story of their own.
          </p>

          <div className="gemini-connection-status">
            <div className="gemini-status-left">
              <Sparkles size={16} />
              <span>
                {loadingThreads
                  ? 'Connecting to Gemini to analyze recurring themes across reflections…'
                  : `Connected to Gemini · Analyzed across ${entries.length} personal ${entries.length === 1 ? 'reflection' : 'reflections'}`}
              </span>
            </div>
            <button
              className="secondary small"
              onClick={handleRefreshThreads}
              disabled={loadingThreads || entries.length === 0}
            >
              <RefreshCw size={13} className={loadingThreads ? 'spin' : ''} />
              {loadingThreads ? 'Analyzing…' : 'Re-analyze with Gemini'}
            </button>
          </div>

          <Tabs
            value={threadFilter}
            onValueChange={(v) => setThreadFilter(String(v))}
          >
            <TabsList aria-label="Filter recurring threads">
              <TabsTrigger value="active">Active threads</TabsTrigger>
              <TabsTrigger value="all">All threads</TabsTrigger>
            </TabsList>
          </Tabs>

          {(() => {
            const currentThreads =
              analyzedThreads.length > 0
                ? analyzedThreads
                : generateLocalThreadsFallback(entries);
            const visibleThreads = currentThreads.filter(
              (t) =>
                threadFilter === 'all' ||
                !statuses[t.id] ||
                statuses[t.id] === 'active',
            );

            if (visibleThreads.length === 0) {
              return (
                <div className="empty-state">
                  <GitBranch />
                  <h2>No active threads.</h2>
                  <p>Resolved and dismissed threads are in All threads.</p>
                </div>
              );
            }

            return visibleThreads.map((t) => (
              <section className="thread-detail-card" key={t.id}>
                <span className="thread-icon">
                  <GitBranch size={23} />
                </span>
                <div>
                  <span className="tag">
                    {statuses[t.id]
                      ? statuses[t.id].toUpperCase()
                      : t.tag || 'Active thread'}
                  </span>
                  <h2>{t.title}</h2>
                  <p>{t.copy}</p>
                  <button
                    className="text-button"
                    onClick={() => setThread(t.id)}
                  >
                    View contributing entries ({t.entryIds ? t.entryIds.length : entries.length}){' '}
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="thread-actions">
                  {statuses[t.id] && statuses[t.id] !== 'active' && (
                    <button
                      className="secondary"
                      onClick={() => setConfirm('thread:' + t.id + ':active')}
                    >
                      Reopen thread
                    </button>
                  )}
                  <button
                    className="secondary"
                    onClick={() => setConfirm('thread:' + t.id + ':resolved')}
                  >
                    Mark resolved
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setConfirm('thread:' + t.id + ':dismissed')}
                  >
                    Dismiss
                  </button>
                </div>
              </section>
            ));
          })()}

          <p className="muted-copy">
            Recurring threads are synthesized dynamically by Gemini from your personal journal entries.
          </p>
        </>
      ) : view === 'Weekly review' ? (
        <>
          <div className="eyebrow">
            <Sparkles size={16} /> YOUR WEEK, IN PERSPECTIVE
          </div>
          <div className="feature-title">
            <h1>A little distance. A little clarity.</h1>
            <button className="secondary" onClick={() => navigate('Settings')}>
              Review settings
            </button>
          </div>

          <div className="gemini-connection-status">
            <div className="gemini-status-left">
              <Sparkles size={16} />
              <span>
                {loadingReview
                  ? 'Synthesizing your reflections into a weekly review with Gemini…'
                  : `Connected to Gemini · ${weeklyReview?.dateRange || 'Personal weekly synthesis'}`}
              </span>
            </div>
            <button
              className="secondary small"
              onClick={handleRefreshReview}
              disabled={loadingReview || entries.length === 0}
            >
              <RefreshCw size={13} className={loadingReview ? 'spin' : ''} />
              {loadingReview ? 'Synthesizing…' : 'Regenerate Review'}
            </button>
          </div>

          {(() => {
            const baseWeeks = [...demoWeeklyReviews];
            if (weeklyReview) {
              baseWeeks[0] = {
                ...baseWeeks[0],
                ...weeklyReview,
                weekLabel: baseWeeks[0].weekLabel || 'Week 4',
                dateRange: weeklyReview.dateRange || baseWeeks[0].dateRange,
                summary: weeklyReview.summary || baseWeeks[0].summary,
                direction: weeklyReview.direction || baseWeeks[0].direction,
                theme: weeklyReview.theme || baseWeeks[0].theme,
                goalProgress: weeklyReview.goalProgress || baseWeeks[0].goalProgress,
                standout: weeklyReview.standout || baseWeeks[0].standout,
                load: {
                  ...baseWeeks[0].load,
                  ...weeklyReview.load,
                },
                action: {
                  ...baseWeeks[0].action,
                  ...weeklyReview.action,
                },
                positive: {
                  ...baseWeeks[0].positive,
                  ...weeklyReview.positive,
                },
              };
            }

            const activeReview =
              baseWeeks.find((w) => w.id === selectedWeekId) ||
              baseWeeks[0];

            return (
              <>
                {/* Week 1, Week 2, Week 3, Week 4 Perspective Banners */}
                <div className="week-banners-container">
                  <div className="week-banners-header">
                    <div>
                      <span className="eyebrow-small">
                        SELECT A WEEKLY PERSPECTIVE
                      </span>
                      <h3>Week-by-Week Reflections</h3>
                    </div>
                    <span className="week-count-badge">4 Weeks Synthesized</span>
                  </div>

                  <div
                    className="week-banners-grid"
                    role="tablist"
                    aria-label="Select perspective week"
                  >
                    {baseWeeks.map((w) => {
                      const isSelected = w.id === activeReview.id;
                      return (
                        <button
                          key={w.id}
                          role="tab"
                          aria-selected={isSelected}
                          className={`week-banner-card ${isSelected ? 'active' : ''}`}
                          onClick={() => setSelectedWeekId(w.id || 'week-4')}
                        >
                          <div className="week-banner-top">
                            <span className="week-badge">{w.weekLabel}</span>
                            <span className="week-theme-pill">{w.theme}</span>
                          </div>
                          <div className="week-date-range">{w.dateRange}</div>
                          <p className="week-banner-summary">{w.summary}</p>
                          <div className="week-banner-footer">
                            <span className="week-view-indicator">
                              {isSelected
                                ? 'Currently viewing ↓'
                                : 'Click to view perspective →'}
                            </span>
                            {w.goalProgress && (
                              <span className="week-goal-tag">
                                <Check size={11} /> Goal progress
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="active-week-hero">
                  <div className="active-week-meta">
                    <span className="week-hero-tag">
                      {activeReview.weekLabel}
                    </span>
                    <h2>{activeReview.theme}</h2>
                    <span className="week-hero-dates">
                      <Calendar size={14} /> {activeReview.dateRange}
                    </span>
                  </div>
                  <p className="active-week-direction">
                    <strong>Where things are heading:</strong>{' '}
                    {activeReview.direction}
                  </p>
                </div>

                <div className="review-page">
                  <section>
                    <span className="section-number">01 / WHAT STOOD OUT</span>
                    <h2>{activeReview.standout.title}</h2>
                    <p>{activeReview.standout.text}</p>
                  </section>
                  <section>
                    <span className="section-number">
                      02 / WHERE THE LOAD IS COMING FROM
                    </span>
                    <p>{activeReview.load.text}</p>
                    {activeReview.load.consolation && (
                      <div className="morale-consolation-card">
                        <Heart size={18} className="morale-heart-icon" />
                        <div>
                          <span className="morale-title">
                            Perspective & Morale Reassurance
                          </span>
                          <p>{activeReview.load.consolation}</p>
                        </div>
                      </div>
                    )}
                  </section>
                  <section>
                    <span className="section-number">
                      03 / ONE SMALL THING TO TRY
                    </span>
                    <h2>{activeReview.action.title}</h2>
                    <p>{activeReview.action.text}</p>
                    {activeReview.action.sourceEntryId && (
                      <button
                        className="text-button"
                        onClick={() => {
                          const e = entries.find(
                            (item) => item.id === activeReview.action.sourceEntryId,
                          );
                          if (e) navigate('entry:' + e.id);
                          else if (entries[0])
                            navigate('entry:' + entries[0].id);
                          else notify('Source reflection opened.');
                        }}
                      >
                        <BookOpen size={15} /> From “
                        {activeReview.action.sourceEntryTitle ||
                          entries[0]?.title ||
                          'Recent reflection'}
                        ” <ArrowUpRight size={15} />
                      </button>
                    )}
                  </section>
                  <section className="positive-note">
                    <span className="section-number">
                      04 / SOMETHING THAT WENT WELL
                    </span>
                    <p>{activeReview.positive.text}</p>
                    {activeReview.positive.celebration && (
                      <div className="morale-celebration-card">
                        <Trophy size={18} className="morale-trophy-icon" />
                        <div>
                          <span className="celebration-title">
                            Pat on the Back & Goal Progress
                          </span>
                          <p>{activeReview.positive.celebration}</p>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </>
            );
          })()}

          <p className="review-disclaimer">{disclaimer}</p>
          <div className="feedback">
            <span>Was this Gemini review useful?</span>
            {['Helpful', 'Not helpful'].map((f) => (
              <button
                key={f}
                className={feedback === f ? 'primary' : 'secondary'}
                onClick={() => setFeedback(f)}
              >
                {feedback === f && <Check size={15} />} {f}
              </button>
            ))}
            {feedback && <small>Feedback saved on this device.</small>}
          </div>
          <details className="review-history">
            <summary>Review history</summary>
            <p>
              Gemini analyzes all recent reflections to synthesize your weekly perspective.
            </p>
          </details>
        </>
      ) : view === 'Settings' ? (
        <>
          <div className="eyebrow">MAKE THIS SPACE YOURS</div>
          <h1>Settings & privacy.</h1>

          <section className="settings-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Palette size={20} className="text-primary" />
              <h2 style={{ margin: 0 }}>Color Theme & Atmosphere</h2>
            </div>
            <p>
              Personalize the palette and mood of your workspace. Choose between calming forest greens, ocean cyans, warm parchment beige, twilight lavender, or midnight focus.
            </p>
            <div className="theme-grid">
              {themeList.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`theme-card ${activeTheme === t.id ? 'active' : ''}`}
                  onClick={() => setTheme(t.id)}
                  aria-pressed={activeTheme === t.id}
                >
                  <div className="theme-swatch-bar" style={{ background: t.bg, borderColor: t.border }}>
                    <span className="theme-swatch-dot" style={{ background: t.primary }} />
                    <span className="theme-swatch-dot" style={{ background: t.accent }} />
                    <span className="theme-swatch-dot" style={{ background: t.border }} />
                  </div>
                  <div className="theme-card-body">
                    <div className="theme-card-header">
                      <strong>{t.name}</strong>
                      {activeTheme === t.id && (
                        <span className="theme-active-pill">
                          <Check size={11} /> Active
                        </span>
                      )}
                    </div>
                    <p>{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Sparkles size={20} className="text-primary" />
              <h2 style={{ margin: 0 }}>Artistic Corner Artwork & Florals</h2>
            </div>
            <p>
              Embellish the corners of your journal background with delicate botanical wildflowers, vintage Victorian filigree, or celestial stars.
            </p>
            <div className="motif-grid">
              {motifList.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`motif-card ${activeMotif === m.id ? 'active' : ''}`}
                  onClick={() => setMotif(m.id)}
                  aria-pressed={activeMotif === m.id}
                >
                  <div className="motif-icon-wrap">
                    <span className="motif-emoji">{m.icon}</span>
                  </div>
                  <div className="motif-card-body">
                    <div className="motif-card-header">
                      <strong>{m.name}</strong>
                      {activeMotif === m.id && (
                        <span className="theme-active-pill">
                          <Check size={11} /> Selected
                        </span>
                      )}
                    </div>
                    <p>{m.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-card">
            <h2>Your data, your choice.</h2>
            <p>
              This is an unauthenticated frontend demo. Entries are stored in
              this browser’s local storage, without encryption or cloud backup.
              Use sample writing only. Voice recordings stay in memory and are
              discarded when closed.
            </p>
            <div className="setting-row">
              <span>Export personal journal records</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="secondary" onClick={exportData} title="Export JSON">
                  <Download size={16} /> JSON
                </button>
                <button className="secondary" onClick={exportMarkdown} title="Export Markdown">
                  <Download size={16} /> Markdown
                </button>
              </div>
            </div>
            <div className="setting-row">
              <span>Remove all entries from this device</span>
              <button
                className="secondary danger-text"
                onClick={() => setConfirm('all')}
              >
                <Trash2 size={16} /> Delete all data
              </button>
            </div>
          </section>
          <section className="settings-card">
            <h2>Weekly Life Review</h2>
            <p>
              Preferences are saved on this device. Scheduled generation still
              requires the backend.
            </p>
            <div className="setting-row">
              <label htmlFor="weekly">
                Enable weekly reviews (demo preference)
              </label>
              <Switch
                id="weekly"
                checked={weekly}
                onCheckedChange={setWeekly}
              />
            </div>
            <div className="setting-row">
              <span>Preferred review day</span>
              <Select value={cadence} onValueChange={(v) => v && setCadence(v)}>
                <SelectTrigger aria-label="Review day" disabled={!weekly}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Sunday', 'Monday', 'Friday', 'Saturday'].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>
          <section className="settings-card">
            <h2>Reflection preferences</h2>
            <p>Device-local preferences for the future connected service.</p>
            <div className="setting-row">
              <label htmlFor="review-time">Review time (your local time)</label>
              <input
                id="review-time"
                type="time"
                value={preferences.reviewTime}
                onChange={(e) =>
                  patchPreferences({ reviewTime: e.target.value })
                }
              />
            </div>
            <div className="setting-row">
              <span>Recurring thread lookback</span>
              <Select
                value={preferences.windowDays}
                onValueChange={(v) => v && patchPreferences({ windowDays: v })}
              >
                <SelectTrigger aria-label="Thread lookback window">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['30', '45', '60'].map((d) => (
                    <SelectItem value={d} key={d}>
                      {d} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>
          <section className="settings-card">
            <h2>Design directions</h2>
            <p>
              Compare six workspace treatments using the same sample entry,
              thread, and weekly review. Modern Notebook emphasizes writing;
              Conversation emphasizes dialogue; Voice makes recording central;
              Cards gives insights more space; Timeline orders moments; Focus
              removes navigation.
            </p>
            <div className="concept-buttons">
              {[
                'Conversation',
                'Voice',
                'Modern Notebook',
                'Cards',
                'Timeline',
                'Focus',
              ].map((c) => (
                <button
                  key={c}
                  className={concept === c ? 'primary' : 'secondary'}
                  onClick={() => setConcept(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div
              className={
                'concept-preview concept-' +
                concept.toLowerCase().replace(' ', '-')
              }
            >
              <span className="eyebrow">{concept} / RESPONSIVE CONCEPT</span>
              <h2>Making room for what matters</h2>
              <div className="concept-content">
                <article>
                  <span>01 · JOURNAL</span>
                  <p>
                    I took a walk without my phone this morning. There was more
                    space to think.
                  </p>
                  {concept === 'Voice' && (
                    <button
                      className="primary"
                      onClick={() => navigate('Voice reflection')}
                    >
                      <Mic size={18} /> Record a thought
                    </button>
                  )}
                  {concept === 'Conversation' && (
                    <blockquote>
                      Sample prompt: What would you like to make more room for?
                    </blockquote>
                  )}
                </article>
                <article>
                  <span>02 · RECURRING THREAD</span>
                  <h3>Making room for yourself</h3>
                  <p>Mentioned in three fictional entries.</p>
                </article>
                <article>
                  <span>03 · WEEKLY REVIEW</span>
                  <h3>Finding space in a full week.</h3>
                  <p>Try a 20-minute slot for the next project step.</p>
                  <small>Fictional sample. {disclaimer}</small>
                </article>
              </div>
            </div>
          </section>
          <section className="settings-card">
            <h2>Google account</h2>
            <p>
              Firebase Authentication has not been connected. This demo does not
              represent a signed-in Google account.
            </p>
            <button className="secondary" onClick={() => navigate('Welcome')}>
              Leave demo / sign in <ArrowRight size={16} />
            </button>
          </section>
        </>
      ) : (
        <>
          <div className="empty-state">
            <BookOpen />
            <h2>Return to your overview.</h2>
            <p>Choose a section from the navigation to continue.</p>
            <button className="primary" onClick={() => navigate('Overview')}>
              Open Overview
            </button>
          </div>
        </>
      )}
      <Dialog open={!!thread} onOpenChange={(o) => !o && setThread(null)}>
        <DialogContent className="aura-dialog">
          {(() => {
            const currentThreads =
              analyzedThreads.length > 0
                ? analyzedThreads
                : generateLocalThreadsFallback(entries);
            const selected = currentThreads.find((t) => t.id === thread);
            const contributing = selected
              ? entries.filter((e) => selected.entryIds?.includes(e.id))
              : [];
            const displayList =
              contributing.length > 0
                ? contributing
                : entries.slice(0, 3);

            return (
              <>
                <DialogTitle>Contributing reflections</DialogTitle>
                <DialogDescription>
                  {selected
                    ? `Personal journal reflections connecting to "${selected.title}".`
                    : 'Personal journal reflections connecting to this thread.'}
                </DialogDescription>
                {displayList.length > 0 ? (
                  displayList.map((e) => (
                    <div
                      className="source-entry clickable"
                      key={e.id}
                      onClick={() => {
                        setThread(null);
                        navigate('entry:' + e.id);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <BookOpen size={17} />
                      <div>
                        <h3>{e.title || 'Untitled reflection'}</h3>
                        <p>{e.text.slice(0, 140)}…</p>
                        <small>{formatEntryDate(e)} · Click to open reflection →</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted-copy">No contributing reflections found.</p>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            {confirm?.startsWith('thread:')
              ? 'Update this sample thread?'
              : confirm === 'all'
                ? 'Delete all device-local entries?'
                : 'Delete this entry?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirm?.startsWith('thread:')
              ? 'This changes its status on this device. Your entries remain available.'
              : 'This cannot be undone. Export any writing you want to keep before deleting.'}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <button className="primary" onClick={deleteConfirmed}>
              {confirm?.startsWith('thread:') ? 'Confirm' : 'Delete'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

