'use client';
/* oxlint-disable react/react-compiler -- Hydrates browser-owned data only after server rendering. */
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  readEntries,
  readDrafts,
  saveEntries,
  saveDrafts,
  emptyDraft,
  defaultPreferences,
  preferenceKey,
  hashToView,
  viewToHash,
  samples,
  type Draft,
  type Entry,
  type Preferences,
} from './journal-data';
import {
  saveCloudEntry,
  deleteCloudEntry,
  subscribeToCloudEntries,
} from '../lib/journal-service';
import { deleteJournalEntryApi } from '../lib/api';

export function useJournal(userId?: string) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const draftsRef = useRef<Record<string, Draft>>({});
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);
  const prefsRef = useRef(defaultPreferences);
  const [view, setView] = useState('Overview');
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [storageError, setStorageError] = useState('');
  const readable = useRef(true);
  const draftsReadable = useRef(true);
  useEffect(() => {
    try {
      const initial = readEntries(localStorage);
      setEntries(initial);
      let loaded: Record<string, Draft> = {};
      try {
        loaded = readDrafts(sessionStorage);
      } catch {
        draftsReadable.current = false;
        setStorageError(
          'Saved drafts could not be read. New writing will remain in this tab without replacing those drafts.',
        );
        toast.error(
          'Draft storage could not be read. Existing browser data was left untouched.',
        );
      }
      draftsRef.current = loaded;
      setDrafts(loaded);
      try {
        const raw = localStorage.getItem(preferenceKey);
        const p = raw ? JSON.parse(raw) : {};
        const next = { ...defaultPreferences };
        for (const k of [
          'feedback',
          'cadence',
          'reviewTime',
          'windowDays',
          'concept',
          'theme',
          'backgroundMotif',
        ] as const)
          if (typeof p[k] === 'string') (next as any)[k] = p[k];
        if (typeof p.weekly === 'boolean') next.weekly = p.weekly;
        if (
          p.statuses &&
          typeof p.statuses === 'object' &&
          !Array.isArray(p.statuses)
        )
          next.statuses = Object.fromEntries(
            Object.entries(p.statuses).filter(([, v]) =>
              ['active', 'resolved', 'dismissed'].includes(String(v)),
            ),
          ) as Record<string, string>;
        prefsRef.current = next;
        setPreferences(next);
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', next.theme || 'sage');
          document.documentElement.setAttribute('data-motif', next.backgroundMotif || 'none');
        }
      } catch {
        toast.error('Preferences were reset; journal entries were kept.');
      }
      const initialView = window.location.hash
        ? hashToView(window.location.hash)
        : 'Overview';
      setView(initialView);
      if (!window.location.hash)
        window.history.replaceState(null, '', viewToHash(initialView));
    } catch {
      readable.current = false;
      setStorageError(
        'Device storage could not be read. Saving is paused to avoid overwriting existing data.',
      );
    }
    setReady(true);
    setOnline(navigator.onLine);
    const hash = () => setView(hashToView(window.location.hash));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('hashchange', hash);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    let unsubCloud: (() => void) | undefined;
    if (userId) {
      try {
        unsubCloud = subscribeToCloudEntries(
          userId,
          (cloudEntries) => {
            if (cloudEntries && cloudEntries.length > 0) {
              setEntries(cloudEntries);
              try {
                saveEntries(localStorage, cloudEntries);
              } catch {
                // Ignore local storage sync error
              }
            }
          },
          (err) => {
            console.warn('Firestore subscription fallback to local storage:', err);
          }
        );
      } catch (err) {
        console.warn('Cloud listener init warning:', err);
      }
    } else {
      // Unauthenticated / signed out: ensure complete cross-user state isolation
      try {
        const demo = readEntries(localStorage);
        setEntries(demo);
      } catch {
        setEntries(samples.map((e) => ({ ...e })));
      }
    }

    return () => {
      window.removeEventListener('hashchange', hash);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      if (unsubCloud) unsubCloud();
    };
  }, [userId]);
  const navigate = useCallback((v: string) => {
    const destination = viewToHash(v);
    if (window.location.hash !== destination)
      window.location.hash = destination;
    setView(v);
  }, []);
  const patchDraft = useCallback(
    (key: string, patch: Partial<Draft>, entry?: Entry) => {
      const next = {
        ...draftsRef.current,
        [key]: { ...(draftsRef.current[key] || emptyDraft(entry)), ...patch },
      };
      draftsRef.current = next;
      setDrafts(next);
      try {
        if (!draftsReadable.current) return;
        saveDrafts(sessionStorage, next);
        if (readable.current) setStorageError('');
      } catch {
        setStorageError(
          'Your draft is kept in this tab, but could not be stored for refresh. Keep this tab open and export your writing.',
        );
      }
    },
    [],
  );
  const removeDraft = useCallback((key: string) => {
    const next = { ...draftsRef.current };
    delete next[key];
    draftsRef.current = next;
    setDrafts(next);
    try {
      if (draftsReadable.current) saveDrafts(sessionStorage, next);
    } catch {
      toast.error(
        'The saved entry is available, but its old draft could not be cleared.',
      );
    }
  }, []);
  const update = useCallback((next: Entry[]) => {
    if (!readable.current) {
      toast.error(
        'Storage is unreadable. Existing data has not been overwritten.',
      );
      return false;
    }
    try {
      saveEntries(localStorage, next);
      setEntries(next);
      if (userId) {
        for (const item of next) {
          saveCloudEntry(userId, item).catch((err) => {
            console.warn('Firestore cloud sync warning:', err);
          });
        }
      }
      return true;
    } catch {
      toast.error(
        'Save failed. Your draft remains in this tab. Free up browser storage and retry.',
      );
      return false;
    }
  }, [userId]);
  const patchPreferences = useCallback((patch: Partial<Preferences>) => {
    const next = { ...prefsRef.current, ...patch };
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(next));
      prefsRef.current = next;
      setPreferences(next);
      if (typeof document !== 'undefined') {
        if (next.theme) document.documentElement.setAttribute('data-theme', next.theme);
        if (next.backgroundMotif) document.documentElement.setAttribute('data-motif', next.backgroundMotif);
      }
      return true;
    } catch {
      toast.error('Could not save that preference. Please try again.');
      return false;
    }
  }, []);
  const clearDrafts = useCallback(() => {
    draftsRef.current = {};
    setDrafts({});
    try {
      saveDrafts(sessionStorage, {});
      draftsReadable.current = true;
    } catch {
      toast.error(
        'Some saved drafts could not be cleared. Check browser storage before sharing this device.',
      );
    }
  }, []);
  const deleteEntry = useCallback(
    async (entryId: string) => {
      const next = entries.filter((e) => e.id !== entryId);
      setEntries(next);
      try {
        saveEntries(localStorage, next);
      } catch {}
      removeDraft(entryId);
      if (userId) {
        try {
          await deleteCloudEntry(userId, entryId);
        } catch (err) {
          console.warn('Firestore cloud delete warning:', err);
        }
        try {
          await deleteJournalEntryApi(userId, entryId);
        } catch {}
      }
      return true;
    },
    [entries, userId, removeDraft],
  );

  return {
    entries,
    drafts,
    preferences,
    view,
    ready,
    online,
    storageError,
    navigate,
    patchDraft,
    removeDraft,
    update,
    deleteEntry,
    patchPreferences,
    clearDrafts,
  };
}
