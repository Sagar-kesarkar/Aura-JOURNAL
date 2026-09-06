'use client';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import {
  BookOpen,
  Plus,
  GitBranch,
  CalendarDays,
  Settings,
  Feather,
  Search,
  LayoutDashboard,
  ArrowUpRight,
  ChevronDown,
  PanelLeft,
  Menu,
  LogOut,
  Palette,
  Check,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Features } from './features';
import { Overview } from './overview';
import { Workbench } from './workbench';
import { useJournal } from './use-journal';
import {
  emptyDraft,
  formatEntryDate,
  viewToHash,
  themeList,
  motifList,
} from './journal-data';
import { BackgroundMotif } from '@/components/background-motif';
import { WelcomePage } from './welcome-page';
import { AuthProvider, useAuth } from '../lib/auth-context';

export default function Home() {
  return (
    <AuthProvider>
      <MainAppShell />
    </AuthProvider>
  );
}

function formatDisplayEmail(email?: string | null) {
  if (!email) return 'Device-local demo';
  const atIndex = email.indexOf('@');
  if (atIndex > 0) {
    const userPart = email.slice(0, atIndex);
    const domainPart = email.slice(atIndex);
    if (userPart.length > 10) {
      return `${userPart.slice(0, 10)}...${domainPart}`;
    }
    return email;
  }
  return email.length > 16 ? `${email.slice(0, 13)}...` : email;
}

function MainAppShell() {
  const { user, signOut } = useAuth();
  const [demoEntered, setDemoEntered] = useState(false);

  useEffect(() => {
    const routeChanged = () => {
      if (window.location.hash === viewToHash('Welcome')) setDemoEntered(false);
    };
    window.addEventListener('hashchange', routeChanged);
    return () => window.removeEventListener('hashchange', routeChanged);
  }, []);

  const leaveWorkspace = async () => {
    if (user) {
      await signOut();
    }
    window.history.replaceState(null, '', viewToHash('Welcome'));
    setDemoEntered(false);
  };

  const isEntered = Boolean(user) || demoEntered;

  if (!isEntered)
    return (
      <WelcomePage
        onEnterDemo={() => {
          window.history.replaceState(null, '', viewToHash('Overview'));
          setDemoEntered(true);
        }}
      />
    );

  return (
    <SidebarProvider>
      <JournalApp onExit={leaveWorkspace} />
    </SidebarProvider>
  );
}
function JournalApp({ onExit }: { onExit: () => void }) {
  const { user } = useAuth();
  const journal = useJournal(user?.uid);
  const { view, entries, ready, navigate, preferences } = journal;
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(false);
  const { toggleSidebar, setOpenMobile } = useSidebar();
  const entry = entries.find((e) => 'entry:' + e.id === view);
  const editor =
    view === 'New entry' ||
    view === 'Voice reflection' ||
    view.startsWith('entry:');
  const key = entry?.id || 'new';
  const draft = journal.drafts[key] || emptyDraft(entry);
  useEffect(() => {
    const reset = () => setFocus(false);
    window.addEventListener('hashchange', reset);
    return () => window.removeEventListener('hashchange', reset);
  }, []);
  const go = (v: string) => {
    if (v === 'Welcome') {
      onExit();
      return;
    }
    setFocus(false);
    setOpenMobile(false);
    navigate(v);
  };
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => void;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'start_journal_entry',
            description:
              'Open a new device-local journal draft. Does not save or send writing.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute: async (input: unknown) => {
              if (
                !input ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error('Expected an empty object');
              navigate('New entry');
              await new Promise((resolve) =>
                requestAnimationFrame(() => resolve(null)),
              );
              return { view: 'New entry', saved: false };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [navigate]);
  return (
    <>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to journal
      </a>
      <Sidebar
        className={'aura-sidebar ' + (focus ? 'sidebar-focus-hidden' : '')}
      >
        <SidebarHeader>
          <button className="brand" onClick={() => go('Overview')}>
            <span className="brand-mark">
              <Feather size={23} />
            </span>
            aura<span className="brand-dot">.</span>
          </button>
          <p className="brand-caption">YOUR THOUGHTS. A LITTLE CLEARER.</p>
        </SidebarHeader>
        <SidebarContent>
          <button className="primary new-entry" onClick={() => go('New entry')}>
            <Plus size={18} /> New reflection <span>↗</span>
          </button>
          <nav aria-label="Workspace">
            <button
              className={'nav-item ' + (view === 'Overview' ? 'active' : '')}
              aria-current={view === 'Overview' ? 'page' : undefined}
              onClick={() => go('Overview')}
            >
              <LayoutDashboard size={18} />
              Overview
            </button>
            <button
              className={'nav-item ' + (editor ? 'active' : '')}
              onClick={() =>
                go(entries[0] ? 'entry:' + entries[0].id : 'New entry')
              }
            >
              <BookOpen size={18} />
              My journal
            </button>
            {[
              {
                Icon: GitBranch,
                label: 'Recurring threads',
                title: 'Recurring threads',
              },
              {
                Icon: CalendarDays,
                label: 'Weekly review',
                title: 'Weekly review',
              },
            ].map(({ Icon, label, title }) => (
              <button
                className={'nav-item ' + (view === label ? 'active' : '')}
                key={label}
                aria-current={view === label ? 'page' : undefined}
                onClick={() => go(label)}
              >
                <Icon size={18} />
                <span>{title}</span>
                {label === 'Recurring threads' && (
                  <small>
                    {
                      ['balance', 'creative'].filter(
                        (id) =>
                          !preferences.statuses[id] ||
                          preferences.statuses[id] === 'active',
                      ).length
                    }
                  </small>
                )}
              </button>
            ))}
          </nav>
          <div className="rail-divider" />
          <div className="recent-title">
            <span>YOUR ENTRIES</span>
            <button
              onClick={() => go('History')}
              aria-label="Open all journal history"
            >
              <ArrowUpRight size={16} />
            </button>
          </div>
          <label className="rail-search">
            <Search size={15} />
            <input
              aria-label="Search recent entries"
              placeholder="Find a thought…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="recent-entry-list">
            {entries
              .filter((e) =>
                ((e.title || '') + ' ' + (e.text || ''))
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .slice(0, 8)
              .map((e) => (
                <button
                  key={e.id}
                  aria-label={'Open ' + (e.title || 'entry')}
                  className={
                    'rail-entry ' + (entry?.id === e.id ? 'selected' : '')
                  }
                  onClick={() => go('entry:' + e.id)}
                >
                  <span className="rail-entry-dot" />
                  <div>
                    <h3>{e.title || 'Untitled thought'}</h3>
                    <p>
                      {formatEntryDate(e)} <span>·</span>{' '}
                      {e.sample
                        ? 'Sample'
                        : e.mode === 'Free Journal'
                          ? 'Journal'
                          : 'Reflection'}
                    </p>
                  </div>
                </button>
              ))}
            {ready &&
              !entries.some((e) =>
                ((e.title || '') + ' ' + (e.text || ''))
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              ) && (
                <p className="rail-empty">
                  {entries.length
                    ? 'No entries match your search.'
                    : 'Your first thought belongs here.'}
                </p>
              )}
          </div>
          <button className="all-entries" onClick={() => go('History')}>
            All entries <span>{entries.length}</span>
          </button>
          <div className="rail-reminder">
            <Feather size={18} />
            <p>
              One thought at a time
              <br />
              is enough.
            </p>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <button
            className={'nav-item ' + (view === 'Settings' ? 'active' : '')}
            onClick={() => go('Settings')}
          >
            <Settings size={18} />
            Settings & privacy
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="profile profile-button" aria-label="User profile settings">
              <div className="profile-avatar-wrap">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="profile-avatar-img"
                  />
                ) : (
                  <span className="profile-avatar-fallback">
                    {(user?.displayName || user?.email || 'S')[0].toUpperCase()}
                  </span>
                )}
                {user && <span className="profile-status-indicator" />}
              </div>
              <div className="profile-info">
                <span className="profile-name">
                  {user?.displayName || (user ? 'Authenticated User' : 'Your workspace')}
                </span>
                <span className="profile-email" title={user?.email || 'Device-local demo'}>
                  {formatDisplayEmail(user?.email)}
                </span>
              </div>
              <ChevronDown size={14} className="profile-chevron" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="entry-menu">
              <DropdownMenuItem onClick={() => go('Settings')}>
                <Settings size={14} className="mr-2 inline" /> Privacy & data controls
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExit()}>
                <LogOut size={14} className="mr-2 inline" /> {user ? 'Sign out' : 'Leave demo / sign in'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <main
        id="main-content"
        tabIndex={-1}
        className={
          'workspace renewed-workspace ' + (focus ? 'workspace-focused' : '')
        }
      >
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button"
              aria-label="Toggle journal sidebar"
              onClick={toggleSidebar}
            >
              <PanelLeft size={18} />
            </button>
            <span>My space</span>
            <span className="breadcrumb-slash">/</span>
            <strong>
              {editor ? 'Journal' : view === 'Overview' ? 'Overview' : view}
            </strong>
          </div>
          <div className="topbar-actions-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="topbar-theme-trigger"
                aria-label="Customize theme & background artwork"
                title="Theme & Atmosphere"
              >
                <Palette size={15} />
                <span className="topbar-theme-label">Atmosphere</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="theme-quick-menu">
                <div className="theme-menu-section-title">Color Palette</div>
                {themeList.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onClick={() => journal.patchPreferences({ theme: t.id })}
                    className="theme-menu-item"
                  >
                    <span
                      className="theme-menu-swatch"
                      style={{ background: t.primary, borderColor: t.border }}
                    />
                    <span className="theme-menu-name">{t.name}</span>
                    {preferences.theme === t.id && (
                      <Check size={14} className="theme-menu-check ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
                <div className="theme-menu-divider" />
                <div className="theme-menu-section-title">Corner Artwork</div>
                {motifList.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => journal.patchPreferences({ backgroundMotif: m.id })}
                    className="theme-menu-item"
                  >
                    <span className="theme-menu-icon">{m.icon}</span>
                    <span className="theme-menu-name">{m.name}</span>
                    {preferences.backgroundMotif === m.id && (
                      <Check size={14} className="theme-menu-check ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="topbar-profile-container">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="topbar-user-badge" aria-label="Account details">
                    <div className="topbar-avatar-wrap">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          className="topbar-avatar-img"
                        />
                      ) : (
                        <span className="topbar-avatar-fallback">
                          {(user.displayName || user.email || 'S')[0].toUpperCase()}
                        </span>
                      )}
                      <span className="topbar-avatar-dot" />
                    </div>
                    <div className="topbar-user-text">
                      <span className="topbar-user-name">
                        {user.displayName || 'Sagar Kesarkar'}
                      </span>
                      <span className="topbar-user-status">Cloud Synced</span>
                    </div>
                    <ChevronDown size={13} className="topbar-chevron" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="entry-menu">
                    <DropdownMenuItem onClick={() => go('Settings')}>
                      <Settings size={14} className="mr-2 inline" /> Settings & privacy
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExit()}>
                      <LogOut size={14} className="mr-2 inline" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="topbar-guest-wrap">
                  <button
                    className="topbar-guest-btn"
                    onClick={() => onExit()}
                    title="Sign in with Google to sync notes"
                  >
                    <span className="guest-dot" />
                    <span>Guest Mode</span>
                    <span className="topbar-signin-chip">Sign in</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <BackgroundMotif motif={preferences.backgroundMotif} />
        {!journal.online && (
          <output className="global-notice">
            You’re offline. Writing and device-local saves remain available.
          </output>
        )}
        {journal.storageError && (
          <p className="global-error" role="alert">
            {journal.storageError}
          </p>
        )}
        {!ready ? (
          <div className="journal-loading" aria-label="Loading your journal">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-10 h-56 w-full" />
          </div>
        ) : view.startsWith('entry:') && !entry ? (
          <div className="empty-state">
            <BookOpen />
            <h2>This entry isn’t here.</h2>
            <p>It may have been deleted or saved in another browser.</p>
            <button className="primary" onClick={() => go('History')}>
              Open journal history
            </button>
          </div>
        ) : editor ? (
          <Workbench
            key={key + (view === 'Voice reflection' ? ':voice' : '')}
            initialVoice={view === 'Voice reflection'}
            saveDraft={(id, d) => journal.patchDraft(id, d)}
            entry={entry}
            entries={entries}
            draft={draft}
            patch={(p) => journal.patchDraft(key, p, entry)}
            saveEntries={journal.update}
            deleteEntry={journal.deleteEntry}
            removeDraft={() => journal.removeDraft(key)}
            navigate={go}
            focus={focus}
            setFocus={setFocus}
            threadStatus={preferences.statuses}
          />
        ) : (
          <div className="page-content">
            {view === 'Overview' ? (
              <Overview entries={entries} navigate={go} />
            ) : (
              <Features
                view={view}
                entries={entries}
                navigate={go}
                update={journal.update}
                deleteEntry={journal.deleteEntry}
                notify={toast}
                preferences={preferences}
                patchPreferences={journal.patchPreferences}
                clearDrafts={journal.clearDrafts}
              />
            )}
          </div>
        )}
        <nav
          className={'mobile-nav ' + (focus ? 'mobile-focus-hidden' : '')}
          aria-label="Main navigation"
        >
          {[
            {
              Icon: LayoutDashboard,
              label: 'Overview',
              short: 'Overview',
            },
            { Icon: Search, label: 'History', short: 'History' },
            { Icon: Plus, label: 'New entry', short: 'Write' },
            { Icon: GitBranch, label: 'Recurring threads', short: 'Threads' },
            { Icon: CalendarDays, label: 'Weekly review', short: 'Review' },
          ].map(({ Icon, label, short }) => (
            <button
              key={short}
              aria-current={view === label ? 'page' : undefined}
              onClick={() => go(label)}
            >
              <Icon size={19} />
              {short}
            </button>
          ))}
          <button
            aria-label="Open settings and navigation"
            onClick={toggleSidebar}
          >
            <Menu size={19} />
            More
          </button>
        </nav>
        <Toaster position="bottom-right" />
      </main>
    </>
  );
}
