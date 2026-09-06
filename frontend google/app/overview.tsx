'use client';
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Plus,
  Mic,
  Sun,
  Feather,
  Clock,
  GitBranch,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { type Entry, type MotifId, formatEntryDate, readingMinutes } from './journal-data';
import { weeklyActivity } from './journal-activity';
import { CardMotif } from '@/components/background-motif';

export function Overview({
  entries,
  navigate,
  motif,
}: {
  entries: Entry[];
  navigate: (v: string) => void;
  motif?: MotifId;
}) {
  const now = new Date();
  const activity = weeklyActivity(entries, now);
  return (
    <>
      <div className="greeting">
        <div>
          <div className="eyebrow">
            <Sun size={16} />{' '}
            {now
              .toLocaleDateString('en', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
              .toUpperCase()}
          </div>
          <h1>
            A little space to <em>just be.</em>
          </h1>
          <p>Untangle a thought. Notice a pattern. Make room for you.</p>
        </div>
        <span className="date-stamp">
          {now.getDate().toString().padStart(2, '0')}
          <span>
            {now
              .toLocaleDateString('en', { month: 'short', year: 'numeric' })
              .toUpperCase()}
          </span>
        </span>
      </div>
      <section className="start-card">
        <CardMotif motif={motif} size={46} />
        <div className="eyebrow">YOUR NEXT CHAPTER</div>
        <h2>What’s on your mind?</h2>
        <p>There’s no right place to start. Just begin where you are.</p>
        <div className="start-actions">
          <button className="primary" onClick={() => navigate('New entry')}>
            <Plus size={17} /> Write an entry <ArrowUpRight size={17} />
          </button>
          <button
            className="secondary"
            onClick={() => navigate('Voice reflection')}
          >
            <Mic size={17} /> Speak your thoughts
          </button>
        </div>
        <div className="card-quote">
          A thought doesn’t have to be
          <br />
          finished to be worth writing down.
          <span>THIS SPACE IS YOURS</span>
        </div>
      </section>
      <div className="section-heading">
        <h2>
          Recent entries <span>{String(entries.length).padStart(2, '0')}</span>
        </h2>
        <button onClick={() => navigate('History')}>
          View all entries <ArrowRight size={16} />
        </button>
      </div>
      <div className="entry-grid">
        {entries.slice(0, 3).map((e, i) => (
          <button
            className="entry-card"
            key={e.id}
            onClick={() => navigate('entry:' + e.id)}
          >
            <CardMotif motif={motif} size={38} />
            <div className="entry-meta">
              <span>
                <BookOpen size={15} /> {formatEntryDate(e)}
              </span>
              <ArrowUpRight size={17} />
            </div>
            <h3>{e.title || 'Untitled thought'}</h3>
            <p>{e.text || ''}</p>
            <div className="entry-bottom">
              <span className={'tag tag-' + i}>{e.tag || 'Reflection'}</span>
              <span>
                <Clock size={13} /> {readingMinutes(e.text)} min read
              </span>
            </div>
          </button>
        ))}
      </div>
      {!entries.length && (
        <div className="empty-state">
          <Feather size={26} />
          <h2>Your story starts here.</h2>
          <p>Your first entry can be as simple as a single thought.</p>
          <button className="secondary" onClick={() => navigate('New entry')}>
            Write your first entry
          </button>
        </div>
      )}
      <div className="insight-grid activity-insight-grid">
        <section className="thread-summary activity-card">
          <h2>The threads that connect</h2>
          <p>A few things you’ve been coming back to.</p>
          <span className="small-label">SAMPLE THREADS</span>
          <svg className="thread-landscape" viewBox="0 0 360 80" aria-hidden="true">
            <path className="thread-line-main" d="M4 38 C35 7 58 75 91 45 S146 18 173 42 S220 59 249 32 S299 77 356 41" />
            <path className="thread-line-soft" d="M4 50 C51 24 69 35 99 49 S152 69 187 30 S244 59 275 39 S324 18 356 48" />
            <circle cx="66" cy="47" r="5" className="thread-node-main" />
            <circle cx="187" cy="30" r="5" className="thread-node-soft" />
            <circle cx="278" cy="36" r="5" className="thread-node-main" />
          </svg>
          <button className="text-button" onClick={() => navigate('Recurring threads')}>
            Explore recurring threads <ArrowRight size={15} />
          </button>
        </section>
        <section className="review-summary activity-card">
          <h2>Your week, in perspective</h2>
          <p aria-live="polite">{activity.total === 0 ? 'Your next reflection starts this week’s rhythm.' : `You wrote ${activity.total} ${activity.total === 1 ? 'time' : 'times'} this week.`}<br />Keep showing up for yourself.</p>
          <ol className="activity-week" aria-label="Journal activity this week, Monday to Sunday">
            {activity.days.map((day, index) => <li key={index} className={day.future ? 'is-future' : ''}>
              <span aria-hidden="true">{day.label}</span>
              <span className={'activity-day ' + (day.count ? 'is-active' : '')} role="img"
                aria-label={day.date.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' }) + ': ' + (day.future ? 'upcoming' : day.count + ' saved writing ' + (day.count === 1 ? 'change' : 'changes'))}
                title={day.date.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' }) + ': ' + day.count + ' saved writing changes'} />
            </li>)}
          </ol>
          <p className="activity-explanation">{activity.activeDays} of 7 days · Saved writing, including edits. Sample entries excluded.</p>
          <button className="text-button" onClick={() => navigate('Weekly review')}>
            See your weekly review <ArrowRight size={15} />
          </button>
        </section>
      </div>
      <footer className="page-footer">
        <Feather size={14} /> One thought at a time is enough.
        <span>Frontend preview · No AI or cloud connection</span>
      </footer>
    </>
  );
}
