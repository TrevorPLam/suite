import { Hono } from 'hono';
import {
  CalendarEventError,
  createCalendarEvent,
  listCalendarEvents,
  listCalendarEventsInRange,
  updateCalendarEvent,
  type CalendarEventRange,
  type CreateCalendarEventInput,
} from '@suite/domain-calendar';
import { wireRepositories } from './bootstrap.js';
import { validateCalendarEnv } from '@suite/env-config';
import { mountAuth, requireAuth } from '@suite/auth';

// Validate environment variables at startup
validateCalendarEnv();

// Wire repositories (Postgres if DATABASE_URL set, otherwise in-memory)
await wireRepositories();

const app = new Hono();

// Mount Better Auth handler
mountAuth(app);

type CalendarResponseStatus = 400 | 404 | 409 | 500;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function readEventRange(searchParams: Record<string, string>): CalendarEventRange | null {
  const startAt = searchParams.startAt;
  const endAt = searchParams.endAt;

  if (startAt === undefined && endAt === undefined) {
    return null;
  }

  if (!isValidIsoTimestamp(startAt) || !isValidIsoTimestamp(endAt)) {
    return null;
  }

  if (Date.parse(endAt) <= Date.parse(startAt)) {
    return null;
  }

  return {
    startAt,
    endAt,
  };
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

function parseEventBody(body: unknown): CreateCalendarEventInput | null {
  const payload = parseCreateCalendarEventBody(body);

  if (!payload) {
    return null;
  }

  return payload;
}

function readCalendarError(error: unknown): { status: CalendarResponseStatus; body: Record<string, unknown> } {
  if (error instanceof CalendarEventError) {
    if (error.code === 'conflict_error') {
      return {
        status: 409,
        body: {
          error: error.message,
          details: error.details,
        },
      };
    }

    if (error.code === 'not_found_error') {
      return {
        status: 404,
        body: {
          error: error.message,
          details: error.details,
        },
      };
    }

    return {
      status: 400,
      body: {
        error: error.message,
        details: error.details,
      },
    };
  }

  return {
    status: 500,
    body: {
      error: 'Unable to process calendar event',
    },
  };
}

async function readRequestBody(c: { req: { json: () => Promise<unknown> } }) {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

app.get('/api/health', (c) => c.json({ ok: true, app: 'calendar' }));

app.get('/api/events', async (c) => {
  const range = readEventRange(c.req.query());

  if (range === null) {
    const hasStartAt = c.req.query('startAt') !== undefined;
    const hasEndAt = c.req.query('endAt') !== undefined;

    if (hasStartAt || hasEndAt) {
      return c.json(
        {
          error: 'Invalid event range',
          expected: ['startAt', 'endAt'],
        },
        400,
      );
    }

    const events = await listCalendarEvents();
    return c.json({ events });
  }

  const events = await listCalendarEventsInRange(range);
  return c.json({ events });
});

app.post('/api/events', requireAuth, async (c) => {
  const body = await readRequestBody(c);

  if (body === undefined) {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const payload = parseCreateCalendarEventBody(body);

  if (!payload) {
    return c.json(
      {
        error: 'Invalid event payload',
        expected: ['title', 'startAt', 'endAt'],
      },
      400,
    );
  }

  try {
    const event = await createCalendarEvent(payload);
    return c.json({ event }, 201);
  } catch (error) {
    const response = readCalendarError(error);

    return c.json(response.body, response.status);
  }
});

app.put('/api/events/:id', requireAuth, async (c) => {
  const id = (c.req.param('id') || '').trim();

  if (!isNonEmptyString(id)) {
    return c.json(
      {
        error: 'Invalid event id',
        expected: ['id'],
      },
      400,
    );
  }

  const body = await readRequestBody(c);

  if (body === undefined) {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const payload = parseEventBody(body);

  if (!payload) {
    return c.json(
      {
        error: 'Invalid event payload',
        expected: ['title', 'startAt', 'endAt'],
      },
      400,
    );
  }

  try {
    const event = await updateCalendarEvent(id, payload);
    return c.json({ event });
  } catch (error) {
    const response = readCalendarError(error);

    return c.json(response.body, response.status);
  }
});

export default app;
