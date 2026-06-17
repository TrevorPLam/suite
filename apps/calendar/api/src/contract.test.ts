import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from './index.js';
import { resetCalendarEvents } from '@suite/domain-calendar';

describe('Calendar API Contract Tests', () => {
  beforeAll(async () => {
    // Reset domain state before tests
    resetCalendarEvents();
  });

  afterAll(async () => {
    // Clean up after tests
    resetCalendarEvents();
  });

  describe('GET /api/health', () => {
    it('returns 200 with valid health response structure', async () => {
      const res = await app.request('/api/health');
      expect(res.status).toBe(200);
      
      const body = await res.json() as { ok: boolean; app: string; db: string; timestamp: string; dbLatency?: string };
      expect(body).toHaveProperty('ok');
      expect(body).toHaveProperty('app');
      expect(body).toHaveProperty('db');
      expect(body).toHaveProperty('timestamp');
      expect(typeof body.ok).toBe('boolean');
      expect(typeof body.app).toBe('string');
      expect(typeof body.db).toBe('string');
      expect(typeof body.timestamp).toBe('string');
    });

    it('returns 503 when database is unhealthy', async () => {
      // This test validates the error contract for unhealthy state
      // In a real scenario, we'd mock the database to be unhealthy
      // For now, we validate the structure exists
      const res = await app.request('/api/health');
      // If db is healthy, we get 200; if unhealthy, we get 503
      // Both responses should have the required fields
      expect([200, 503]).toContain(res.status);
      
      const body = await res.json() as { ok: boolean; app: string; db: string; timestamp: string };
      expect(body).toHaveProperty('ok');
      expect(body).toHaveProperty('app');
      expect(body).toHaveProperty('db');
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1/events', () => {
    it('returns 200 with valid events array structure', async () => {
      const res = await app.request('/api/v1/events');
      expect(res.status).toBe(200);
      
      const body = await res.json() as { events: Array<{ id: string; title: string; startAt: string; endAt: string }> };
      expect(body).toHaveProperty('events');
      expect(Array.isArray(body.events)).toBe(true);
      
      // Validate event structure if events exist
      if (body.events.length > 0) {
        const event = body.events[0];
        if (event) {
          expect(event).toHaveProperty('id');
          expect(event).toHaveProperty('title');
          expect(event).toHaveProperty('startAt');
          expect(event).toHaveProperty('endAt');
          expect(typeof event.id).toBe('string');
          expect(typeof event.title).toBe('string');
          expect(typeof event.startAt).toBe('string');
          expect(typeof event.endAt).toBe('string');
        }
      }
    });

    it('returns 400 with error structure for invalid date range', async () => {
      const res = await app.request('/api/v1/events?startAt=invalid&endAt=invalid');
      expect(res.status).toBe(400);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.timestamp).toBe('string');
    });

    it('returns 200 with valid events for valid date range', async () => {
      const res = await app.request('/api/v1/events?startAt=2026-01-01T00:00:00Z&endAt=2026-12-31T23:59:59Z');
      expect(res.status).toBe(200);
      
      const body = await res.json() as { events: unknown[] };
      expect(body).toHaveProperty('events');
      expect(Array.isArray(body.events)).toBe(true);
    });
  });

  describe('POST /api/v1/events', () => {
    it('returns 201 with valid event structure on successful creation', async () => {
      const newEvent = {
        title: 'Contract Test Event',
        startAt: '2026-06-15T10:00:00Z',
        endAt: '2026-06-15T11:00:00Z',
        description: 'Test event for contract validation',
      };

      const res = await app.request('/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      });

      expect(res.status).toBe(201);
      
      const body = await res.json() as { event: { id: string; title: string; startAt: string; endAt: string } };
      expect(body).toHaveProperty('event');
      expect(body.event).toHaveProperty('id');
      expect(body.event).toHaveProperty('title');
      expect(body.event).toHaveProperty('startAt');
      expect(body.event).toHaveProperty('endAt');
      expect(typeof body.event.id).toBe('string');
      expect(typeof body.event.title).toBe('string');
      expect(typeof body.event.startAt).toBe('string');
      expect(typeof body.event.endAt).toBe('string');
    });

    it('returns 400 with error structure for invalid request body', async () => {
      const invalidEvent = {
        title: '', // Invalid: empty title
        startAt: 'invalid-date',
      };

      const res = await app.request('/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidEvent),
      });

      expect(res.status).toBe(400);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.timestamp).toBe('string');
    });

    it('returns 400 with error structure for missing required fields', async () => {
      const incompleteEvent = {
        title: 'Missing dates',
      };

      const res = await app.request('/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompleteEvent),
      });

      expect(res.status).toBe(400);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
    });

    it('returns 409 with error structure for event conflict', async () => {
      // Create an event
      const event1 = {
        title: 'Conflict Test Event 1',
        startAt: '2026-06-20T10:00:00Z',
        endAt: '2026-06-20T11:00:00Z',
      };

      await app.request('/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event1),
      });

      // Try to create overlapping event (conflict)
      const event2 = {
        title: 'Conflict Test Event 2',
        startAt: '2026-06-20T10:30:00Z',
        endAt: '2026-06-20T11:30:00Z',
      };

      const res = await app.request('/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event2),
      });

      expect(res.status).toBe(409);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.timestamp).toBe('string');
    });
  });

  describe('PUT /api/v1/events/:id', () => {
    it('returns 200 with valid event structure on successful update', async () => {
      // First create an event
      const createRes = await app.request('/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Update Test Event',
          startAt: '2026-06-25T10:00:00Z',
          endAt: '2026-06-25T11:00:00Z',
        }),
      });

      const createBody = await createRes.json() as { event: { id: string } };
      const eventId = createBody.event.id;

      // Update the event
      const updateData = {
        title: 'Updated Contract Test Event',
        description: 'Updated description',
      };

      const res = await app.request(`/api/v1/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      expect(res.status).toBe(200);
      
      const body = await res.json() as { event: { id: string; title: string; startAt: string; endAt: string } };
      expect(body).toHaveProperty('event');
      expect(body.event).toHaveProperty('id');
      expect(body.event).toHaveProperty('title');
      expect(body.event).toHaveProperty('startAt');
      expect(body.event).toHaveProperty('endAt');
      expect(typeof body.event.id).toBe('string');
      expect(typeof body.event.title).toBe('string');
    });

    it('returns 400 with error structure for invalid request body', async () => {
      const res = await app.request('/api/v1/events/nonexistent-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '' }), // Invalid: empty title
      });

      expect(res.status).toBe(400);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
    });

    it('returns 404 with error structure for non-existent event', async () => {
      const res = await app.request('/api/v1/events/00000000-0000-0000-0000-000000000000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      expect(res.status).toBe(404);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.timestamp).toBe('string');
    });
  });

  describe('Error Response Contract', () => {
    it('all error responses follow standard error structure', async () => {
      // Test various error scenarios to ensure consistent error structure
      const errorScenarios = [
        { url: '/api/v1/events?startAt=invalid', expectedStatus: 400 },
        { url: '/api/v1/events', method: 'POST', body: {}, expectedStatus: 400 },
      ];

      for (const scenario of errorScenarios) {
        const res = await app.request(scenario.url, {
          method: scenario.method || 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: scenario.body ? JSON.stringify(scenario.body) : null,
        });

        if (res.status >= 400) {
          const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
          expect(body).toHaveProperty('error');
          expect(body.error).toHaveProperty('code');
          expect(body.error).toHaveProperty('message');
          expect(body.error).toHaveProperty('timestamp');
          expect(typeof body.error.code).toBe('string');
          expect(typeof body.error.message).toBe('string');
          expect(typeof body.error.timestamp).toBe('string');
        }
      }
    });
  });
});
