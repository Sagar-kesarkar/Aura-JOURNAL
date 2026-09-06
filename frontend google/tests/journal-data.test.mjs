import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readEntries,
  saveEntries,
  entryKey,
  readDrafts,
  saveDrafts,
  draftKey,
  emptyDraft,
  mergeTranscript,
  remainingDraftAfterSave,
  formatEntryDate,
  readingMinutes,
  viewToHash,
  hashToView,
  samples,
  normalizeEntry,
} from '../app/journal-data.ts';
class MemoryStorage {
  values = new Map();
  failWrites = false;
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    if (this.failWrites) throw new Error('Quota exceeded');
    this.values.set(key, value);
  }
  removeItem(key) {
    this.values.delete(key);
  }
}
test('old saved journal entries are retained and unsupported relative dates are not invented', () => {
  const storage = new MemoryStorage();
  const old = {
    id: 'old',
    title: 'Existing entry',
    text: 'Keep this writing',
    date: 'Today',
    mode: 'Free Journal',
    tag: 'Personal',
  };
  storage.setItem(entryKey, JSON.stringify([old]));
  const loaded = readEntries(storage);
  assert.equal(loaded[0].text, old.text);
  assert.equal(loaded[0].sample, false);
  assert.equal(formatEntryDate(loaded[0]), 'Earlier entry');
  assert.equal(storage.getItem(entryKey), JSON.stringify([old]));
});
test('deleted-all state stays empty on refresh instead of restoring fictional samples', () => {
  const storage = new MemoryStorage();
  saveEntries(storage, []);
  assert.deepEqual(readEntries(storage), []);
});
test('invalid stored entries fail without overwriting original data', () => {
  const storage = new MemoryStorage();
  storage.setItem(entryKey, 'broken data');
  assert.throws(() => readEntries(storage));
  assert.equal(storage.getItem(entryKey), 'broken data');
  storage.setItem(entryKey, JSON.stringify([samples[0], samples[0]]));
  assert.throws(() => readEntries(storage), /Duplicate/);
});
test('saving entries reports quota failure and preserves previously saved journal', () => {
  const storage = new MemoryStorage();
  saveEntries(storage, [samples[0]]);
  storage.failWrites = true;
  assert.throws(() => saveEntries(storage, []), /Quota/);
  assert.equal(readEntries(storage)[0].text, samples[0].text);
});
test('entry edits and unsent follow-ups remain isolated across draft save and reload', () => {
  const storage = new MemoryStorage();
  const drafts = {
    one: {
      ...emptyDraft(samples[0]),
      body: 'Edited first entry',
      followup: 'Unsent first follow-up',
    },
    two: { ...emptyDraft(samples[1]), body: 'Second entry' },
  };
  saveDrafts(storage, drafts);
  const reloaded = readDrafts(storage);
  assert.equal(reloaded.one.body, 'Edited first entry');
  assert.equal(reloaded.one.followup, 'Unsent first follow-up');
  assert.equal(reloaded.two.body, 'Second entry');
});
test('legacy new draft survives migration and voice transcript appends rather than replacing it', () => {
  const storage = new MemoryStorage();
  storage.setItem(
    'aura-draft',
    JSON.stringify({
      title: 'Existing draft',
      body: 'Typed before recording',
      mode: 'Free Journal',
    }),
  );
  const drafts = readDrafts(storage);
  const combined = mergeTranscript(drafts.new, ' Spoken afterwards ');
  assert.equal(combined.body, 'Typed before recording\n\nSpoken afterwards');
  assert.equal(drafts.new.body, 'Typed before recording');
  saveDrafts(storage, { new: combined });
  assert.equal(storage.getItem('aura-draft'), null);
  assert.equal(readDrafts(storage).new.title, 'Existing draft');
});
test('voice follow-up goes to the follow-up field without altering main journal text', () => {
  const draft = { ...emptyDraft(samples[0]), followup: 'First follow-up' };
  const next = mergeTranscript(draft, 'Second follow-up', 'followup');
  assert.equal(next.body, samples[0].text);
  assert.equal(next.followup, 'First follow-up\n\nSecond follow-up');
});
test('saving main entry preserves an unsent follow-up; saving the follow-up clears it', () => {
  const draft = { ...emptyDraft(samples[0]), followup: 'Do not lose this' };
  assert.equal(
    remainingDraftAfterSave(draft, samples[0], false).followup,
    draft.followup,
  );
  assert.equal(remainingDraftAfterSave(draft, samples[0], true), undefined);
});
test('every page and entry hash round-trips for refresh and browser navigation', () => {
  for (const view of [
    'New entry',
    'Voice reflection',
    'Overview',
    'History',
    'Recurring threads',
    'Weekly review',
    'Settings',
    'Welcome',
    'entry:a/b?c',
  ])
    assert.equal(hashToView(viewToHash(view)), view);
  assert.equal(hashToView('#entry/%ZZ'), 'Overview');
});
test('reading time uses text length and dates advance with the day', () => {
  assert.equal(readingMinutes('word '.repeat(401)), 3);
  const entry = {
    ...samples[0],
    updatedAt: new Date(2026, 8, 6, 10).toISOString(),
  };
  assert.equal(formatEntryDate(entry, new Date(2026, 8, 6, 20)), 'Today');
  assert.equal(formatEntryDate(entry, new Date(2026, 8, 7, 20)), 'Yesterday');
  assert.notEqual(formatEntryDate(entry, new Date(2026, 8, 8, 20)), 'Today');
});

test('readingMinutes handles undefined, null, and empty string safely', () => {
  assert.equal(readingMinutes(undefined), 1);
  assert.equal(readingMinutes(null), 1);
  assert.equal(readingMinutes(''), 1);
  assert.equal(readingMinutes('   '), 1);
  assert.equal(readingMinutes('One two three'), 1);
});

test('normalizeEntry converts legacy Firestore documents to valid Entry objects', () => {
  const legacyDoc = {
    id: 'entry-123',
    title: 'Legacy reflection',
    content: 'This was saved in the old app with content instead of text.',
    createdAt: 1712345678901,
    updatedAt: 1712345678901,
    mode: 'reflection',
    tags: ['Mindfulness', 'Personal'],
    messages: [
      {
        id: 'msg-1',
        content: 'Legacy reply message',
        role: 'user',
        timestamp: 1712345680000,
      },
    ],
  };

  const normalized = normalizeEntry(legacyDoc);
  assert.equal(normalized.id, 'entry-123');
  assert.equal(normalized.title, 'Legacy reflection');
  assert.equal(normalized.text, 'This was saved in the old app with content instead of text.');
  assert.equal(normalized.tag, 'Mindfulness');
  assert.equal(normalized.messages.length, 1);
  assert.equal(normalized.messages[0].text, 'Legacy reply message');
  assert.equal(typeof normalized.updatedAt, 'string');
  assert.equal(readingMinutes(normalized.text), 1);
});

test('readEntries successfully loads legacy entries with content instead of text', () => {
  const storage = new MemoryStorage();
  const legacyStored = [
    {
      id: 'legacy-1',
      title: 'Past entry',
      content: 'Remembering yesterday',
      updatedAt: 1712345678901,
    },
  ];
  storage.setItem(entryKey, JSON.stringify(legacyStored));
  const entries = readEntries(storage);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].text, 'Remembering yesterday');
  assert.equal(readingMinutes(entries[0].text), 1);
});

test('the workspace default is Overview, never the editor or a saved entry', () => {
  assert.equal(hashToView(''), 'Overview');
  assert.equal(hashToView('#unknown'), 'Overview');
  assert.equal(viewToHash('Overview'), '#overview');
  assert.equal(hashToView(viewToHash('Welcome')), 'Welcome');
});
