---
name: thin-api-route-implementation
description: Guides creation of thin API routes in apps/*/api that only handle request validation, auth checks, and domain package calls, with no business logic
---

## Thin API Route Implementation Guide

This skill guides creation of thin API routes that only orchestrate validation, authentication, and domain calls - keeping business logic in domain packages.

## The Thin Route Pattern

API routes should be **thin** - they handle cross-cutting concerns only:
- Request validation
- Authentication/authorization checks
- Calling domain packages
- Returning responses

**Business logic belongs in domain packages.**

## Why Thin Routes?

- **Separation of concerns**: API layer handles HTTP, domain layer handles business logic
- **Testability**: Domain logic can be tested without HTTP layer
- **Reusability**: Domain logic can be called from multiple interfaces (API, CLI, webhook)
- **Maintainability**: Clear boundaries make code easier to understand and modify
- **Scalability**: Can add caching, rate limiting, etc. without touching business logic

## Route Structure

```
apps/<app>/api/
├── index.ts
├── routes/
│   ├── events.ts
│   ├── tasks.ts
│   └── files.ts
├── middleware/
│   ├── auth.ts
│   ├── validation.ts
│   └── error-handler.ts
└── types/
    └── requests.ts
```

## Basic Route Example

```typescript
// apps/calendar/api/routes/events.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createEvent } from '@suite/domain-calendar';
import { PostgresEventRepository } from '../repositories/event';

const app = new Hono();

// Validation schema
const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

app.post('/events', zValidator('json', createEventSchema), async (c) => {
  // 1. Auth check (middleware)
  const userId = c.get('userId');
  const organizationId = c.get('organizationId');

  // 2. Extract validated input
  const input = c.req.valid('json');

  // 3. Call domain package
  const repo = new PostgresEventRepository(c.env.DB);
  const event = await createEvent(
    {
      title: input.title,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      organizationId,
    },
    repo
  );

  // 4. Return response
  return c.json(
    {
      id: event.id,
      title: event.title,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
    },
    201
  );
});

export default app;
```

## Middleware for Cross-Cutting Concerns

### Authentication Middleware

```typescript
// apps/calendar/api/middleware/auth.ts
import { Hono } from 'hono';
import { auth } from '@suite/auth/server';

export const authMiddleware = async (c: any, next: any) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('userId', session.user.id);
  c.set('organizationId', session.user.organizationId);
  await next();
};
```

### Validation Middleware

```typescript
// apps/calendar/api/middleware/validation.ts
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const validateRequest = (schema: z.ZodSchema) => {
  return zValidator('json', schema);
};
```

### Error Handling Middleware

```typescript
// apps/calendar/api/middleware/error-handler.ts
import { Hono } from 'hono';

export const errorHandler = async (c: any, next: any) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof ValidationError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400);
    }
    if (error instanceof NotFoundError) {
      return c.json({ error: 'Resource not found' }, 404);
    }
    if (error instanceof ConflictError) {
      return c.json({ error: 'Resource already exists' }, 409);
    }
    console.error('Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};
```

## Applying Middleware

```typescript
// apps/calendar/api/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import eventsRouter from './routes/events';

const app = new Hono();

// Global middleware
app.use('*', cors());
app.use('*', errorHandler);
app.use('/api/*', authMiddleware);

// Route groups
app.route('/api', eventsRouter);

export default app;
```

## Repository Implementation (App Layer)

Repositories are implemented in the app layer, not domain:

```typescript
// apps/calendar/api/repositories/event.ts
import { EventRepository } from '@suite/domain-calendar';
import { CalendarEvent } from '@suite/domain-calendar';
import { db } from '@suite/db';
import { events } from '@suite/db/schema';

export class PostgresEventRepository implements EventRepository {
  async save(event: CalendarEvent): Promise<void> {
    await db.insert(events).values({
      id: event.id,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      organizationId: event.organizationId,
    });
  }

  async findById(id: string): Promise<CalendarEvent | null> {
    const row = await db.query.events.findFirst({
      where: eq(events.id, id),
    });
    if (!row) return null;
    return new CalendarEvent(
      row.id,
      row.title,
      row.startDate,
      row.endDate,
      row.organizationId
    );
  }

  async findByDateRange(
    start: Date,
    end: Date,
    organizationId: string
  ): Promise<CalendarEvent[]> {
    const rows = await db.query.events.findMany({
      where: and(
        gte(events.startDate, start),
        lte(events.endDate, end),
        eq(events.organizationId, organizationId)
      ),
    });
    return rows.map(
      (row) =>
        new CalendarEvent(
          row.id,
          row.title,
          row.startDate,
          row.endDate,
          row.organizationId
        )
    );
  }
}
```

## Anti-Patterns to Avoid

### ❌ Business Logic in Route

```typescript
// BAD: Business logic in API route
app.post('/events', async (c) => {
  const data = await c.req.json();

  // Validation and business logic should be in domain
  if (data.startDate >= data.endDate) {
    return c.text('Invalid dates', 400);
  }

  // Check overlaps - business logic!
  const existing = await db.query.events.findMany({
    where: /* ... */,
  });

  for (const event of existing) {
    if (overlaps(data, event)) {
      return c.text('Overlaps', 409);
    }
  }

  await db.insert(events).values(data);
  return c.json({ id: eventId });
});
```

### ❌ Direct Database Access in Route

```typescript
// BAD: Direct DB access bypasses domain
app.get('/events/:id', async (c) => {
  const event = await db.query.events.findFirst({
    where: eq(events.id, c.req.param('id')),
  });
  return c.json(event);
});
```

### ❌ Complex Logic in Route

```typescript
// BAD: Complex orchestration in route
app.post('/complex-operation', async (c) => {
  const data = await c.req.json();

  // Multiple operations should be in domain use case
  await db.insert(table1).values(data.part1);
  await db.insert(table2).values(data.part2);
  await sendEmail(data.email);
  await updateCache(data.id);

  return c.json({ success: true });
});
```

## Correct Pattern

```typescript
// GOOD: Thin route, domain handles logic
app.post('/events', zValidator('json', createEventSchema), async (c) => {
  const userId = c.get('userId');
  const organizationId = c.get('organizationId');
  const input = c.req.valid('json');

  const repo = new PostgresEventRepository(c.env.DB);
  const event = await createEvent(
    {
      title: input.title,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      organizationId,
    },
    repo
  );

  return c.json({ id: event.id }, 201);
});
```

## Error Handling

Define domain errors and map them to HTTP status:

```typescript
// packages/domain-calendar/src/errors.ts
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
```

Map in error handler middleware:

```typescript
if (error instanceof ValidationError) {
  return c.json({ error: error.message }, 400);
}
if (error instanceof NotFoundError) {
  return c.json({ error: error.message }, 404);
}
if (error instanceof ConflictError) {
  return c.json({ error: error.message }, 409);
}
```

## Request/Response Types

Define types for API contracts:

```typescript
// apps/calendar/api/types/requests.ts
export interface CreateEventRequest {
  title: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
}

export interface EventResponse {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}
```

## Testing Routes

```typescript
// apps/calendar/api/routes/__tests__/events.test.ts
import { describe, it, expect } from 'vitest';
import { testClient } from 'hono/testing';
import app from '../events';

describe('POST /events', () => {
  it('should create an event', async () => {
    const client = testClient(app);

    const response = await client.events.$post({
      json: {
        title: 'Meeting',
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T11:00:00Z',
      },
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toHaveProperty('id');
  });

  it('should reject invalid input', async () => {
    const client = testClient(app);

    const response = await client.events.$post({
      json: {
        title: '', // Invalid: empty string
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T11:00:00Z',
      },
    });

    expect(response.status).toBe(400);
  });
});
```

## Checklist

- [ ] Route only handles validation, auth, and domain calls
- [ ] No business logic in route
- [ ] No direct database access in route
- [ ] Validation uses Zod schemas
- [ ] Auth checks in middleware
- [ ] Domain errors mapped to HTTP status codes
- [ ] Repository implemented in app layer
- [ ] Request/response types defined
- [ ] Error handling middleware configured
- [ ] Routes tested with test client

## Related Skills

- **spec-first-development**: Define API contracts in specs
- **domain-package-implementation**: Implement business logic in domain packages
- **better-auth-integration**: Use shared auth package for authentication
