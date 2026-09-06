'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Plus,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Edit3,
  MoreHorizontal,
  Pause,
  Play,
  Sparkles,
  Trash2,
  X,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  type Goal,
  type GoalMilestone,
  type GoalStatus,
  type Entry,
  calculateGoalProgress,
  isGoalStale,
  formatEntryDate,
} from './journal-data';
import {
  fetchGoals,
  createGoal,
  patchGoal,
  deleteGoal,
  fetchGoalSuggestions,
  matchGoalWithEntries,
  type EntryPreview,
} from '../lib/goals-service';

interface GoalsPageProps {
  entries: Entry[];
  navigate: (view: string) => void;
  notify: (msg: string) => void;
}

export function GoalsPage({ entries, navigate, notify }: GoalsPageProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'paused' | 'all'>('active');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formMilestones, setFormMilestones] = useState<Array<{ id: string; label: string; done: boolean }>>([]);
  const [newMilestoneInput, setNewMilestoneInput] = useState('');
  const [formStatus, setFormStatus] = useState<GoalStatus>('active');
  const [formProgressPercent, setFormProgressPercent] = useState<number>(0);
  const [formError, setFormError] = useState('');

  // Delete modal state
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<{ list: string[]; sources: string[] }>({
    list: [],
    sources: [],
  });
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Load goals on mount or when entries change
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const loaded = await fetchGoals(entries);
        if (mounted) {
          setGoals(loaded);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Error loading goals:', err);
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [entries]);

  const selectedGoal = useMemo(() => {
    if (!selectedGoalId) return null;
    return goals.find((g) => g.id === selectedGoalId) || null;
  }, [selectedGoalId, goals]);

  // Compute matched entry previews for selected goal
  const selectedGoalMatches = useMemo(() => {
    if (!selectedGoal) return { previews: [] as EntryPreview[], count: 0, lastDate: null as string | null };
    const { matchedPreviews, mentionCount, lastMentionedAt } = matchGoalWithEntries(selectedGoal, entries);
    return { previews: matchedPreviews, count: mentionCount, lastDate: lastMentionedAt };
  }, [selectedGoal, entries]);

  // Load grounded suggestions when a goal is selected
  useEffect(() => {
    if (!selectedGoal) {
      setSuggestions({ list: [], sources: [] });
      return;
    }
    let cancelled = false;
    setLoadingSuggestions(true);
    fetchGoalSuggestions(selectedGoal.id, selectedGoalMatches.previews)
      .then((res) => {
        if (!cancelled) {
          setSuggestions({ list: res.suggestions, sources: res.sourceSessionIds });
          setLoadingSuggestions(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedGoal?.id, selectedGoalMatches.previews]);

  // Filtered goals for list view
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'active') return g.status === 'active';
      if (activeTab === 'completed') return g.status === 'completed';
      if (activeTab === 'paused') return g.status === 'paused' || g.status === 'abandoned';
      return true;
    });
  }, [goals, activeTab]);

  // Open creation form
  const handleOpenCreate = () => {
    setEditingGoal(null);
    setFormTitle('');
    setFormDescription('');
    setFormTargetDate('');
    setFormMilestones([]);
    setNewMilestoneInput('');
    setFormStatus('active');
    setFormProgressPercent(0);
    setFormError('');
    setIsFormOpen(true);
  };

  // Open edit form
  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormDescription(goal.description || '');
    setFormTargetDate(goal.targetDate || '');
    setFormMilestones([...goal.milestones]);
    setNewMilestoneInput('');
    setFormStatus(goal.status);
    setFormProgressPercent(goal.progressPercent || 0);
    setFormError('');
    setIsFormOpen(true);
  };

  // Milestone helpers in form
  const handleAddMilestone = () => {
    const label = newMilestoneInput.trim();
    if (!label) return;
    setFormMilestones((prev) => [
      ...prev,
      { id: 'm-' + Math.random().toString(36).slice(2, 9), label, done: false },
    ]);
    setNewMilestoneInput('');
  };

  const handleRemoveMilestone = (id: string) => {
    setFormMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const handleToggleFormMilestone = (id: string) => {
    setFormMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, done: !m.done } : m))
    );
  };

  // Save create/edit goal
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = formTitle.trim();
    if (!title) {
      setFormError('Please give your goal a title.');
      return;
    }

    if (!editingGoal && formTargetDate) {
      const targetTime = new Date(formTargetDate).getTime();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (targetTime < today.getTime()) {
        setFormError('Target date cannot be in the past when creating a new goal.');
        return;
      }
    }

    setFormError('');

    try {
      if (editingGoal) {
        const updated = await patchGoal(
          editingGoal.id,
          {
            title,
            description: formDescription.trim() || null,
            targetDate: formTargetDate || null,
            milestones: formMilestones,
            status: formStatus,
            progressPercent: formMilestones.length === 0 ? formProgressPercent : null,
          },
          entries
        );
        setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        notify('Goal updated.');
      } else {
        const created = await createGoal(
          {
            title,
            description: formDescription.trim() || null,
            targetDate: formTargetDate || null,
            milestones: formMilestones,
            status: formStatus,
            progressPercent: formMilestones.length === 0 ? formProgressPercent : null,
          },
          entries
        );
        setGoals((prev) => [created, ...prev]);
        notify('Goal created.');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Could not save goal. Please try again.');
    }
  };

  // Milestone inline toggle in detail view
  const handleToggleMilestone = async (goal: Goal, milestoneId: string) => {
    const updatedMilestones = goal.milestones.map((m) =>
      m.id === milestoneId ? { ...m, done: !m.done } : m
    );
    try {
      const updated = await patchGoal(goal.id, { milestones: updatedMilestones }, entries);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } catch {
      notify('Could not update milestone.');
    }
  };

  // Status toggle without confirmation (Pause / Resume / Abandon)
  const handleSetStatus = async (goal: Goal, nextStatus: GoalStatus) => {
    try {
      const updated = await patchGoal(goal.id, { status: nextStatus }, entries);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      notify(
        nextStatus === 'active'
          ? 'Goal resumed.'
          : nextStatus === 'paused'
          ? 'Goal paused.'
          : nextStatus === 'completed'
          ? 'Goal marked completed!'
          : 'Goal abandoned.'
      );
    } catch {
      notify('Could not update goal status.');
    }
  };

  // Check-in prompt actions
  const handleKeepActive = async (goal: Goal) => {
    try {
      const now = new Date().toISOString();
      const updated = await patchGoal(goal.id, { lastMentionedAt: now }, entries);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      notify('Goal marked still active.');
    } catch {
      notify('Could not update check-in timestamp.');
    }
  };

  // Delete goal
  const handleDeleteConfirm = async () => {
    if (!goalToDelete) return;
    const id = goalToDelete.id;
    try {
      await deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
      if (selectedGoalId === id) setSelectedGoalId(null);
      notify('Goal deleted.');
    } catch {
      notify('Could not delete goal.');
    } finally {
      setGoalToDelete(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Relative mention formatting (neutral observation, never overdue)
  // ---------------------------------------------------------------------------
  const formatRelativeMention = (dateStr: string | null, mentionCount: number) => {
    if (!dateStr) {
      return mentionCount > 0 ? `Mentioned in ${mentionCount} ${mentionCount === 1 ? 'entry' : 'entries'}` : null;
    }
    const past = new Date(dateStr).getTime();
    if (isNaN(past)) return null;
    const diffDays = Math.max(0, Math.floor((Date.now() - past) / (1000 * 60 * 60 * 24)));
    if (diffDays === 0) return 'Last came up in an entry today';
    if (diffDays === 1) return 'Last came up in an entry yesterday';
    if (diffDays < 7) return `Last came up in an entry ${diffDays} days ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return 'Last came up in an entry 1 week ago';
    return `Last came up in an entry ${diffWeeks} weeks ago`;
  };

  // ---------------------------------------------------------------------------
  // RENDER: DETAIL VIEW (2.4)
  // ---------------------------------------------------------------------------
  if (selectedGoal) {
    const isStale = isGoalStale(selectedGoal);
    const progress = calculateGoalProgress(selectedGoal);
    const hasMilestones = selectedGoal.milestones.length > 0;
    const relativeMention = formatRelativeMention(selectedGoalMatches.lastDate, selectedGoalMatches.count);

    return (
      <div className="goals-view">
        <button
          className="back-button"
          onClick={() => setSelectedGoalId(null)}
          aria-label="Back to all goals"
        >
          <ArrowLeft size={16} /> All goals
        </button>

        <article className="goal-detail-header">
          <div className="goal-detail-title-row">
            <div>
              <div className="goal-badges-row">
                <span className={`goal-status-badge badge-${selectedGoal.status}`}>
                  {selectedGoal.status.charAt(0).toUpperCase() + selectedGoal.status.slice(1)}
                </span>
                {selectedGoal.targetDate && (
                  <span className="goal-date-badge">
                    <Calendar size={13} />
                    Target: {new Date(selectedGoal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
              <h1 className="goal-detail-title">{selectedGoal.title}</h1>
              {selectedGoal.description && (
                <p className="goal-detail-desc">{selectedGoal.description}</p>
              )}
            </div>

            <div className="goal-detail-actions">
              <button
                className="secondary"
                onClick={() => handleOpenEdit(selectedGoal)}
                aria-label="Edit goal"
              >
                <Edit3 size={15} /> Edit
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger className="icon-button" aria-label="Goal actions">
                  <MoreHorizontal size={18} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {selectedGoal.status === 'active' && (
                    <>
                      <DropdownMenuItem onClick={() => handleSetStatus(selectedGoal, 'completed')}>
                        <CheckCircle2 size={15} /> Mark completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSetStatus(selectedGoal, 'paused')}>
                        <Pause size={15} /> Pause goal
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSetStatus(selectedGoal, 'abandoned')}>
                        <XCircle size={15} /> Abandon goal
                      </DropdownMenuItem>
                    </>
                  )}
                  {selectedGoal.status === 'paused' && (
                    <DropdownMenuItem onClick={() => handleSetStatus(selectedGoal, 'active')}>
                      <Play size={15} /> Resume goal
                    </DropdownMenuItem>
                  )}
                  {selectedGoal.status === 'completed' && (
                    <DropdownMenuItem onClick={() => handleSetStatus(selectedGoal, 'active')}>
                      <Play size={15} /> Reopen as active
                    </DropdownMenuItem>
                  )}
                  {selectedGoal.status === 'abandoned' && (
                    <DropdownMenuItem onClick={() => handleSetStatus(selectedGoal, 'active')}>
                      <Play size={15} /> Resume goal
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setGoalToDelete(selectedGoal)}
                    className="menu-danger"
                  >
                    <Trash2 size={15} /> Delete goal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </article>

        {/* Check-in prompt (Section 2.4 - only when stale & active) */}
        {isStale && (
          <section className="goal-checkin-prompt" aria-label="Goal check-in">
            <div className="goal-checkin-content">
              <Clock size={16} />
              <p>This hasn’t come up in a few entries — still something you’re working toward?</p>
            </div>
            <div className="goal-checkin-actions">
              <button className="secondary small" onClick={() => handleKeepActive(selectedGoal)}>
                Still active
              </button>
              <button className="text-button small" onClick={() => handleSetStatus(selectedGoal, 'paused')}>
                Pause this goal
              </button>
            </div>
          </section>
        )}

        {/* Progress & Milestones (Section 2.4) */}
        <section className="goal-section-card">
          <div className="goal-card-header">
            <h2>Progress</h2>
            <span className="goal-progress-number">
              {hasMilestones
                ? `${selectedGoal.milestones.filter((m) => m.done).length} of ${selectedGoal.milestones.length} milestones (${progress}%)`
                : `${progress}% complete`}
            </span>
          </div>

          <div className="goal-progress-bar-wrap">
            <div className="goal-progress-bar-track">
              <div
                className="goal-progress-bar-fill"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>

          {hasMilestones ? (
            <div className="goal-milestones-checklist">
              {selectedGoal.milestones.map((m) => (
                <button
                  key={m.id}
                  className={`milestone-check-row ${m.done ? 'is-done' : ''}`}
                  onClick={() => handleToggleMilestone(selectedGoal, m.id)}
                  aria-checked={m.done}
                  role="checkbox"
                >
                  {m.done ? (
                    <CheckCircle2 size={18} className="milestone-icon is-done" />
                  ) : (
                    <Circle size={18} className="milestone-icon" />
                  )}
                  <span className="milestone-label">{m.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="goal-no-milestones-note">
              Tracking progress via manual percentage bar. You can add specific milestones at any time by clicking Edit.
            </p>
          )}
        </section>

        {/* Where this has come up (Section 2.4) */}
        <section className="goal-section-card">
          <div className="goal-card-header">
            <div>
              <h2>Where this has come up</h2>
              {relativeMention && <span className="goal-subtext">{relativeMention}</span>}
            </div>
          </div>

          {selectedGoalMatches.previews.length > 0 ? (
            <div className="goal-entry-links-list">
              {selectedGoalMatches.previews.map((entryPreview) => (
                <button
                  key={entryPreview.id}
                  className="goal-entry-preview-card"
                  onClick={() => navigate('entry:' + entryPreview.id)}
                  aria-label={`Open entry: ${entryPreview.title}`}
                >
                  <div className="goal-entry-preview-top">
                    <span className="goal-entry-date">
                      <BookOpen size={14} /> {entryPreview.date}
                    </span>
                    <ArrowRight size={14} />
                  </div>
                  <h3>{entryPreview.title}</h3>
                  <p>{entryPreview.textSnippet}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="goal-empty-entries-note">
              <BookOpen size={20} />
              <p>This goal hasn’t come up in an entry yet — it’ll show up here once you write about it.</p>
            </div>
          )}
        </section>

        {/* Grounded Suggestions (Section 2.4 - Max 2, must reference a specific entry) */}
        <section className="goal-section-card">
          <div className="goal-card-header">
            <h2>Reflective suggestions</h2>
          </div>

          {loadingSuggestions ? (
            <div className="goal-empty-entries-note">
              <Sparkles size={18} className="spin-slow" />
              <p>Reviewing recent entries…</p>
            </div>
          ) : suggestions.list.length > 0 ? (
            <div className="goal-suggestions-list">
              {suggestions.list.map((suggestion, idx) => (
                <div key={idx} className="goal-suggestion-item">
                  <Sparkles size={16} />
                  <div>
                    <p>{suggestion}</p>
                    {suggestions.sources[idx] && (
                      <button
                        className="text-button small"
                        onClick={() => navigate('entry:' + suggestions.sources[idx])}
                      >
                        Read referenced entry <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="goal-empty-entries-note">
              <HelpCircle size={18} />
              <p>
                Suggestions appear here once you’ve written reflections related to this goal.
              </p>
            </div>
          )}
        </section>

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!goalToDelete} onOpenChange={(open) => !open && setGoalToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              "{goalToDelete?.title}" will be permanently removed. Your journal entries will remain untouched.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep goal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="dialog-danger">
                Delete goal
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit modal */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="goal-dialog-content">
            <DialogHeader>
              <DialogTitle>Edit Goal</DialogTitle>
              <DialogDescription>Update your goal details, milestones, or status.</DialogDescription>
            </DialogHeader>
            {renderGoalForm()}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: LIST VIEW (2.2) OR EMPTY STATE (2.1)
  // ---------------------------------------------------------------------------
  return (
    <div className="goals-view">
      <header className="goals-top-header">
        <div>
          <div className="eyebrow">INTENTIONS & DIRECTIONS</div>
          <h1>Goals</h1>
          <p className="goals-subtitle">
            Gentle direction for the things you want to nurture over time.
          </p>
        </div>
        <button className="primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Add a goal
        </button>
      </header>

      {goals.length === 0 && !loading ? (
        // 2.1 Empty State
        <div className="goals-empty-state">
          <div className="goals-empty-icon-wrap">
            <Target size={36} />
          </div>
          <h2>No goals set yet.</h2>
          <p>Add one whenever something feels worth tracking.</p>
          <button className="primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Add a goal
          </button>
        </div>
      ) : (
        // 2.2 Goal List View
        <>
          <div className="goals-tabs-row">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList aria-label="Filter goals by status">
                <TabsTrigger value="active">
                  Active ({goals.filter((g) => g.status === 'active').length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({goals.filter((g) => g.status === 'completed').length})
                </TabsTrigger>
                <TabsTrigger value="paused">
                  Paused ({goals.filter((g) => g.status === 'paused' || g.status === 'abandoned').length})
                </TabsTrigger>
                <TabsTrigger value="all">All ({goals.length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filteredGoals.length === 0 ? (
            <div className="goals-empty-tab">
              <p>No {activeTab} goals found.</p>
            </div>
          ) : (
            <div className="goals-grid">
              {filteredGoals.map((goal) => {
                const progress = calculateGoalProgress(goal);
                const hasMilestones = goal.milestones.length > 0;
                const { lastMentionedAt: lastDate, mentionCount: mCount } = matchGoalWithEntries(goal, entries);
                const relativeMention = formatRelativeMention(lastDate, mCount);

                return (
                  <article
                    key={goal.id}
                    className={`goal-card ${goal.status !== 'active' ? 'is-deemphasized' : ''}`}
                    onClick={() => setSelectedGoalId(goal.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedGoalId(goal.id)}
                  >
                    <div className="goal-card-top">
                      <span className={`goal-status-badge badge-${goal.status}`}>
                        {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                      </span>
                      {goal.targetDate && (
                        <span className="goal-date-badge">
                          <Calendar size={12} />
                          {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>

                    <h3 className="goal-card-title">{goal.title}</h3>
                    {goal.description && <p className="goal-card-desc">{goal.description}</p>}

                    <div className="goal-card-progress-area">
                      <div className="goal-card-progress-label">
                        <span>
                          {hasMilestones
                            ? `${goal.milestones.filter((m) => m.done).length} of ${goal.milestones.length} milestones`
                            : 'Progress'}
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="goal-progress-bar-track">
                        <div
                          className="goal-progress-bar-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {relativeMention && (
                      <div className="goal-card-mention-line">
                        <BookOpen size={12} />
                        <span>{relativeMention}</span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!goalToDelete} onOpenChange={(open) => !open && setGoalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
          <AlertDialogDescription>
            "{goalToDelete?.title}" will be permanently removed. Your journal entries will remain untouched.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep goal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="dialog-danger">
              Delete goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create / Edit Form Modal (2.3) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="goal-dialog-content">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit Goal' : 'Set a Goal'}</DialogTitle>
            <DialogDescription>
              {editingGoal
                ? 'Update your goal details, milestones, or status.'
                : 'A gentle space to track what feels meaningful.'}
            </DialogDescription>
          </DialogHeader>
          {renderGoalForm()}
        </DialogContent>
      </Dialog>
    </div>
  );

  // ---------------------------------------------------------------------------
  // RENDER: CREATE / EDIT FORM (2.3)
  // ---------------------------------------------------------------------------
  function renderGoalForm() {
    const hasMilestones = formMilestones.length > 0;

    return (
      <form onSubmit={handleSaveGoal} className="goal-form">
        {formError && <div className="goal-form-error">{formError}</div>}

        <div className="goal-form-field">
          <label htmlFor="goal-title-input">
            Title <span className="field-required">*</span>
          </label>
          <input
            id="goal-title-input"
            type="text"
            required
            maxLength={180}
            placeholder="e.g. Read 15 minutes before bed"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />
        </div>

        <div className="goal-form-field">
          <label htmlFor="goal-desc-input">Description (optional)</label>
          <textarea
            id="goal-desc-input"
            rows={2}
            maxLength={600}
            placeholder="Why does this matter right now?"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />
        </div>

        <div className="goal-form-row">
          <div className="goal-form-field flex-1">
            <label htmlFor="goal-target-date">Target date (optional)</label>
            <input
              id="goal-target-date"
              type="date"
              value={formTargetDate}
              onChange={(e) => setFormTargetDate(e.target.value)}
            />
          </div>

          {editingGoal && (
            <div className="goal-form-field flex-1">
              <label htmlFor="goal-status-select">Status</label>
              <select
                id="goal-status-select"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as GoalStatus)}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </div>
          )}
        </div>

        {/* Milestones section */}
        <div className="goal-form-field">
          <label>Milestones (optional)</label>
          <p className="goal-form-subtext">
            Break this goal down into steps, or leave empty to use a simple progress slider.
          </p>

          <div className="goal-form-milestone-adder">
            <input
              type="text"
              placeholder="Add a milestone step…"
              value={newMilestoneInput}
              onChange={(e) => setNewMilestoneInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMilestone();
                }
              }}
            />
            <button
              type="button"
              className="secondary small"
              onClick={handleAddMilestone}
              disabled={!newMilestoneInput.trim()}
            >
              Add step
            </button>
          </div>

          {hasMilestones && (
            <div className="goal-form-milestones-list">
              {formMilestones.map((m) => (
                <div key={m.id} className="goal-form-milestone-item">
                  <button
                    type="button"
                    className="milestone-toggle-btn"
                    onClick={() => handleToggleFormMilestone(m.id)}
                    aria-label={`Toggle done: ${m.label}`}
                  >
                    {m.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </button>
                  <span className={`milestone-text ${m.done ? 'is-done' : ''}`}>{m.label}</span>
                  <button
                    type="button"
                    className="milestone-remove-btn"
                    onClick={() => handleRemoveMilestone(m.id)}
                    aria-label="Remove milestone"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manual progress slider — ONLY shown if milestones list is empty (Section 2.3) */}
        {!hasMilestones && (
          <div className="goal-form-field">
            <div className="goal-form-progress-header">
              <label htmlFor="goal-progress-slider">Progress percentage</label>
              <span>{formProgressPercent}%</span>
            </div>
            <input
              id="goal-progress-slider"
              type="range"
              min="0"
              max="100"
              step="5"
              value={formProgressPercent}
              onChange={(e) => setFormProgressPercent(Number(e.target.value))}
            />
          </div>
        )}

        <div className="goal-form-actions">
          <button type="button" className="secondary" onClick={() => setIsFormOpen(false)}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {editingGoal ? 'Save changes' : 'Create goal'}
          </button>
        </div>
      </form>
    );
  }
}
