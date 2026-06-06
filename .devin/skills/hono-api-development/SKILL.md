---
name: hono-api-development
description: Guides Hono API development patterns for Cloudflare Workers, including proper error handling, validation, and integration with domain packages
---

## Hono API Development Guide

This skill guides Hono API development for Cloudflare Workers, including proper patterns for error handling, validation, and integration with domain packages.

## Why Hono?

Hono is a small, simple, and ultrafast web framework built on Web Standards. It works on any JavaScript runtime including Cloudflare Workers, with zero cold starts and global distribution.

## Project Setup

### Create Project

```bash
npm create hono@latest my-app
cd my-app
npm install
```

### Basic Structure

```
apps/<app>/api/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── events.ts
│   │   └── tasks.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── error-handler.ts
│   └── types/
│       └── requests.ts
├── wrangler.toml
└── package.json
```

## Basic Application

```typescript
// apps/calendar/api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS middleware
app.use('*', cors());

// Health check
app.get('/', (c) => c.text('OK'));

// API routes
app.route('/api', require('./routes/events').default);

export default app;
```

## wrangler.toml Configuration

```toml
# apps/calendar/api/wrangler.toml
name = "calendar-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "development"

[[d1_databases]]
binding = "DB"
database_name = "calendar-db"
database_id = "your-database-id"

[[services]]
binding = "TASKS_API"
service = "tasks-api"
```

## Route Patterns

### Basic Route

```typescript
// apps/calendar/api/src/routes/events.ts
import { Hono } from 'hono';

const app = new Hono();

app.get('/events', (c) => {
  return c.json({ events: [] });
});

app.post('/events', (c) => {
  return c.json({ id: '123' }, 201);
});

app.get('/events/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ id });
});

export default app;
```

### Route with Validation

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

app.post('/events', zValidator('json', createEventSchema), async (c) => {
  const input = c.req.valid('json');
  // Process input
  return c.json({ id: '123' }, 201);
});
```

### Route with Domain Integration

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createEvent } from '@suite/domain-calendar';
import { PostgresEventRepository } from '../repositories/event';

const app = new Hono();

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
```

## Middleware

### Authentication Middleware

```typescript
// apps/calendar/api/src/middleware/auth.ts
import { Hono } from 'hono';
import { requireSession } from '@suite/auth/server';

export const authMiddleware = async (c: any, next: any) => {
  try {
    const session = await requireSession(c.req.raw.headers);
    c.set('userId', session.user.id);
    c.set('organizationId', session.user.organizationId);
    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
};
```

### Error Handling Middleware

```typescript
// apps/calendar/api/src/middleware/error-handler.ts
import { Hono } from 'hono';
import { ZodError } from 'zod';

export const errorHandler = async (c: any, next: any) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        400
      );
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

### Applying Middleware

```typescript
// apps/calendar/api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';

const app = new Hono();

// Global middleware
app.use('*', cors());
app.use('*', errorHandler);

// Auth middleware for API routes
app.use('/api/*', authMiddleware);

// Routes
app.route('/api', require('./routes/events').default);

export default app;
```

## Environment Variables

```typescript
// apps/calendar/api/src/index.ts
interface Env {
  DB: D1Database;
  TASKS_API: Fetcher;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

app.get('/env', (c) => {
  return c.json({ environment: c.env.ENVIRONMENT });
});
```

## Database Integration

### D1 Database

```typescript
// apps/calendar/api/src/repositories/event.ts
import { drizzle } from 'drizzle-orm/d1';
import { events } from '@suite/db/schema';

export class PostgresEventRepository {
  constructor(private db: D1Database) {}

  async save(event: CalendarEvent) {
    const orm = drizzle(this.db);
    await orm.insert(events).values({
      id: event.id,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      organizationId: event.organizationId,
    });
  }
}
```

### Using in Routes

```typescript
app.post('/events', async (c) => {
  const repo = new PostgresEventRepository(c.env.DB);
  // ...
});
```

## Service Bindings

### Calling Another Worker

```typescript
app.post('/events', async (c) => {
  // Call tasks API via service binding
  const response = await c.env.TASKS_API.fetch(
    new Request('https://tasks-api.internal/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Task from event' }),
    })
  );

  if (!response.ok) {
    return c.json({ error: 'Failed to create task' }, 500);
  }

  return c.json({ success: true });
});
```

## Error Handling

### Custom Errors

```typescript
// packages/domain-calendar/src/errors.ts
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

### Throwing Errors

```typescript
app.get('/events/:id', async (c) => {
  const id = c.req.param('id');
  const event = await repo.findById(id);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  return c.json(event);
});
```

## Request Validation

### Zod Schema

```typescript
import { z } from 'zod';

const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  description: z.string().optional(),
  location: z.string().optional(),
});
```

### Validation Middleware

```typescript
import { zValidator } from '@hono/zod-validator';

app.post('/events', zValidator('json', createEventSchema), async (c) => {
  const input = c.req.valid('json');
  // input is typed as CreateEventInput
});
```

## Response Formatting

### Standard Response

```typescript
app.get('/events/:id', async (c) => {
  const event = await repo.findById(id);
  return c.json({
    id: event.id,
    title: event.title,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
  });
});
```

### Pagination

```typescript
app.get('/events', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const events = await repo.findMany({ limit, offset });
  const total = await repo.count();

  return c.json({
    data: events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
```

## Testing

### Unit Tests

```typescript
// apps/calendar/api/src/routes/__tests__/events.test.ts
import { describe, it, expect } from 'vitest';
import { testClient } from 'hono/testing';
import app from '../events';

describe('Events API', () => {
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

  it('should validate input', async () => {
    const client = testClient(app);

    const response = await client.events.$post({
      json: {
        title: '', // Invalid
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T11:00:00Z',
      },
    });

    expect(response.status).toBe(400);
  });
});
```

## Deployment

### Local Development

```bash
npm run dev
```

### Deploy to Cloudflare

```bash
npm run deploy
```

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Anti-Patterns to Avoid

### ❌ Business Logic in Routes

```typescript
// BAD: Business logic in route
app.post('/events', async (c) => {
  const data = await c.req.json();
  if (data.startDate >= data.endDate) {
    return c.text('Invalid dates', 400);
  }
  // More business logic...
});
```

### ❌ Direct Database Access

```typescript
// BAD: Direct DB access in route
app.get('/events/:id', async (c) => {
  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(c.req.param('id'))
    .first();
  return c.json(event);
});
```

### ❌ No Error Handling

```typescript
// BAD: No error handling
app.get('/events/:id', async (c) => {
  const event = await repo.findById(c.req.param('id'));
  return c.json(event); // Returns null if not found
});
```

## Checklist

- [ ] Hono app created with proper structure
- [ ] wrangler.toml configured with bindings
- [ ] Middleware for auth and error handling
- [ ] Validation with Zod schemas
- [ ] Domain packages called from routes
- [ ] Database access via repositories
- [ ] Service bindings for cross-domain calls
- [ ] Error handling middleware configured
- [ ] Tests cover routes
- [ ] Deployment workflow configured

## Related Skills

- **thin-api-route-implementation**: Keep routes thin and call domain packages
- **domain-package-implementation**: Implement business logic in domain layer
- **better-auth-integration**: Use auth middleware for authentication
