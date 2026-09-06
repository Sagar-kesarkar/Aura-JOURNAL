# Security Policy & Posture — Aura Journal

Aura Journal is designed and built following a **Zero-Trust, defense-in-depth security model**. This document outlines our security architecture, compliance with industry security frameworks, threat model, and vulnerability reporting procedures.

---

## 1. Compliance with Security Standards

### OWASP Top 10 (Web Applications)
| OWASP Vulnerability | Status | Implemented Mitigation |
| :--- | :--- | :--- |
| **A01: Broken Access Control** | **Mitigated** | User data isolation enforced at both the database layer (`firestore.rules` checking `request.auth.uid == userId`) and the server layer (`requireAuth` middleware rejecting cross-user access with `403 Forbidden`). |
| **A02: Cryptographic Failures** | **Mitigated** | All traffic served over HTTPS with TLS 1.3; sensitive API tokens passed via `Authorization: Bearer` headers; zero persistent sensitive data stored on unauthenticated clients. |
| **A03: Injection** | **Mitigated** | Strict input schema validation; prototype pollution rejection; parameterized database operations; zero SQL/NoSQL dynamic query concatenation. |
| **A04: Insecure Design** | **Mitigated** | Pre-design Agentic Threat Model covering the 5 Threat Zones; privacy-by-design logging; defensive fallback ladders. |
| **A05: Security Misconfiguration** | **Mitigated** | Zero insecure defaults in Firestore rules (`allow read, write: if false;` catch-all); Helmet HTTP security headers (CSP, HSTS, X-Content-Type-Options); production dev-tools disabled. |
| **A06: Vulnerable & Outdated Components** | **Mitigated** | Verified pinned npm dependencies; Node 22 LTS alpine base container with security patches. |
| **A07: Identification & Authentication Failures** | **Mitigated** | Passwordless federated authentication outsourced to Google Identity Services via Firebase Auth; token verification using Firebase Admin SDK; immediate session and memory purge upon sign out. |
| **A08: Software & Data Integrity Failures** | **Mitigated** | Zero dynamic code evaluation (`eval`, `Function`); content security policy disallowing arbitrary remote script execution. |
| **A09: Security Logging & Monitoring Failures** | **Mitigated** | Server-side request logging with sensitive PII redaction and authorization token masking; structured audit logs. |
| **A10: Server-Side Request Forgery (SSRF)** | **Mitigated** | Server routes do not accept arbitrary URLs from client inputs; all outbound requests target strictly Google Gemini APIs using the official `@google/genai` SDK. |

---

### OWASP Top 10 for Large Language Model (LLM) Applications
| LLM Vulnerability | Status | Implemented Mitigation |
| :--- | :--- | :--- |
| **LLM01: Prompt Injection** | **Mitigated** | User journal inputs are segregated and treated as inert data payloads within fixed system prompts; model cannot be commanded to execute external actions. |
| **LLM02: Sensitive Information Disclosure** | **Mitigated** | Prompts are framed exclusively around the active entry; cross-user entry history is never concatenated into context windows; API keys kept exclusively on the server. |
| **LLM03: Supply Chain Vulnerabilities** | **Mitigated** | Official `@google/genai` SDK with verified SHA lockfiles. |
| **LLM04: Data and Model Poisoning** | **Mitigated** | Stateless inference models (`gemini-3.6-flash`); user submissions are never used for uncontrolled downstream fine-tuning. |
| **LLM05: Improper Output Handling** | **Mitigated** | Structured schema validation on all model analysis JSON outputs before rendering; markdown sanitization preventing stored XSS. |
| **LLM06: Excessive Agency** | **Mitigated** | Gemini models operate purely in read/synthesis mode; no destructive tool executions or autonomous database mutations are triggered by LLM outputs. |
| **LLM07: System Prompt Leakage** | **Mitigated** | System prompts are maintained exclusively on the backend server and sanitized against meta-prompt inspection requests. |
| **LLM08: Vector and Embedding Weaknesses** | **Mitigated** | No unbounded external vector databases; memory retrieval is strictly scoped to Firestore user-authenticated documents. |
| **LLM09: Misinformation** | **Mitigated** | Clear labeling of AI reflections as synthesized thoughts; fallback models provide uniform high-precision responses. |
| **LLM10: Unbounded Consumption** | **Mitigated** | Sliding window rate limiting (20 requests/minute per UID/IP); strict text bounding (max 4,000 characters per message, max 50 turns). |

---

## 2. The 5 Threat Zones Summary

```
+-----------------------------------------------------------------------------------+
|                              1. INPUT SURFACES                                    |
| [User Prompts]  -->  [Size & Type Checks]  -->  [Prototype Pollution Filter]      |
+-----------------------------------------------------------------------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                            2. PLANNING & REASONING                                |
| [System Directives]  -->  [Inert Data Framing]  -->  [Jailbreak Defense]          |
+-----------------------------------------------------------------------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                            3. TOOL & API EXECUTION                                |
| [Server-Side Proxy]  -->  [Sliding Rate Limiter]  -->  [Resilient 4-Tier Ladder]  |
+-----------------------------------------------------------------------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                              4. MEMORY & STATE                                    |
| [Firebase Auth ID Token]  -->  [Strict UID Check]  -->  [Owner-Isolated Firestore]|
+-----------------------------------------------------------------------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                        5. INTER-SYSTEM COMMUNICATION                              |
| [Google Cloud Secret Manager]  -->  [TLS 1.3 / HTTPS]  -->  [PII-Redacted Logs]   |
+-----------------------------------------------------------------------------------+
```

---

## 3. Secret Management Hygiene (Zero-Hardcoding Standard)

- **Strict Ban on Hardcoded Secrets**: No API keys, credentials, or private certificates exist in source code or git history.
- **Google Cloud Secret Manager**: Production deployments retrieve secrets dynamically at runtime through Cloud Run Secret Manager bindings (`--set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"`).
- **Environment Isolation**: `.env` and `.env.local` files are strictly excluded via `.gitignore` and `.dockerignore`. Only `.env.example` with safe dummy placeholders is tracked.

---

## 4. Reporting a Security Vulnerability

If you discover a security vulnerability within Aura Journal, please report it promptly:
1. Do **not** create a public GitHub issue.
2. Email your findings and reproduction steps to the security maintainers.
3. Include the affected endpoints, payload examples, and your recommended mitigation.
4. Security reports will be acknowledged within 24 hours, and patches deployed within 72 hours.
