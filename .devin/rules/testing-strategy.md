---
trigger: model_decision
description: Testing strategy using Vitest for unit tests and Playwright for E2E tests
---

# Testing Strategy

The 2026 testing stack uses Vitest for unit tests and Playwright for E2E tests. This split is forced by tool capabilities, not preference.

## Tool Split

### Vitest (Unit Tests)
Use Vitest for everything that doesn't need a real browser:
- Server Actions as plain functions
- Zod schema validation
- Utility functions
- Synchronous React components
- Client components with React Testing Library

### Playwright (E2E Tests)
Use Playwright for everything that requires a real browser:
- Auth flows
- Form submissions that hit real endpoints
- Stripe checkout redirects
- Async Server Components (Vitest cannot render these)
- Anything depending on cookies, middleware, or Next.js router

## Why Vitest, Not Jest

By 2026, the community has moved from Jest to Vitest:
- Faster cold starts
- Native ESM support
- Nearly identical API to Jest (easy migration)
- Vite-native integration
- Every new Next.js testing tutorial uses Vitest

## Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/'],
    },
  },
});
```

## Testing Server Actions

```typescript
// test/server-actions.test.ts
import { describe, it, expect } from 'vitest';
import { createEvent } from '@/app/actions/events';

describe('createEvent', () => {
  it('should create an event with valid data', async () => {
    const result = await createEvent({
      title: 'Test Event',
      start: new Date('2026-06-01'),
      end: new Date('2026-06-02'),
    });
    
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe('Test Event');
  });
  
  it('should fail with invalid date range', async () => {
    const result = await createEvent({
      title: 'Invalid Event',
      start: new Date('2026-06-02'),
      end: new Date('2026-06-01'), // End before start
    });
    
    expect(result.success).toBe(false);
  });
});
```

## Testing Zod Schemas

```typescript
// test/schemas.test.ts
import { z } from 'zod';
import { eventSchema } from '@/lib/schemas';

describe('eventSchema', () => {
  it('should validate correct data', () => {
    const result = eventSchema.safeParse({
      title: 'Test',
      start: '2026-06-01',
      end: '2026-06-02',
    });
    
    expect(result.success).toBe(true);
  });
  
  it('should reject missing title', () => {
    const result = eventSchema.safeParse({
      start: '2026-06-01',
      end: '2026-06-02',
    });
    
    expect(result.success).toBe(false);
  });
});
```

## Playwright Configuration

```typescript
// playwright.config.ts
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
});
```

## Testing Auth Flows

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can sign in', async ({ page }) => {
  await page.goto('/sign-in');
  await page.click('button[data-provider="github"]');
  
  // Mock OAuth redirect for testing
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=Welcome')).toBeVisible();
});
```

## Testing Async Server Components

```typescript
// e2e/calendar.spec.ts
import { test, expect } from '@playwright/test';

test('calendar loads events', async ({ page }) => {
  await page.goto('/calendar');
  
  // Wait for async data to load
  await page.waitForSelector('[data-testid="event-card"]');
  
  const events = await page.locator('[data-testid="event-card"]').count();
  expect(events).toBeGreaterThan(0);
});
```

## Test Coverage Requirements

- **Unit tests**: Minimum 80% coverage for domain packages
- **E2E tests**: Critical user paths must be covered
- **Integration tests**: API endpoints must have contract tests

## What to Test, What to Skip

**Test:**
- Business logic in domain packages
- API contracts and validation
- Critical user flows (auth, checkout)
- Error handling paths

**Skip:**
- Third-party library internals
- Trivial components (buttons, labels)
- Framework boilerplate
- Visual regression (defer to dedicated tools)

## Enforcement

- CI runs Vitest and Playwright on every PR
- Coverage gates prevent merging below thresholds
- Code reviews check for missing tests on new features
