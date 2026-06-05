import { describe, it, expect, beforeEach } from 'vitest';
import { resetCalendarEvents } from '@suite/domain-calendar';
import app from './index.js';

describe('calendar API - health', () => {
  it('should return health check', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, app: 'calendar' });
  });
});

describe('calendar API - list events', () => {
  beforeEach(() => {
    resetCalendarEvents();
  });

  it('should list all events', async () => {
    const res = await app.request('/api/events');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('events');
    expect(Array.isArray(json.events)).toBe(true);
  });

  it('should list events in date range', async () => {
    const res = await app.request('/api/events?startAt=2025-01-15T00:00:00Z&endAt=2025-01-17T00:00:00Z');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('events');
    expect(Array.isArray(json.events)).toBe(true);
  });

  it('should reject invalid date range', async () => {
    const res = await app.request('/api/events?startAt=invalid-date&endAt=2025-01-17T00:00:00Z');
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject partial date range', async () => {
    const res = await app.request('/api/events?startAt=2025-01-15T00:00:00Z');
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('calendar API - create event', () => {
  beforeEach(() => {
    resetCalendarEvents();
  });

  it('should create a valid event', async () => {
    const res = await app.request('/api/events', {
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
  });

  it('should reject invalid JSON', async () => {
    const res = await app.request('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject missing title', async () => {
    const res = await app.request('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startAt: '2025-01-15T10:00:00Z',
        endAt: '2025-01-15T11:00:00Z',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject invalid time range', async () => {
    const res = await app.request('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Team Meeting',
        startAt: '2025-01-15T11:00:00Z',
        endAt: '2025-01-15T10:00:00Z',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject conflicting event', async () => {
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
    const res = await app.request('/api/events', {
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
  });
});

describe('calendar API - update event', () => {
  beforeEach(() => {
    resetCalendarEvents();
  });

  it('should update an existing event', async () => {
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
    const res = await app.request(`/api/events/${eventId}`, {
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
  });

  it('should reject update with missing id', async () => {
    const res = await app.request('/api/events/', {
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
    const res = await app.request('/api/events/non-existent-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Meeting',
        startAt: '2025-01-15T14:00:00Z',
        endAt: '2025-01-15T15:00:00Z',
      }),
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject update with invalid payload', async () => {
    const res = await app.request('/api/events/some-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});
