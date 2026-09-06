import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { AddressInfo } from 'net';

process.env.NODE_ENV = 'test';

// Import app from server.ts
import { app } from '../server';

/**
 * Express Route Authorization & Security Integration Tests
 *
 * TEST FIDELITY NOTICE:
 * Authentication tests verify Express route authorization semantics using a mock verifyIdToken
 * implementation (active exclusively when NODE_ENV === 'test'); they do not perform live cryptographic
 * verification against Google's public keys.
 *
 * Category: Backend Route Integration Tests (Mocked Auth Verification)
 */
describe('Backend Route Integration Tests: Authorization & Security Hardening', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  test('Public endpoint /api/health responds with 200 OK and service metadata', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.service, 'Aura Journal API');
  });

  test('Protected endpoint /api/gemini/reflect rejects missing authorization token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/reflect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        mode: 'reflection',
      }),
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Unauthorized: Missing or malformed authorization token/i);
  });

  test('Protected endpoint /api/gemini/reflect rejects malformed/invalid token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/reflect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-invalid',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        mode: 'reflection',
      }),
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Unauthorized: Invalid/i);
  });

  test('Protected endpoint /api/gemini/summarize rejects missing authorization token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Today was a productive and thoughtful day.',
      }),
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Unauthorized: Missing or malformed authorization token/i);
  });

  test('Input validation rejects empty or missing messages on /api/gemini/reflect with 400', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/reflect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-a',
      },
      body: JSON.stringify({
        messages: [],
        mode: 'reflection',
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /Validation error/i);
  });

  test('Input validation rejects prototype pollution attempts with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/reflect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-a',
      },
      body: '{"__proto__": {"admin": true}, "messages": [{"role": "user", "content": "test"}]}',
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /Prototype pollution attempt detected/i);
  });

  test('Protected export permits authenticated User A to export User A resources', async () => {
    const res = await fetch(`${baseUrl}/api/journal/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-a',
      },
      body: JSON.stringify({ userId: 'user-a' }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'authorized');
    assert.strictEqual(body.owner, 'user-a');
  });

  test('Cross-user export is forbidden: User A token attempting to access User B returns 403', async () => {
    const res = await fetch(`${baseUrl}/api/journal/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-a',
      },
      body: JSON.stringify({ userId: 'user-b' }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Forbidden: You cannot export journal data belonging to another user/i);
  });

  test('Cross-user delete is forbidden: User A token attempting to delete User B record returns 403', async () => {
    const res = await fetch(`${baseUrl}/api/journal/entry`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-a',
      },
      body: JSON.stringify({ userId: 'user-b', entryId: 'entry-123' }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Forbidden: You cannot delete journal records belonging to another user/i);
  });

  test('Valid User B token successfully authorizes User B resources', async () => {
    const res = await fetch(`${baseUrl}/api/journal/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-b',
      },
      body: JSON.stringify({ userId: 'user-b' }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'authorized');
    assert.strictEqual(body.owner, 'user-b');
  });

  test('CORS rejects untrusted arbitrary origins', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'https://malicious-attacker.com',
      },
    });
    // Untrusted origin should NOT receive Access-Control-Allow-Origin header
    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert.notStrictEqual(allowOrigin, 'https://malicious-attacker.com');
  });

  test('CORS allows preview origins in non-production mode', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'https://aistudio.google.com',
      },
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert.strictEqual(allowOrigin, 'https://aistudio.google.com');
  });

  test('Protected endpoint /api/gemini/threads rejects missing authorization token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: [] }),
    });
    assert.strictEqual(res.status, 401);
  });

  test('Input validation rejects malformed payload on /api/gemini/threads with 400', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-a',
      },
      body: JSON.stringify({ entries: 'not-an-array' }),
    });
    assert.strictEqual(res.status, 400);
  });

  test('Authorized request to /api/gemini/threads succeeds and returns threads array', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-a',
      },
      body: JSON.stringify({
        entries: [
          {
            id: 'e1',
            title: 'My First Secure AI Project',
            date: 'Yesterday',
            text: 'Built the secure backend and verified rate limiters and auth.',
            tag: 'Reflection',
          },
          {
            id: 'e2',
            title: 'test2',
            date: 'Yesterday',
            text: 'Testing user workspace and personal reflections.',
            tag: 'Reflection',
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.threads));
    assert.ok(body.threads.length > 0);
    assert.ok(body.threads[0].title);
    assert.ok(body.threads[0].copy);
    assert.ok(Array.isArray(body.threads[0].entryIds));
  });

  test('Protected endpoint /api/gemini/review rejects missing authorization token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: [] }),
    });
    assert.strictEqual(res.status, 401);
  });

  test('Authorized request to /api/gemini/review succeeds and returns 4-part review', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-a',
      },
      body: JSON.stringify({
        entries: [
          {
            id: 'e1',
            title: 'My First Secure AI Project',
            date: 'Yesterday',
            text: 'Completed milestone with security hardening.',
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.review);
    assert.ok(body.review.standout);
    assert.ok(body.review.load);
    assert.ok(body.review.action);
    assert.ok(body.review.positive);
  });
});
