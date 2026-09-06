import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { AddressInfo } from 'net';

process.env.NODE_ENV = 'test';

import { app } from '../server';

describe('Goals REST API Backend Integration Tests', () => {
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

  test('GET /api/goals rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/api/goals`);
    assert.strictEqual(res.status, 401);
  });

  test('POST /api/goals rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Read more books' }),
    });
    assert.strictEqual(res.status, 401);
  });

  test('POST /api/goals rejects empty title with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-goals-1',
      },
      body: JSON.stringify({ title: '   ' }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
  });

  test('POST /api/goals rejects targetDate in the past on creation with 400', async () => {
    const res = await fetch(`${baseUrl}/api/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-goals-1',
      },
      body: JSON.stringify({
        title: 'Learn piano',
        targetDate: '2020-01-01',
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('past'));
  });

  let createdGoalId = '';

  test('POST /api/goals successfully creates a goal with milestones', async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const res = await fetch(`${baseUrl}/api/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-goals-1',
      },
      body: JSON.stringify({
        title: 'Complete 10 morning walks',
        description: 'Walk every weekday without a phone.',
        targetDate: futureDate,
        milestones: [
          { label: 'Walk 1-3', done: true },
          { label: 'Walk 4-7', done: false },
          { label: 'Walk 8-10', done: false },
        ],
        status: 'active',
      }),
    });

    assert.strictEqual(res.status, 201);
    const goal = await res.json();
    assert.ok(goal.id);
    assert.strictEqual(goal.title, 'Complete 10 morning walks');
    assert.strictEqual(goal.milestones.length, 3);
    assert.strictEqual(goal.progressPercent, 33); // 1 of 3 = 33%
    assert.strictEqual(goal.status, 'active');
    createdGoalId = goal.id;
  });

  test('GET /api/goals lists the created goal for the user', async () => {
    const res = await fetch(`${baseUrl}/api/goals`, {
      headers: { Authorization: 'Bearer mock-token-user-goals-1' },
    });
    assert.strictEqual(res.status, 200);
    const goals = await res.json();
    assert.ok(Array.isArray(goals));
    const found = goals.find((g: any) => g.id === createdGoalId);
    assert.ok(found);
    assert.strictEqual(found.title, 'Complete 10 morning walks');
  });

  test('GET /api/goals/:id returns the goal with entryPreviews resolved', async () => {
    const res = await fetch(`${baseUrl}/api/goals/${createdGoalId}`, {
      headers: { Authorization: 'Bearer mock-token-user-goals-1' },
    });
    assert.strictEqual(res.status, 200);
    const goal = await res.json();
    assert.strictEqual(goal.id, createdGoalId);
    assert.ok(Array.isArray(goal.entryPreviews));
  });

  test('PATCH /api/goals/:id toggles milestone done status and re-derives progress', async () => {
    const res = await fetch(`${baseUrl}/api/goals/${createdGoalId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-goals-1',
      },
      body: JSON.stringify({
        milestones: [
          { label: 'Walk 1-3', done: true },
          { label: 'Walk 4-7', done: true },
          { label: 'Walk 8-10', done: false },
        ],
      }),
    });
    assert.strictEqual(res.status, 200);
    const goal = await res.json();
    assert.strictEqual(goal.progressPercent, 67); // 2 of 3 = 67%
  });

  test('PATCH /api/goals/:id changes status to paused without confirmation requirement', async () => {
    const res = await fetch(`${baseUrl}/api/goals/${createdGoalId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-goals-1',
      },
      body: JSON.stringify({ status: 'paused' }),
    });
    assert.strictEqual(res.status, 200);
    const goal = await res.json();
    assert.strictEqual(goal.status, 'paused');
  });

  test('GET /api/goals/:id/suggestions returns suggestions structure', async () => {
    const res = await fetch(`${baseUrl}/api/goals/${createdGoalId}/suggestions`, {
      headers: { Authorization: 'Bearer mock-token-user-goals-1' },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.suggestions));
    assert.ok(Array.isArray(data.sourceSessionIds));
  });

  test('Cross-user isolation: User B cannot access User A goal', async () => {
    const res = await fetch(`${baseUrl}/api/goals/${createdGoalId}`, {
      headers: { Authorization: 'Bearer mock-token-user-goals-2' },
    });
    assert.strictEqual(res.status, 404);
  });

  test('Cross-user isolation: User B cannot modify User A goal', async () => {
    const res = await fetch(`${baseUrl}/api/goals/${createdGoalId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token-user-goals-2',
      },
      body: JSON.stringify({ title: 'Hijacked title' }),
    });
    assert.strictEqual(res.status, 404);
  });

  test('DELETE /api/goals/:id deletes the goal with 204 No Content', async () => {
    const res = await fetch(`${baseUrl}/api/goals/${createdGoalId}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer mock-token-user-goals-1' },
    });
    assert.strictEqual(res.status, 204);

    // Verify subsequent lookup returns 404
    const checkRes = await fetch(`${baseUrl}/api/goals/${createdGoalId}`, {
      headers: { Authorization: 'Bearer mock-token-user-goals-1' },
    });
    assert.strictEqual(checkRes.status, 404);
  });
});
