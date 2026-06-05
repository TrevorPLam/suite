import { Hono } from 'hono';
import { createCalendarEvent, type CreateCalendarEventInput } from '@suite/domain-calendar';

const app = new Hono();

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function parseCreateCalendarEventBody(body: unknown): CreateCalendarEventInput | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { title, startAt, endAt } = body as Record<string, unknown>;

  if (!isNonEmptyString(title) || !isValidIsoTimestamp(startAt) || !isValidIsoTimestamp(endAt)) {
    return null;
  }

  if (Date.parse(endAt) <= Date.parse(startAt)) {
    return null;
  }

  return {
    title: title.trim(),
    startAt,
    endAt,
  };
}

app.get('/api/health', (c) => c.json({ ok: true, app: 'calendar' }));

app.post('/api/events', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const payload = parseCreateCalendarEventBody(body);

  if (!payload) {
    return c.json({
      error: 'Invalid event payload',
      expected: ['title', 'startAt', 'endAt'],
    }, 400);
  }

  return c.json(createCalendarEvent(payload), 201);
});

export default app;
