import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Context, Next } from 'hono';

// Mock database to prevent real PostgreSQL connection attempts
const mockQuery = vi.fn();
const mockTransaction = vi.fn();
const mockGetDrizzleDb = vi.fn();
const mockSetTenantContext = vi.fn();
const mockClose = vi.fn();

vi.mock('@suite/db', () => ({
  createDbClient: vi.fn(() => ({
    query: mockQuery,
    transaction: mockTransaction,
    getDrizzleDb: mockGetDrizzleDb,
    setTenantContext: mockSetTenantContext,
    close: mockClose,
  })),
  PostgresUsageRepository: vi.fn().mockImplementation(() => ({
    incrementUsage: vi.fn(),
    getUsage: vi.fn().mockResolvedValue({ count: 0 }),
  })),
  PostgresCalendarEventRepository: vi.fn().mockImplementation(() => ({
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findOverlapping: vi.fn(),
  })),
}));

// Mock requireAuth to return 401 by default, but allow override for authenticated tests
let allowAuth = false;

vi.mock('@suite/auth', () => ({
  requireAuth: vi.fn(async (c: Context, next: Next) => {
    if (allowAuth) {
      c.set('userId', 'test-user-id');
      await next();
    } else {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }),
  mountAuth: vi.fn(() => {}),
  authMiddleware: vi.fn(async (c: Context, next: Next) => {
    // Simulate real authMiddleware: set userId from session if authenticated
    if (allowAuth) {
      c.set('userId', 'test-user-id');
      c.set('organizationId', 'default');
    }
    await next();
  }),
  requireOrganization: vi.fn(async (c: Context, next: Next) => {
    await next();
  }),
  createAuth: vi.fn(() => ({})),
}));

// Mock requireRepositoryContext to skip the check in tests
vi.mock('@suite/shared-kernel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@suite/shared-kernel')>();
  return {
    ...actual,
    requireRepositoryContext: () => async (c: Context, next: Next) => {
      // Always set context and proceed, bypassing validation
      c.set('repositoryContext', {
        userId: 'test-user-id',
        tenantId: 'default',
        requestId: 'test-request-id',
      });
      await next();
    },
  };
});

// Mock domain-calendar functions to return test data
vi.mock('@suite/domain-calendar', () => ({
  createCalendarEvent: vi.fn().mockResolvedValue({
    id: 'test-event-id',
    title: 'Team Meeting',
    startAt: '2025-01-15T10:00:00Z',
    endAt: '2025-01-15T11:00:00Z',
  }),
  listCalendarEvents: vi.fn().mockResolvedValue([]),
  listCalendarEventsInRange: vi.fn().mockResolvedValue([]),
  updateCalendarEvent: vi.fn().mockResolvedValue({
    id: 'test-event-id',
    title: 'Updated Meeting',
    startAt: '2025-01-15T14:00:00Z',
    endAt: '2025-01-15T15:00:00Z',
  }),
  deleteCalendarEvent: vi.fn().mockResolvedValue(undefined),
  setCalendarKeyProviderFromEnv: vi.fn().mockResolvedValue(undefined),
  isEncryptionEnabled: vi.fn().mockReturnValue(false),
  resetCalendarEvents: vi.fn(),
  CalendarEventError: class CalendarEventError extends Error {
    code: string;
    details: unknown;
    constructor(message: string, code: string, details?: unknown) {
      super(message);
      this.name = 'CalendarEventError';
      this.code = code;
      this.details = details;
    }
  },
}));

// Mock validateCalendarEnv to prevent errors
vi.mock('@suite/env-config', () => ({
  validateCalendarEnv: vi.fn(() => ({
    DATABASE_URL: 'postgresql://localhost:5432/test',
    ENCRYPTION_KEY: undefined,
    PORT: 3002,
    NODE_ENV: 'test',
  })),
}));

import app from './index.js';

describe('calendar API - health', () => {
  beforeEach(() => {
    // Reset mock query before each test
    mockQuery.mockResolvedValue([{ '?column?' : 1 }]);
  });

  it('should return health check', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, app: 'calendar', db: 'ok', timestamp: expect.any(String) });
  });

  it('GET /api/health returns 200 without session', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
  });
});

describe('calendar API - list events', () => {
  it('should list all events', async () => {
    const res = await app.request('/api/v1/events');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('events');
    expect(Array.isArray(json.events)).toBe(true);
  });
});

describe('calendar API - create event', () => {
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
    expect(json.event.title).toBe('Team Meeting');
    allowAuth = false;
  });
});

describe('calendar API - update event', () => {
  it('should update an existing event', async () => {
    allowAuth = true;
    const res = await app.request('/api/v1/events/test-id', {
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
    expect(json.event.title).toBe('Updated Meeting');
    allowAuth = false;
  });
});

describe('calendar API - delete event', () => {
  it('should delete an existing event', async () => {
    allowAuth = true;
    const res = await app.request('/api/v1/events/test-id', {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('success');
    expect(json.success).toBe(true);
    allowAuth = false;
  });
});
