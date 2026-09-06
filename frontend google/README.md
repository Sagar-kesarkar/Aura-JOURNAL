# Aura Journal frontend

Aura Journal's conversation-first replacement frontend, using the original editorial green theme and preserving the overview, history, voice recording, recurring thread examples, weekly review, design concepts and data controls.

## Run and check

Use Node 22.13+ and npm:

- `npm install`
- `npm run dev` — local preview on port 3000
- `npm run build` — production bundle
- `npx tsc --noEmit` — type checking
- `npx oxlint app` — application lint
- `npm run test:data` — regression tests against the actual data helpers

Repository-wide `npm run lint` also inspects unmodified generated UI components and the starter mobile hook; those previously reported lint errors are outside this frontend replacement. No claim is made that repository-wide lint passes.

## Entrance flow

The website first renders a standalone welcome/sign-in page in the Aura theme. Workspace content and browser journal data are not mounted until the user selects Explore the demo. That action always opens Overview, ignoring any earlier entry hash. The Google sign-in button explains that Firebase Authentication is not configured; it never simulates a signed-in account.

Demo access lasts for the current page load. Refreshing or reopening the website shows the welcome page again; saved device-local entries and tab drafts are retained. Leave demo / sign in returns to the welcome page and unmounts the workspace. This is a frontend navigation gate, not an authentication/security boundary. Browser Back works between workspace views during the demo.

## Interface

- History rail with search and entry selection; overview remains available.
- Conversation and writing tabs, editable titles, five reflection modes, manual local saves, saved user follow-ups, copy entry, delete confirmation and focus mode.
- Entry-scoped drafts and unsent follow-ups survive navigation and refresh within the tab. Voice transcripts merge into the correct draft field. Browser Back and refresh use hash routes.
- Side insights on wide screens, a sheet on smaller screens, and mobile bottom navigation.
- Optional user-triggered read-aloud of the first fictional sample reflection with pause/resume, stop, replay and speed choice.
- Real microphone recording with permission request, timer, audio level meter, pause/resume, stop, cancellation, playback and editable manual transcript. Duration is limited to three minutes; recordings over 10 MB are rejected. Audio is not uploaded or retained after closing the recorder.
- Recurring sample threads can be resolved, dismissed, filtered or reopened. Status, review feedback, opt-in, review day/time and lookback preferences are stored locally.
- JSON export includes saved entries and follow-ups. Delete-all clears entries and drafts. Six small design treatments remain in Settings.

## Data and integration scope

This is a device-local frontend demonstration, not a secure production journaling service. Do not use real private writing. Google/Firebase authentication, Firestore, Gemini, automatic transcription, semantic thread detection, scheduled synthesis, crisis detection, server authorization and Cloud Run deployment are not implemented. Buttons for unconnected services explain that state without sending any writing or inventing generated results. Insights and the weekly review are explicitly fictional samples. The first sample conversation is prewritten, not a live Gemini response.

Existing entries under `aura-demo-entries` are preserved. Entries remain unencrypted in localStorage, with real timestamps for new saves. `aura-drafts-v2` in sessionStorage separates draft state by entry ID; the legacy `aura-draft` is migrated on the first successful draft write. `aura-preferences-v2` contains device-local preferences. Malformed entry storage pauses saving rather than overwriting it. When draft writes fail, writing remains in memory and a visible error explains the refresh risk.

The original Sites configuration and project ID are retained. The previous hosted version is not automatically replaced by local edits. Publishing is a separate operation. The local preview and a deployed Sites origin have separate browser storage; moving between them does not transfer entries.

## Source structure

- `app/page.tsx`: navigation and responsive workspace shell
- `app/workbench.tsx`: journal conversation, editor and insight panels
- `app/use-journal.ts`: browser persistence and view state
- `app/journal-data.ts`: validated reads, migration, draft merging, routes and metadata
- `app/voice-dialog.tsx`: microphone recording and transcript review
- `app/features.tsx`: history, threads, reviews, settings and welcome screen
- `app/overview.tsx`: preserved overview dashboard
- `tests/journal-data.test.mjs`: storage, migration, draft and navigation regression tests

## Validation limits

Data tests exercise the actual shared helpers, including failure and migration paths. They are not Firebase, authentication, microphone-device, browser-interaction or security tests. Browser visual QA and real microphone testing have not been performed. Optional WebMCP `start_journal_entry` is feature-detected; its contract has not been verified in a supported WebMCP context.

Before production use, connect verified-UID backend APIs and Firebase Google authentication; enforce authorization, crisis deferral and response validation server-side; and complete production security and account-isolation tests. Never put Gemini credentials or service-account secrets in browser code.
