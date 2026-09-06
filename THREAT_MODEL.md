# Agentic Threat Model — Aura Journal

## Overview
Aura Journal implements a comprehensive security threat model covering all 5 architectural Threat Zones. Every attack vector is systematically paired with active countermeasures, defense layers, and automated verification tests.

---

## The 5 Threat Zones Matrix

| Threat Zone | Asset & Boundary | Identified Threat Scenarios | Risk Level | Active Countermeasures | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Zone 1: Input Surfaces** | REST API Request Bodies, Journal Entries, Headers | - Prototype pollution injection (`__proto__`, `constructor`)<br>- Prompt injection attempting to alter assistant persona<br>- Excessively large payloads causing memory exhaustion | High | - `containsPrototypePollution` validation middleware<br>- Message content capped at 4,000 chars<br>- Maximum 50 conversation turns<br>- Strict JSON body deserialization ordering | `tests/backend-auth.test.ts` (Tests 5 & 6) |
| **Zone 2: Planning & Reasoning** | System Directives, Gemini Generation Pipeline | - Jailbreak instructions embedded in user reflection<br>- Attempts to extract internal system prompt instructions<br>- Tone manipulation into non-reflective behaviors | Medium | - User entries demarcated as inert data payloads<br>- Rigid mode-specific system prompts (`reflection`, `summary`, `brainstorm`, `action_items`)<br>- Output schema verification | Server-side Gemini pipeline |
| **Zone 3: Tool & API Execution** | Server-Side Gemini API Proxy, Model Invocation | - Gemini API key exposure in browser network requests<br>- Rate limit exhaustion & API starvation<br>- Model downtime or 503 outage | Critical | - Zero client-side API keys; server-only proxy<br>- Sliding-window rate limiting (20 req/min per IP/UID)<br>- Configured primary model with optional configured fallback ladder (`GEMINI_FALLBACK_MODELS`) | `tests/backend-auth.test.ts` (Tests 2, 3, 4) |
| **Zone 4: Memory & State** | Cloud Firestore, User Sessions, Browser Storage | - Cross-tenant read/write (IDOR)<br>- Unauthorized journal deletion<br>- Stale cache exposure after sign-out | Critical | - `firestore.rules` enforcing `request.auth.uid == userId`<br>- Master Gate default-deny catch-all<br>- Server `requireAuth` JWT validation on export/delete<br>- Immediate memory and session purge on logout | `tests/firestore-rules-static.test.ts` (All 11 tests) & `tests/backend-auth.test.ts` (Tests 7–10) |
| **Zone 5: Inter-System Communication** | Egress to Google APIs, Secret Injection, Logs | - Hardcoded API keys in repository or container layers<br>- Token leakage in application log streams<br>- MITM interception | High | - Google Cloud Secret Manager runtime injection<br>- Zero hardcoded credentials; safe `.env.example`<br>- Privacy-preserving logger redacting PII and masking Bearer tokens<br>- HTTPS/TLS 1.3 | Server logging & Secret Manager bindings |

---

## Verification & Audit Command
To execute the automated regression test suite validating the entire threat model:
```bash
npm test
```
