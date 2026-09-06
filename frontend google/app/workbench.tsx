'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Feather,
  GitBranch,
  Maximize2,
  Mic,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  X,
  PenLine,
  MessageSquareQuote,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { VoiceDialog } from './voice-dialog';
import {
  emptyDraft,
  remainingDraftAfterSave,
  mergeTranscript,
  modes,
  formatEntryDate,
  type Draft,
  type Entry,
  type JournalMessage,
} from './journal-data';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { reflectWithGemini } from '../lib/api';
const sampleReflection =
  'You noticed something in that quiet walk: a little less input made room for your own thoughts. It sounds like you’re not looking to do more, but to leave a little space in what you already do.';
export function Workbench({
  entry,
  draft,
  patch,
  saveEntries,
  entries,
  removeDraft,
  navigate,
  focus,
  setFocus,
  threadStatus,
  initialVoice = false,
  saveDraft,
  deleteEntry,
}: {
  entry?: Entry;
  draft: Draft;
  patch: (patch: Partial<Draft>) => void;
  saveEntries: (e: Entry[]) => boolean;
  entries: Entry[];
  removeDraft: () => void;
  navigate: (v: string) => void;
  focus: boolean;
  setFocus: (v: boolean) => void;
  threadStatus: Record<string, string>;
  initialVoice?: boolean;
  saveDraft: (id: string, d: Draft) => void;
  deleteEntry?: (id: string) => Promise<boolean>;
}) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState('writing');
  const [voice, setVoice] = useState(initialVoice);
  const [insights, setInsights] = useState(false);
  const [remove, setRemove] = useState(false);
  const [error, setError] = useState('');
  const [isReflecting, setIsReflecting] = useState(false);
  const [speech, setSpeech] = useState('stopped');
  const [rate, setRate] = useState('1');
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const wordCount = draft.body.trim().split(/\s+/).filter(Boolean).length;
  const original = emptyDraft(entry);
  const changed =
    draft.title !== original.title ||
    draft.body !== original.body ||
    draft.mode !== original.mode;
  const sample = entry?.id === '1' && !!entry?.sample && !changed;
  useEffect(
    () => () => {
      if (speechRef.current && typeof window !== 'undefined')
        window.speechSynthesis?.cancel();
    },
    [],
  );
  function save(includeFollowup = false) {
    if (!draft.body.trim()) {
      setError('Write a thought before saving your entry.');
      return;
    }
    if (draft.body.length > 30000 || draft.followup.length > 10000) {
      setError(
        'Keep an entry under 30,000 characters and a follow-up under 10,000. Your draft has been preserved.',
      );
      return;
    }
    const now = new Date().toISOString();
    const next: Entry = {
      id: entry?.id || crypto.randomUUID(),
      title: draft.title.trim() || 'An untitled thought',
      text: draft.body.trim(),
      mode: draft.mode,
      tag: entry?.tag || 'Your reflection',
      date: new Date().toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      createdAt: entry?.createdAt || now,
      updatedAt: now,
      sample: !!entry?.sample && !changed,
      messages: [
        ...(entry?.messages || []),
        ...(includeFollowup && draft.followup.trim()
          ? [
              {
                id: crypto.randomUUID(),
                text: draft.followup.trim(),
                createdAt: now,
              },
            ]
          : []),
      ],
    };
    if (saveEntries([next, ...entries.filter((e) => e.id !== next.id)])) {
      removeDraft();
      const remaining = remainingDraftAfterSave(draft, next, includeFollowup);
      if (remaining) saveDraft(next.id, remaining);
      setError('');
      toast.success('Saved on this device.');
      navigate('entry:' + next.id);
    }
  }
  async function reflect() {
    const activeThought = (tab === 'conversation' && draft.followup.trim())
      ? draft.followup.trim()
      : draft.body.trim();

    if (!activeThought) {
      setError('Write a thought first.');
      inputRef.current?.focus();
      return;
    }

    if (!user || user.isAnonymous) {
      toast.error('Google Sign-In required: Please sign in with Google to use Gemini AI reflections.');
      setError('Google Sign-In is required to generate AI reflections via Gemini.');
      return;
    }

    setIsReflecting(true);
    setError('');

    try {
      // 1. Prepare structured dialogue history for Gemini API
      const conversationHistory: Array<{ role: 'user' | 'model'; content: string }> = [];

      // Include base journal writing
      if (draft.body.trim()) {
        conversationHistory.push({ role: 'user', content: draft.body.trim() });
      }

      // Include prior messages
      if (entry?.messages && entry.messages.length > 0) {
        for (const m of entry.messages) {
          conversationHistory.push({
            role: m.role === 'model' ? 'model' : 'user',
            content: m.text,
          });
        }
      }

      // Append new follow-up if in conversation view
      if (tab === 'conversation' && draft.followup.trim()) {
        conversationHistory.push({
          role: 'user',
          content: draft.followup.trim(),
        });
      }

      // 2. Call server-side protected Gemini reflection endpoint
      const response = await reflectWithGemini(
        conversationHistory,
        draft.mode,
        draft.title.trim() || undefined,
      );

      const now = new Date().toISOString();
      const newMessages: JournalMessage[] = [...(entry?.messages || [])];

      // Save user follow-up if typed
      if (tab === 'conversation' && draft.followup.trim()) {
        newMessages.push({
          id: crypto.randomUUID(),
          role: 'user',
          text: draft.followup.trim(),
          createdAt: now,
        });
      }

      // Add AI model reflection with exact model string
      newMessages.push({
        id: crypto.randomUUID(),
        role: 'model',
        text: response.reply,
        modelUsed: response.modelUsed,
        createdAt: now,
      });

      const updatedEntry: Entry = {
        id: entry?.id || crypto.randomUUID(),
        title: draft.title.trim() || 'An untitled thought',
        text: draft.body.trim(),
        mode: draft.mode,
        tag: entry?.tag || 'Your reflection',
        date: entry?.date || new Date().toLocaleDateString('en', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        createdAt: entry?.createdAt || now,
        updatedAt: now,
        sample: false,
        messages: newMessages,
      };

      // 3. Persist entry safely before clearing input
      if (saveEntries([updatedEntry, ...entries.filter((e) => e.id !== updatedEntry.id)])) {
        patch({ followup: '' });
        setTab('conversation');
        navigate('entry:' + updatedEntry.id);
        toast.success(`Reflected with ${response.modelUsed}`);
      }
    } catch (err: any) {
      console.error('Reflection error:', err);
      setError(
        err?.message || 'Failed to generate reflection from Gemini AI. Your text has been preserved. Please retry.',
      );
      toast.error('Reflection failed. Your draft was kept safe.');
    } finally {
      setIsReflecting(false);
    }
  }
  function speak() {
    if (!('speechSynthesis' in window)) {
      toast.error('Read aloud is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      sample ? sampleReflection : draft.body,
    );
    utterance.rate = Number(rate);
    utterance.onend = () => setSpeech('stopped');
    utterance.onerror = () => {
      setSpeech('stopped');
      toast.error('Read aloud could not play. The text is still available.');
    };
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeech('playing');
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        [
          draft.title,
          draft.body,
          ...(entry?.messages || []).map((m) => m.text || ''),
          draft.followup,
        ]
          .filter(Boolean)
          .join('\n\n'),
      );
      toast.success('Entry copied.');
    } catch {
      toast.error(
        'Clipboard access is unavailable. Select and copy the text manually.',
      );
    }
  }
  const insightContent = (
    <>
      <div className="insights-heading">
        <div className="insights-header">
          <div className="insights-header-meta">
            <span className="insights-eyebrow">A LITTLE PERSPECTIVE</span>
            <span className="insights-pill">AI Assisted</span>
          </div>
          <button
            onClick={() => setInsights(false)}
            aria-label="Close insights panel"
            title="Close insights"
            className="insights-close-button"
          >
            <X size={15} />
          </button>
        </div>
        <h2>Between the lines</h2>
        <p>
          {sample
            ? 'Fictional insights for this sample entry.'
            : 'Your words come first. Insights follow when Gemini is connected.'}
        </p>
      </div>
      <Tabs defaultValue="insight" className="insight-tabs">
        <TabsList aria-label="Reflection panels">
          <TabsTrigger value="insight">
            <Sparkles size={14} /> Insights
          </TabsTrigger>
          <TabsTrigger value="threads">
            <GitBranch size={14} /> Threads
          </TabsTrigger>
        </TabsList>
        <TabsContent value="insight">
          <section className="insight-block">
            <span className="insight-label">
              <BookOpen size={15} /> THE ESSENCE
            </span>
            <p>
              {sample
                ? 'Making room for quiet moments, even when the week feels full.'
                : 'Save an entry and connect Gemini to receive a grounded summary.'}
            </p>
          </section>
          <section className="insight-block">
            <span className="insight-label">THEMES TO NOTICE</span>
            {sample ? (
              <div className="theme-tags">
                <span>Making space</span>
                <span>Intentional time</span>
                <span>Everyday balance</span>
              </div>
            ) : (
              <p>No generated themes yet.</p>
            )}
          </section>
          <section className="insight-question">
            <Sparkles size={19} />
            <h3>A question to sit with</h3>
            <p>
              {sample
                ? 'What’s one small moment you’d like to leave unfilled this week?'
                : 'What would you like to understand better about this moment?'}
            </p>
            <button
              onClick={() => {
                const prompt = sample
                  ? 'I would like to leave a little space for…'
                  : 'I would like to understand…';
                patch({
                  followup:
                    draft.followup + (draft.followup ? '\n\n' : '') + prompt,
                });
                setTab('conversation');
                setInsights(false);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            >
              Explore this thought <ArrowRight size={15} />
            </button>
            <small>
              {sample ? 'Sample reflection' : 'Optional writing prompt'}
            </small>
          </section>
        </TabsContent>
        <TabsContent value="threads">
          <section className="insight-block">
            <GitBranch size={24} />
            <h3>Making room for yourself</h3>
            <p>Appears in three fictional sample entries.</p>
            <span className="tag">
              {threadStatus.balance || 'Active sample'}
            </span>
            <button
              className="text-button"
              onClick={() => navigate('Recurring threads')}
            >
              View thread <ArrowRight size={15} />
            </button>
          </section>
        </TabsContent>
      </Tabs>
      <button className="weekly-mini" onClick={() => navigate('Weekly review')}>
        <div>
          <span className="eyebrow">YOUR WEEK, IN PERSPECTIVE</span>
          <h3>Pause. Look back.</h3>
          <p>Open the sample weekly review</p>
        </div>
        <ArrowRight size={18} />
      </button>
      <p className="insight-footnote">
        A reflection, not a verdict.
        <br />
        You decide what resonates.
      </p>
    </>
  );
  return (
    <div className={'journal-layout ' + (focus ? 'is-focused ' : '') + (insights ? 'has-insights' : 'no-insights')}>
      <section className="journal-center">
        <div className="journal-heading">
          <div className="journal-kicker">
            <Feather size={16} />
            <span>{entry ? formatEntryDate(entry) : 'A NEW CHAPTER'}</span>
            <span className="dot" />
            <span>
              {entry?.sample ? 'Sample entry' : 'Device-local journal'}
            </span>
          </div>
          <div className="journal-title-row">
            <input
              aria-label="Entry title"
              value={draft.title}
              placeholder="An untitled thought"
              maxLength={180}
              onChange={(e) => patch({ title: e.target.value })}
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                className="icon-button"
                aria-label="Entry actions"
              >
                <MoreHorizontal size={21} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="entry-menu">
                <DropdownMenuItem onClick={copy}>
                  <Copy size={16} /> Copy entry
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFocus(!focus)}>
                  <Maximize2 size={16} />
                  {focus ? 'Exit focus' : 'Focus mode'}
                </DropdownMenuItem>
                {entry && (
                  <DropdownMenuItem onClick={() => setRemove(true)}>
                    <Trash2 size={16} /> Delete entry
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="journal-subline">
            <span>
              {changed
                ? 'Draft changes · not saved to journal'
                : entry
                  ? 'Saved on this device'
                  : 'Draft stays in this tab'}
            </span>
            <button onClick={() => setFocus(!focus)} className="focus-toggle">
              {focus ? <X size={15} /> : <Maximize2 size={15} />}{' '}
              {focus ? 'Exit focus' : 'Focus'}
            </button>
            <button
              className={'insights-toggle ' + (insights ? 'active' : '')}
              onClick={() => setInsights(!insights)}
              aria-label={insights ? 'Hide insights' : 'Show insights'}
            >
              <Sparkles size={15} />
              <span>{insights ? 'Hide insights' : 'Insights'}</span>
            </button>
          </div>
        </div>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(String(v))}
          className="journal-tabs"
        >
          <div className="journal-tabbar">
            <TabsList variant="line" className="journal-tabs-list" aria-label="Journal view">
              <TabsTrigger value="writing" className="journal-tab-pill">
                <PenLine size={13} />
                <span>Write</span>
              </TabsTrigger>
              <TabsTrigger value="conversation" className="journal-tab-pill">
                <MessageSquareQuote size={13} />
                <span>Conversation</span>
                {((entry?.messages?.length || 0) > 0) && (
                  <span className="tab-count-badge">{entry?.messages?.length}</span>
                )}
              </TabsTrigger>
            </TabsList>
            <span className="word-count-badge">{wordCount} words</span>
          </div>
          <TabsContent value="writing" className="writing-content">
            <textarea
              aria-label="Your journal entry"
              className="notebook-input"
              value={draft.body}
              onChange={(e) => patch({ body: e.target.value })}
              placeholder="Let your thoughts land here. They don’t have to be perfect."
              maxLength={30000}
            />
            <p className="writing-hint">
              No perfect words needed. Just your own.
            </p>
          </TabsContent>
          <TabsContent value="conversation" className="conversation-content">
            <div className="conversation-date">
              <span />
              {entry ? 'A moment, captured' : 'Start wherever you are'}
              <span />
            </div>
            {draft.body ? (
              <article className="your-thought">
                <div className="message-label">
                  <span className="user-initial">Y</span> YOUR REFLECTION{' '}
                  <button onClick={() => setTab('writing')}>Edit</button>
                </div>
                <p>{draft.body}</p>
              </article>
            ) : (
              <div className="conversation-empty">
                <Feather size={30} />
                <h2>A little space to just be.</h2>
                <p>
                  Begin with a thought, a question, or something you want to
                  remember.
                </p>
                <button
                  className="text-button"
                  onClick={() => setTab('writing')}
                >
                  Write your first thought <ArrowRight size={16} />
                </button>
              </div>
            )}
            {sample ? (
              <article className="aura-reflection">
                <div className="message-label">
                  <span className="aura-spark">
                    <Sparkles size={17} />
                  </span>
                  AURA REFLECTION <span className="sample-chip">SAMPLE</span>
                </div>
                <p>{sampleReflection}</p>
                <blockquote>
                  What would it look like to protect a small pocket of that
                  quiet in your everyday routine?
                </blockquote>
                <div className="speech-controls">
                  <button onClick={speak}>
                    <Volume2 size={15} />
                    {speech === 'stopped' ? 'Read aloud' : 'Replay'}
                  </button>
                  {speech !== 'stopped' && (
                    <>
                      <button
                        aria-label={
                          speech === 'playing'
                            ? 'Pause speech'
                            : 'Resume speech'
                        }
                        onClick={() => {
                          if (speech === 'playing') {
                            window.speechSynthesis.pause();
                            setSpeech('paused');
                          } else {
                            window.speechSynthesis.resume();
                            setSpeech('playing');
                          }
                        }}
                      >
                        {speech === 'playing' ? (
                          <Pause size={15} />
                        ) : (
                          <Play size={15} />
                        )}
                      </button>
                      <button
                        aria-label="Stop speech"
                        onClick={() => {
                          window.speechSynthesis.cancel();
                          setSpeech('stopped');
                        }}
                      >
                        <Square size={14} />
                      </button>
                    </>
                  )}
                  <Select value={rate} onValueChange={(v) => v && setRate(v)}>
                    <SelectTrigger aria-label="Read aloud speed">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['0.75', '1', '1.25', '1.5'].map((v) => (
                        <SelectItem value={v} key={v}>
                          {v}×
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>Prewritten demo · not generated</span>
                </div>
              </article>
            ) : draft.body ? (
              <div className="gentle-note">
                <Sparkles size={17} />
                <p>
                  Gemini isn’t connected yet. You can keep writing and save your
                  reflections on this device.
                </p>
              </div>
            ) : null}
            {entry?.messages?.map((m) =>
              m.role === 'model' ? (
                <article className="reflection-card" key={m.id}>
                  <div className="reflection-badge">
                    <span className="dot" />
                    <span>Aura AI • {m.modelUsed || 'gemini-3.6-flash'}</span>
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{m.text || ''}</p>
                </article>
              ) : (
                <article className="your-thought" key={m.id}>
                  <div className="message-label">
                    <span className="user-initial">Y</span> YOUR FOLLOW-UP
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{m.text || ''}</p>
                </article>
              ),
            )}
            {isReflecting && (
              <article className="reflection-card" style={{ opacity: 0.85 }}>
                <div className="reflection-badge">
                  <span className="dot" style={{ background: '#4d603a' }} />
                  <span>Aura AI • Reflecting...</span>
                </div>
                <p style={{ fontStyle: 'italic', color: '#68775a' }}>
                  Holding space for your thoughts and generating a mindful reflection...
                </p>
              </article>
            )}
          </TabsContent>
        </Tabs>
        <div className="journal-composer">
          {error && (
            <div className="composer-error" role="alert">
              <span>{error}</span>
              <button onClick={reflect}>
                <RotateCcw size={15} /> Retry
              </button>
            </div>
          )}
          <div className="composer-box">
            {tab === 'conversation' && (
              <textarea
                ref={inputRef}
                aria-label="Continue your reflection"
                placeholder="What’s coming up for you?"
                value={draft.followup}
                onChange={(e) => patch({ followup: e.target.value })}
                maxLength={10000}
              />
            )}
            <div className="composer-actions">
              <Select
                value={draft.mode}
                onValueChange={(v) => v && patch({ mode: v })}
              >
                <SelectTrigger
                  aria-label="Reflection mode"
                  className="mode-select"
                >
                  <Sparkles size={15} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modes.map((m) => (
                    <SelectItem value={m} key={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                className="icon-button voice-button"
                onClick={() => setVoice(true)}
                aria-label="Record a voice reflection"
              >
                <Mic size={19} />
              </button>
              <button
                className="save-button"
                disabled={!draft.body.trim()}
                onClick={() =>
                  save(tab === 'conversation' && !!draft.followup.trim())
                }
              >
                <Check size={16} />
                <span>
                  {draft.followup.trim() && tab === 'conversation'
                    ? 'Save follow-up'
                    : 'Save entry'}
                </span>
              </button>
              <button
                className="primary reflect-button"
                onClick={reflect}
                disabled={isReflecting || !(tab === 'conversation' ? draft.followup : draft.body).trim()}
              >
                <span>{isReflecting ? 'Reflecting...' : 'Reflect'}</span>
                <Send size={16} />
              </button>
            </div>
          </div>
          <div className="composer-caption">
            <span>{user && !user.isAnonymous ? 'Secured in Cloud Firestore' : 'Device storage · Sign in with Google to sync'}</span>
            <span>⌘ / Ctrl + S to save</span>
          </div>
        </div>
        <SaveShortcut
          onSave={() => save(tab === 'conversation' && !!draft.followup.trim())}
        />
      </section>
      {!isMobile && insights && (
        <aside className="journal-insights">{insightContent}</aside>
      )}
      {isMobile && (
        <Sheet open={insights} onOpenChange={setInsights}>
          <SheetContent className="insight-sheet" showCloseButton={false}>
            <SheetTitle className="sr-only">Journal insights</SheetTitle>
            <SheetDescription className="sr-only">
              Sample insights, recurring threads, and weekly review.
            </SheetDescription>
            {insightContent}
          </SheetContent>
        </Sheet>
      )}
      <VoiceDialog
        open={voice}
        close={() => setVoice(false)}
        add={(text) => {
          patch(
            mergeTranscript(
              draft,
              text,
              tab === 'conversation' && !!draft.body ? 'followup' : 'body',
            ),
          );
          setVoice(false);
          toast.success('Transcript added. Review it before saving.');
        }}
      />
      <AlertDialog open={remove} onOpenChange={setRemove}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the entry and its saved draft from this device. Export
            anything you want to keep first.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep entry</AlertDialogCancel>
            <button
              className="primary"
              onClick={async () => {
                if (entry?.id) {
                  if (deleteEntry) {
                    await deleteEntry(entry.id);
                  } else {
                    saveEntries(entries.filter((e) => e.id !== entry.id));
                  }
                  removeDraft();
                  setRemove(false);
                  navigate('History');
                  toast.success('Entry deleted.');
                }
              }}
            >
              Delete entry
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
function SaveShortcut({ onSave }: { onSave: () => void }) {
  const latest = useRef(onSave);
  useEffect(() => {
    latest.current = onSave;
  }, [onSave]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        latest.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return null;
}
