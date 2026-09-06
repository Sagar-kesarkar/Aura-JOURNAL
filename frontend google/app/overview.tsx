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
            <CardMotif motif={motif} size={28} />
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
      <div className="insight-grid">
        <section className="thread-summary">
          <div className="section-heading">
            <h2>
              <GitBranch size={19} /> The threads that connect
            </h2>
            <span className="small-label">SAMPLE INSIGHT</span>
          </div>
          <p>A few things you’ve been coming back to.</p>
          <button
            className="thread-row"
            onClick={() => navigate('Recurring threads')}
          >
            <span className="thread-icon">
              <GitBranch size={20} />
            </span>
            <div>
              <h3>Making room for yourself</h3>
              <p>Mentioned in 3 sample entries this week</p>
            </div>
            <ArrowUpRight size={18} />
          </button>
          <button
            className="text-button"
            onClick={() => navigate('Recurring threads')}
          >
            Explore your threads <ArrowRight size={15} />
          </button>
        </section>
        <section className="review-summary">
          <div className="eyebrow">
            <Sparkles size={16} /> YOUR WEEK, IN PERSPECTIVE
          </div>
          <h2>
            A pause. A look back.
            <br />A little clarity.
          </h2>
          <p>
            See what stood out, what connected,
            <br />
            and a small next step worth taking.
          </p>
          <button onClick={() => navigate('Weekly review')}>
            Open sample weekly review <ArrowUpRight size={17} />
          </button>
          <CalendarDays className="review-symbol" size={87} strokeWidth={0.8} />
        </section>
      </div>
      <footer className="page-footer">
        <Feather size={14} /> One thought at a time is enough.
        <span>Frontend preview · No AI or cloud connection</span>
      </footer>
    </>
  );
}
