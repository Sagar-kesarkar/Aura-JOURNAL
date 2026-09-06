# Aura Journal — Secure, Authenticated Reflection Engine

[![Cloud Run AI Challenge](https://img.shields.io/badge/Google%20Cloud%20Run-AI%20Challenge-4285F4?logo=google-cloud&logoColor=white)](https://cloud.google.com/run)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Security: Hardened](https://img.shields.io/badge/Security-Hardened%20(Zero--Trust)-success)](#security-architecture)

**Aura Journal** is an enterprise-grade, secure multi-turn journaling and reflective intelligence web application built for the **Google Cloud Run Build & Deploy Social Challenge**. It combines **Firebase Authentication (Google Identity Services)**, **Cloud Firestore** with Zero-Trust owner-isolated security rules, and server-side **Gemini AI** with an automated 4-tier model fallback ladder.

---

## Challenge Metadata & Verification

- **Target Service**: `aura-journal`
- **Mandatory Challenge Resource Label**: `dev-tutorial=cloud-run-ai-challenge`
- **Platform**: Google Cloud Run (Managed, Serverless Container)
- **Port**: `3000` (Bound to `0.0.0.0`)

```bash
# Verify the mandatory challenge label on your deployed Cloud Run service
gcloud run services describe aura-journal \
  --region=us-central1 \
  --format="value(metadata.labels['dev-tutorial'])"
# Expected output: cloud-run-ai-challenge
```

---

## 1. Security Architecture & Threat Summary (5 Threat Zones)

Aura Journal enforces defense-in-depth across the 5 primary threat zones:

| Threat Zone | Identified Vectors | Implemented Countermeasures & Directives | Verification Test |
| :--- | :--- | :--- | :--- |
| **1. Input Surfaces** | Prompt injection in journal entries, prototype pollution (`__proto__`, `constructor`), malformed JSON, payload flooding. | Top-level JSON body parser with strict size limits; `containsPrototypePollution` validation rejecting malicious payloads with `400 Bad Request`; text length bounding (max 4,000 chars/message, max 50 turns); recursive `stripUndefined` sanitizer before Firestore persistence. | `tests/backend-auth.test.ts` (Tests 5 & 6) |
| **2. Planning & Reasoning** | System instruction bypass, jailbreak prompts, prompt extraction, unauthorized conversational framing. | Demarcates user journal inputs strictly as raw data payloads; enforces mode-specific system prompts (`reflection`, `summary`, `brainstorm`, `action_items`) that neutralize conversational manipulation. | Server-side Gemini prompt isolation |
| **3. Tool & API Execution** | Server-Side Request Forgery (SSRF), Gemini API key leakage, quota starvation, service denial. | 100% server-side API proxy (`/api/gemini/*`); zero client-side API keys. Helmet security headers (CSP, frameguard, XSS protection). IP & UID sliding-window rate limiters (20 req/min). Resilient 4-tier fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`). | `tests/backend-auth.test.ts` (Tests 2, 3, 4) |
| **4. Memory & State** | Cross-tenant reflection access, insecure direct object references (IDOR), session hijacking, data leak on sign-out. | Strict UID path checking in `firestore.rules` (`request.auth.uid == userId`); Master Gate pattern; server-side Firebase ID token verification via `requireAuth` middleware; immediate in-memory cache purge on sign-out (`sessionStorage.clear()`, entries reset). | `tests/firestore-rules.test.ts` (Scenarios 1–10) & `tests/backend-auth.test.ts` (Tests 7–10) |
| **5. Inter-System Communication** | In-transit token interception, unvalidated external egress, hardcoded credentials in source control. | Strict HTTPS transport; Google Cloud Secret Manager integration (`access_secret` & runtime env binding); zero hardcoded keys; safe `.env.example` placeholders; privacy-preserving request logging with redacted PII and masked tokens. | `tests/backend-auth.test.ts` (Test 1) & Secret Manager Audit |

---

## 2. Environment & Prerequisites

Ensure the required Google Cloud APIs are enabled:

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

Ensure you have the following installed locally:
- Node.js 22+ & npm 10+
- Google Cloud SDK (`gcloud` CLI)
- Firebase CLI (`firebase-tools`)

---

## 3. Secret Management Setup (Zero-Hardcoding Standard)

Aura Journal strictly bans hardcoded API keys. Create the `GEMINI_API_KEY` secret in Google Cloud Secret Manager and grant the Cloud Run runtime service account access:

```bash
# 1. Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add the Gemini API key version
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Retrieve your project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

# 4. Grant the default Cloud Run compute service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Cloud Firestore Security Rules

Deploy the owner-bound security rules to ensure complete user isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions for security validation
    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // User-isolated root tree: all journal data lives under /users/{userId}
    match /users/{userId} {
      allow read, write: if isOwner(userId);

      // Entries collection (multi-turn journal entries & reflections)
      match /entries/{entryId} {
        allow read, write: if isOwner(userId);
      }

      // Legacy & secondary interaction logs
      match /interactions/{interactionId} {
        allow read, write: if isOwner(userId);
      }

      // Recursive subcollections under the user
      match /{allSubcollections=**} {
        allow read, write: if isOwner(userId);
      }
    }

    // Explicit default-deny catch-all for all unexpected collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy the rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## 5. Google Cloud Run Deployment Flow

### Environment Variable Specification

| Variable Name | Classification | Environment | Required? | Description & Semantics |
| :--- | :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Secret** | Production & Dev | **Required** for AI | Secret credential for Gemini API; injected exclusively via Google Cloud Secret Manager. Never sent to client or logged. |
| `GOOGLE_CLOUD_PROJECT` | **Configuration** | Production & Dev | **Required** in Prod | Google Cloud project ID for Firebase Admin SDK token verification. In development preview, derived from valid `firebase-applet-config.json` if unset. |
| `ALLOWED_ORIGINS` | **Configuration** | Production | **Required** in Prod | Comma-separated list of exact permitted origins for production CORS (e.g. `https://aura-journal-xyz-uc.a.run.app`). Rejects wildcards. |
| `GEMINI_MODEL` | **Configuration** | Production & Dev | **Required / Supplied** | Configured primary Gemini model identifier (e.g. `gemini-3.8-flash`). Note: Live availability not yet verified until live calls succeed. |
| `NODE_ENV` | **Configuration** | All | **Required** | Runtime environment mode (`production`, `development`, or `test`). |
| `GEMINI_FALLBACK_MODELS` | **Configuration** | Production & Dev | Optional | Configured optional fallback model identifiers as a comma-separated list. If unset, only the primary model is used. |
| `APP_URL` | **Configuration** | Production | Optional | Canonical application URL for metadata and absolute references. Not used for CORS allowlists. |

*Note: While the AI Studio interface visually masks all environment variables, they are classified above according to their security attributes.*

### Deployment Command

Build and deploy the containerized application to Google Cloud Run, injecting `GEMINI_API_KEY` directly from Secret Manager:

```bash
# 1. Deploy the service to Google Cloud Run
gcloud run deploy aura-journal \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,ALLOWED_ORIGINS=https://your-cloud-run-domain,GEMINI_MODEL=gemini-3.8-flash,NODE_ENV=production" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --labels="dev-tutorial=cloud-run-ai-challenge"
```

Or if you need to update an existing deployment with the mandatory challenge label:
```bash
# 2. Apply / update mandatory challenge label
gcloud run services update aura-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Automated Testing & Verification

Run the comprehensive 21-test security suite (covering backend authentication, input validation, prototype pollution defense, cross-user isolation, and Firestore security rules):

```bash
npm test
```

### Test Suite Summary:
- **Backend Auth & Security Tests (10 tests)**:
  - Public health endpoint check (`/api/health`)
  - Missing token rejection with `401 Unauthorized`
  - Invalid/malformed token rejection with `401 Unauthorized`
  - Missing token on AI summarization rejection (`401`)
  - Empty or invalid payload rejection with `400 Validation error`
  - Prototype pollution injection defense (`400 Bad Request`)
  - Authorized User A export verification (`200 OK`)
  - Cross-user export denial (`403 Forbidden` when User A requests User B data)
  - Cross-user deletion denial (`403 Forbidden`)
  - Authorized User B export verification (`200 OK`)
- **Firestore Security Rules Tests (11 tests)**:
  - Verification of zero insecure defaults in rule file
  - Unauthenticated reads denied
  - Unauthenticated writes/creates/deletes denied
  - User A permitted to read/write under `/users/user-a/*`
  - User B permitted to read/write under `/users/user-b/*`
  - User A reading User B entries denied
  - User A updating/deleting User B records denied
  - User B reading/updating/deleting User A records denied
  - Path ownership hijacking prevention
  - Access to arbitrary/unexpected collections denied by default-deny catch-all
  - Unauthenticated access to root/arbitrary paths rejected

---

## 7. Functional Stability & Walkthrough Test Plan

Every user-facing feature has a step-by-step walkthrough for functional verification:

### Test Case 1: Unauthenticated Landing & Google Sign-In
1. Navigate to the application root URL.
2. Verify the Landing Page renders with the Aura Journal identity, security posture badges, and sign-in buttons.
3. Click **Sign in with Google** (`#google-signin-btn`).
4. If cancelled, verify the error banner displays: *"Sign-in popup was closed before completing. Click Sign in with Google to retry."*
5. Authenticate with a valid Google account.
6. Verify immediate transition to the private Dashboard displaying user avatar, name, and entry count.

### Test Case 2: Multi-Turn Journal Reflection with Gemini
1. In the active journal view, select the reflective mode (e.g., **Reflection**, **Philosophical**, **Cognitive Reframing**, or **Gratitude**).
2. Enter a custom title or keep default *"Untitled Reflection"*.
3. Type an initial entry: *"I had to make a high-stakes decision on architecture today and struggled with balancing immediate speed versus long-term security."*
4. Click **Send Reflection** or press `Cmd/Ctrl + Enter`.
5. Verify the user message is rendered immediately and status shows **Synced to Firestore**.
6. Verify Gemini streams/generates an empathetic, thought-provoking reflection.
7. Send a follow-up response: *"I decided to prioritize defense-in-depth because security cannot be easily retrofitted."*
8. Verify Gemini responds contextually in the multi-turn thread.

### Test Case 3: AI Semantic Synthesis & Summarization
1. Click **AI Analysis** (`#summarize-btn`).
2. Verify contemplative spinner activates while Gemini synthesizes the session.
3. Verify the **AI Semantic Synthesis** card renders with:
   - Evaluated Sentiment badge (e.g., *Reflective*, *Analytical*, *Grounded*)
   - Executive 2-3 sentence summary
   - Key Takeaways bulleted list
   - Thematic hashtag tags (e.g., `#security`, `#architecture`)
4. Confirm both the user inputs and AI analysis are persisted to Firestore without undefined properties.

### Test Case 4: Owner-Bound History & Search
1. Click the **History** button (`#toggle-history-btn`) in the navigation bar.
2. Confirm previous reflections appear ordered chronologically.
3. Type a keyword in the search bar and verify matching entries filter dynamically.
4. Click **New Reflection** (`#new-entry-btn`). Confirm an empty workspace opens.
5. Click a historical entry. Confirm all conversation turns and AI analysis load accurately.

### Test Case 5: Security Architecture Modal Inspection
1. Click the **Security Architecture** button (`#threat-model-btn`) in the top navigation bar.
2. Inspect the 5 Threat Zones table, defense-in-depth matrix, and live Firestore rules.
3. Close the modal (`Esc` or close button).

### Test Case 6: Theme & Design Layout Gallery
1. Click the **Design & Themes** button (`#theme-selector-btn`) in the header or editor.
2. Switch between **Professional Polish**, **Obsidian Minimal**, **Editorial Serif**, and **Nordic Forest**.
3. Toggle layout styles: **Interactive Cards**, **Segmented Switcher**, or **Compact Minimal**.
4. Confirm theme preferences persist in `localStorage`.

### Test Case 7: Secure Sign Out & Memory Purge
1. Click **Sign Out** (`#sign-out-btn`).
2. Verify the session terminates, all in-memory user entries are immediately cleared, and the landing page renders.
3. Attempting to navigate back or inspect memory confirms zero cached entries remain.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
