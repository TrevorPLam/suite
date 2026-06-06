# Testing Strategy

This document defines the comprehensive testing approach for the Sovereign Suite monorepo, covering unit tests, integration tests, Worker E2E tests, and Playwright E2E tests with special considerations for encrypted data, multi-tenancy, and Cloudflare Workers.

---

## Test Pyramid

```
        /\
       /  \      E2E Tests (Playwright)
      /----\     Critical user paths, auth flows
     /------\    
    /--------\   Integration Tests
   /----------\  API contracts, DB interactions
  /------------\ 
 /--------------\ Unit Tests (Vitest)
/----------------\ Domain logic, utilities, validation
```

---

## Tool Stack

| Test Type | Tool | Environment | Purpose |
|-----------|------|-------------|---------|
| Unit Tests | Vitest | Node.js | Domain packages, utilities, validation |
| Integration Tests | Vitest + Docker PostgreSQL | Node.js | API endpoints, DB queries |
| Worker E2E | Miniflare / `wrangler dev --test-mode` | Workers Runtime | Full Worker stack locally |
| Browser E2E | Playwright | Chromium/Firefox/Safari | User flows, auth, UI |

---

## Unit Testing with Vitest

### Configuration

The root `vitest.config.ts` covers domain packages and API packages:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/*/api/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.nx', 'apps/*/web/**/*'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

### Testing Domain Package Functions

Domain packages contain pure business logic and should be tested in isolation:

```typescript
// packages/domain-calendar/src/lib/create-event.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createEvent } from './create-event';
import { db } from '@suite/db';

vi.mock('@suite/db', () => ({
  db: {
    insert: vi.fn().mockResolvedValue({ id: '123' }),
  },
}));

describe('createEvent', () => {
  it('should create an event with valid data', async () => {
    const result = await createEvent({
      tenantId: 'tenant-123',
      userId: 'user-123',
      title: 'Team Meeting',
      startAt: new Date('2026-06-01T10:00:00Z'),
      endAt: new Date('2026-06-01T11:00:00Z'),
    });

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('123');
  });

  it('should fail with invalid date range', async () => {
    const result = await createEvent({
      tenantId: 'tenant-123',
      userId: 'user-123',
      title: 'Invalid Event',
      startAt: new Date('2026-06-01T11:00:00Z'),
      endAt: new Date('2026-06-01T10:00:00Z'),
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_DATE_RANGE');
  });
});
```

### Testing Zod Schemas

Validation schemas are tested with edge cases:

```typescript
// packages/domain-calendar/src/schemas/event-schema.test.ts
import { describe, it, expect } from 'vitest';
import { eventSchema } from './event-schema';

describe('eventSchema', () => {
  it('should validate correct data', () => {
    const result = eventSchema.safeParse({
      tenantId: 'tenant-123',
      userId: 'user-123',
      title: 'Team Meeting',
      startAt: '2026-06-01T10:00:00Z',
      endAt: '2026-06-01T11:00:00Z',
    });

    expect(result.success).toBe(true);
  });

  it('should reject missing title', () => {
    const result = eventSchema.safeParse({
      tenantId: 'tenant-123',
      userId: 'user-123',
      startAt: '2026-06-01T10:00:00Z',
      endAt: '2026-06-01T11:00:00Z',
    });

    expect(result.success).toBe(false);
  });

  it('should reject end before start', () => {
    const result = eventSchema.safeParse({
      tenantId: 'tenant-123',
      userId: 'user-123',
      title: 'Invalid Event',
      startAt: '2026-06-01T11:00:00Z',
      endAt: '2026-06-01T10:00:00Z',
    });

    expect(result.success).toBe(false);
  });
});
```

---

## Integration Testing with PostgreSQL

### Docker PostgreSQL Setup

Use `testcontainers` or a dedicated Docker Compose setup for integration tests:

```typescript
// packages/db/src/test-setup.ts
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';

let testPool: Pool;

export async function setupTestDb() {
  testPool = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433'),
    database: 'suite_test',
    user: 'postgres',
    password: 'postgres',
  });

  const db = drizzle(testPool);

  // Run migrations
  await migrate(db, {
    migrationsFolder: './drizzle',
    migrationsTable: '__drizzle_migrations_test',
  });

  return db;
}

export async function teardownTestDb() {
  await testPool.query('DROP SCHEMA public CASCADE');
  await testPool.query('CREATE SCHEMA public');
  await testPool.end();
}

export async function resetTestDb() {
  await testPool.query('TRUNCATE TABLE calendar_events, drive_files, tasks CASCADE');
}
```

### Per-Test Transaction Rollback

Use transaction rollback for test isolation:

```typescript
// packages/domain-calendar/src/lib/create-event.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb, resetTestDb, teardownTestDb } from '@suite/db/test-setup';
import { createEvent } from './create-event';

describe('createEvent (integration)', () => {
  let db: any;

  beforeAll(async () => {
    db = await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await db.query('BEGIN');
  });

  afterEach(async () => {
    await db.query('ROLLBACK');
  });

  it('should persist event to database', async () => {
    const result = await createEvent(db, {
      tenantId: 'tenant-123',
      userId: 'user-123',
      title: 'Team Meeting',
      startAt: new Date('2026-06-01T10:00:00Z'),
      endAt: new Date('2026-06-01T11:00:00Z'),
    });

    expect(result.success).toBe(true);

    const events = await db.query('SELECT * FROM calendar_events WHERE id = $1', [result.data?.id]);
    expect(events.length).toBe(1);
    expect(events[0].title).toBe('Team Meeting');
  });
});
```

---

## Worker E2E Testing

### Miniflare for Local Worker Testing

Miniflare simulates the Cloudflare Workers runtime locally:

```typescript
// apps/calendar/api/src/index.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { Miniflare } from 'miniflare';

describe('Calendar API Worker', () => {
  let mf: Miniflare;

  beforeAll(async () => {
    mf = new Miniflare({
      scriptPath: './src/index.ts',
      modules: true,
      bindings: {
        DATABASE_URL: process.env.TEST_DATABASE_URL,
        BETTER_AUTH_SECRET: 'test-secret',
      },
      kvNamespaces: ['CACHE'],
      d1Databases: ['DB'],
    });
  });

  it('should create an event via API', async () => {
    const res = await mf.dispatchFetch(
      new Request('http://localhost/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          title: 'Team Meeting',
          startAt: '2026-06-01T10:00:00Z',
          endAt: '2026-06-01T11:00:00Z',
        }),
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
  });
});
```

### Mocking Worker Bindings

Mock `c.env` bindings for unit tests:

```typescript
// apps/calendar/api/src/middleware/tenant.test.ts
import { describe, it, expect, vi } from 'vitest';
import { tenantMiddleware } from './tenant';

describe('tenantMiddleware', () => {
  it('should set tenant context in session variable', async () => {
    const next = vi.fn();
    const db = {
      getClient: vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue(undefined),
        release: vi.fn(),
      }),
    };

    const c = {
      get: vi.fn((key) => {
        if (key === 'session') return { tenantId: 'tenant-123' };
        if (key === 'db') return db;
      }),
      set: vi.fn(),
    };

    await tenantMiddleware(c, next);

    expect(c.set).toHaveBeenCalledWith('dbClient', expect.any(Object));
    expect(next).toHaveBeenCalled();
  });
});
```

---

## Playwright E2E Testing

### Configuration

```typescript
// apps/calendar/web/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
```

### Authenticated Sessions with Better Auth

```typescript
// apps/calendar/web/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can sign in and access calendar', async ({ page, context }) => {
    // Navigate to sign-in
    await page.goto('/sign-in');

    // Click OAuth button (mocked in test env)
    await page.click('button[data-provider="github"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/calendar');

    // Verify session is set
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'better-auth.session_token');
    expect(sessionCookie).toBeDefined();

    // Verify calendar loads
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
  });

  test('unauthenticated user is redirected to sign-in', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForURL('/sign-in?callbackUrl=/calendar');
  });
});
```

### Testing Encrypted Content

Tests that interact with encrypted content must hold the encryption key:

```typescript
// apps/calendar/web/e2e/encrypted-event.spec.ts
import { test, expect } from '@playwright/test';

test('user can create and view encrypted event', async ({ page }) => {
  // Sign in first
  await page.goto('/sign-in');
  await page.click('button[data-provider="github"]');
  await page.waitForURL('/calendar');

  // Create event with encrypted description
  await page.click('[data-testid="create-event-button"]');
  await page.fill('[data-testid="event-title"]', 'Secret Meeting');
  await page.fill('[data-testid="event-description"]', 'This is encrypted content');
  await page.fill('[data-testid="event-start"]', '2026-06-01T10:00');
  await page.fill('[data-testid="event-end"]', '2026-06-01T11:00');
  await page.click('[data-testid="save-event"]');

  // Verify event appears in calendar
  await expect(page.locator('text=Secret Meeting')).toBeVisible();

  // Click event to view details (triggers decryption)
  await page.click('text=Secret Meeting');
  await expect(page.locator('text=This is encrypted content')).toBeVisible();
});
```

---

## MSW (Mock Service Worker)

Mock API calls in frontend tests without a running backend:

```typescript
// apps/calendar/web/src/lib/api-client.test.ts
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createEvent } from './api-client';

const server = setupServer(
  http.post('/api/events', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '123', ...body }, { status: 201 });
  })
);

describe('createEvent API client', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should create event via API', async () => {
    const result = await createEvent({
      title: 'Team Meeting',
      startAt: '2026-06-01T10:00:00Z',
      endAt: '2026-06-01T11:00:00Z',
    });

    expect(result.id).toBe('123');
  });
});
```

---

## Test Data Factories

Generate valid encrypted fixtures without exposing plaintext in the test suite:

```typescript
// packages/test-utils/src/factories/event-factory.ts
import { encrypt } from '@suite/crypto';

export async function createEncryptedEventFixture(overrides = {}) {
  const plaintext = {
    description: 'Test description',
    location: 'Test location',
    attendees: ['user1@example.com', 'user2@example.com'],
    ...overrides,
  };

  const encryptedBlob = await encrypt(JSON.stringify(plaintext), 'test-key');

  return {
    id: 'event-123',
    tenantId: 'tenant-123',
    userId: 'user-123',
    title: 'Test Event',
    startAt: new Date('2026-06-01T10:00:00Z'),
    endAt: new Date('2026-06-01T11:00:00Z'),
    encryptedBlob,
  };
}
```

---

## Test Coverage Requirements

| Package Type | Coverage Threshold | Rationale |
|--------------|-------------------|-----------|
| Domain packages | 80% lines, 75% branches | Business logic is critical |
| API packages | 70% lines, 65% branches | API contracts must be tested |
| Shared packages | 75% lines, 70% branches | Reused code must be reliable |
| Web apps | 50% lines | UI tests are expensive; focus on E2E |

---

## CI/CD Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: suite_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:integration
        env:
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5432

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm dev &
      - run: sleep 10
      - run: pnpm test:e2e
```

---

## Testing Best Practices

### DO Test

- Business logic in domain packages
- API contracts and validation
- Critical user flows (auth, checkout)
- Error handling paths
- Encryption/decryption operations
- RLS policy enforcement

### DON'T Test

- Third-party library internals
- Trivial components (buttons, labels)
- Framework boilerplate
- Visual regression (use dedicated tools)
- Database ORM internals (Drizzle is well-tested)

### Test Naming

- Use descriptive test names: `should create event with valid data`
- Group related tests with `describe`
- Use `test.skip` for flaky tests (fix them later)
- Use `test.only` sparingly (never commit with `only`)

### Test Isolation

- Each test should be independent
- Use transaction rollback for DB tests
- Clean up resources in `afterEach`
- Avoid shared state between tests

---

## Common Testing Pitfalls

### 1. Testing Implementation Details

**Bad:**
```typescript
it('should call db.insert', () => {
  expect(db.insert).toHaveBeenCalled();
});
```

**Good:**
```typescript
it('should persist event to database', async () => {
  const result = await createEvent(...);
  const events = await db.query('SELECT * FROM calendar_events WHERE id = $1', [result.id]);
  expect(events.length).toBe(1);
});
```

### 2. Not Mocking External Dependencies

**Bad:**
```typescript
it('should send email', async () => {
  await sendEmail(...);
  // This actually sends an email!
});
```

**Good:**
```typescript
it('should send email via provider', async () => {
  vi.mock('@suite/email', () => ({
    sendEmail: vi.fn().mockResolvedValue(undefined),
  }));
  await sendEmail(...);
  expect(sendEmail).toHaveBeenCalled();
});
```

### 3. brittle Time-Based Tests

**Bad:**
```typescript
it('should expire after 1 hour', () => {
  const expiresAt = Date.now() + 3600000;
  expect(expiresAt).toBeGreaterThan(Date.now());
});
```

**Good:**
```typescript
it('should expire after 1 hour', () => {
  vi.useFakeTimers();
  const now = Date.now();
  vi.setSystemTime(now);
  const expiresAt = now + 3600000;
  expect(expiresAt).toBeGreaterThan(now);
  vi.useRealTimers();
});
```

---

## Commands

```bash
# Run all unit tests
pnpm test:unit

# Run unit tests for a specific package
pnpm --filter=domain-calendar test

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run tests with coverage
pnpm test:coverage

# Watch mode for development
pnpm test:watch
```

---

*This document must be updated when new testing patterns are introduced or when the testing stack changes.*
