# Weekly activity and thread visuals

Active frontend: D:/gemini-reflection-&-journal/frontend google.

Overview now shows a decorative, theme-aware thread illustration and a real Monday-to-Sunday activity tracker. Each successful local save of changed title/body/user follow-up appends an ISO timestamp to Entry.activityAt. Unchanged saves, AI replies, visiting the page and untouched sample entries do not count. Multiple writing changes on one day count separately; the day dot indicates any activity. Counts use the device's local timezone.

History is persisted inside each entry, retained by normalizeEntry, and included by the existing saveCloudEntry spread in Firestore. Cloud account/device synchronization was not exercised; normal cloud errors still apply. Deleting an entry removes its activity from the displayed totals. Earlier entries without history use known creation/latest-update timestamps only, not invented intermediate edits. The recurring-thread graphic is illustrative; it is not an AI-generated topic chart.

Files: app/journal-activity.ts, app/journal-data.ts, app/use-journal.ts, app/overview.tsx, app/globals.css. Tests: tests/journal-activity.test.mjs.

Run: node --experimental-strip-types --test --test-isolation=none tests/journal-activity.test.mjs

Validation: three tracking tests passed. Full TypeScript checking reports existing errors in lib/api.ts (unknown errorData) and lib/firebase.ts (possibly undefined app ID), outside this change.