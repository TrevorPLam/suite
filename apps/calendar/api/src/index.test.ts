import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetCalendarEvents } from '@suite/domain-calendar';

// Mock env validation to bypass DATABASE_URL requirement in tests
vi.mock('@suite/env-config', async () => {
  const actual = await vi.importActual<any>('@suite/env-config');
  return {
    ...actual,
    validateCalendarEnv: vi.fn(() => ({
      DATABASE_URL: 'postgresql://localhost:5432/test',
      ENCRYPTION_KEY: undefined,
      PORT: 3002,
      NODE_ENV: 'test',
    })),
  };
});

// Mock requireAuth to return 401 by default, but allow override for authenticated tests
let allowAuth = false;

vi.mock('@suite/auth', async () => {
  const actual = await vi.importActual<any>('@suite/auth');
  return {
    ...actual,
    requireAuth: vi.fn(async (c: any, next: any) => {
      if (allowAuth) {
        c.set('userId', 'test-user-id');
        await next();
      } else {
        return c.json({ error: 'Unauthorized' }, 401);
      }
    }),
  };
});

import app from './index.js';

describe('calendar API - health', () => {
  it('should return health check', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, app: 'calendar' });
  });

  it('GET /api/health returns 200 without session', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
  });
});

describe('calendar API - list events', () => {
  beforeEach(async () => {
    resetCalendarEvents();
  });

  it('should list all events', async () => {
    const res = await app.request('/api/v1/events');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('events');
    expect(Array.isArray(json.events)).toBe(true);
  });

  it('should list events in date range', async () => {
    const res = await app.request('/api/v1/events?startAt=2025-01-15T00:00:00Z&endAt=2025-01-17T00:00:00Z');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('events');
    expect(Array.isArray(json.events)).toBe(true);
  });

  it('should reject invalid date range', async () => {
    const res = await app.request('/api/v1/events?startAt=invalid-date&endAt=2025-01-17T00:00:00Z');
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject partial date range', async () => {
    const res = await app.request('/api/v1/events?startAt=2025-01-15T00:00:00Z');
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('calendar API - create event', () => {
  beforeEach(async () => {
    resetCalendarEvents();
  });

  it('POST /api/events returns 401 without session', async () => {
    const res = await app.request('/api/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Team Meeting',
        startAt: '2025-01-15T10:00:00Z',
        endAt: '2025-01-15T11:00:00Z',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should create a valid event', async () => {
    allowAuth = true;
    const res = await app.request('/api/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Team Meeting',
        startAt: '2025-01-15T10:00:00Z',
        endAt: '2025-01-15T11:00:00Z',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('event');
    expect(json.event).toHaveProperty('id');
    expect(json.event.title).toBe('Team Meeting');
    allowAuth = false;
  });

  it('should reject invalid JSON', async () => {
    const res = await app.request('/api/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject missing title', async () => {
    const res = await app.request('/api/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startAt: '2025-01-15T10:00:00Z',
        endAt: '2025-01-15T11:00:00Z',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject invalid time range', async () => {
    const res = await app.request('/api/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Team Meeting',
        startAt: '2025-01-15T11:00:00Z',
        endAt: '2025-01-15T10:00:00Z',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject conflicting event', async () => {
    allowAuth = true;
    // Create first event
    await app.request('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'First Meeting',
        startAt: '2025-01-15T10:00:00Z',
        endAt: '2025-01-15T11:00:00Z',
      }),
    });

    // Try to create conflicting event
    const res = await app.request('/api/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Second Meeting',
        startAt: '2025-01-15T10:30:00Z',
        endAt: '2025-01-15T11:30:00Z',
      }),
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toHaveProperty('error');
    allowAuth = false;
  });
});

describe('calendar API - update event', () => {
  beforeEach(async () => {
    resetCalendarEvents();
  });

  it('PUT /api/events/:id returns 401 without session', async () => {
    const res = await app.request('/api/v1/events/some-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Meeting',
        startAt: '2025-01-15T14:00:00Z',
        endAt: '2025-01-15T15:00:00Z',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should update an existing event', async () => {
    allowAuth = true;
    // Create event first
    const createRes = await app.request('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Team Meeting',
        startAt: '2025-01-15T10:00:00Z',
        endAt: '2025-01-15T11:00:00Z',
      }),
    });

    const createJson = await createRes.json();
    const eventId = createJson.event.id;

    // Update event
    const res = await app.request(`/api/v1/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Meeting',
        startAt: '2025-01-15T14:00:00Z',
        endAt: '2025-01-15T15:00:00Z',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('event');
    expect(json.event.id).toBe(eventId);
    expect(json.event.title).toBe('Updated Meeting');
    allowAuth = false;
  });

  it('should reject update with missing id', async () => {
    const res = await app.request('/api/v1/events/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Meeting',
        startAt: '2025-01-15T14:00:00Z',
        endAt: '2025-01-15T15:00:00Z',
      }),
    });

    expect(res.status).toBe(404);
  });

  it('should reject update for non-existent event', async () => {
    const res = await app.request('/api/v1/events/non-existent-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Meeting',
        startAt: '2025-01-15T14:00:00Z',
        endAt: '2025-01-15T15:00:00Z',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject update with invalid payload', async () => {
    const res = await app.request('/api/v1/events/some-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});
