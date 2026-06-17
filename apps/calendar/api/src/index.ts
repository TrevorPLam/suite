import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { swaggerUI } from '@hono/swagger-ui';
import { timeout } from 'hono/timeout';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { env } from 'hono/adapter';
import {
  CalendarEventError,
  createCalendarEvent,
  listCalendarEvents,
  listCalendarEventsInRange,
  updateCalendarEvent,
  deleteCalendarEvent,
  type CalendarEventRange,
  type CalendarEventRepository,
  setCalendarKeyProviderFromEnv,
  isEncryptionEnabled,
} from '@suite/domain-calendar';
import { validateCalendarEnv, type CalendarEnv } from '@suite/env-config';
import { mountAuth, requireAuth, requireOrganization, createAuth, authMiddleware } from '@suite/auth';
import { UsageMonitor, rateLimit, structuredLogger, requestId, ERROR_CODES, type KVNamespace, requireRepositoryContext } from '@suite/shared-kernel';
import { PostgresUsageRepository, PostgresCalendarEventRepository, createDbClient, type RepositoryContext } from '@suite/db';
import { createEventBodySchema, updateEventBodySchema } from './schemas.js';
import { openApiDoc } from './openapi.js';

type Env = {
  RATE_LIMIT_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  HYPERDRIVE?: { connectionString: string };
  ENCRYPTION_KEY?: string;
  waitUntil: (promise: Promise<unknown>) => void;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  PASSKEY_RP_ID?: string;
  NODE_ENV?: string;
} & CalendarEnv;

type Variables = {
  userId: string | null;
  organizationId: string | null;
  auth: ReturnType<typeof createAuth>;
  calendarRepo: CalendarEventRepository;
  repositoryContext: RepositoryContext | null;
  db: ReturnType<typeof createDbClient>;
};

const app = new Hono<{ Variables: Variables; Bindings: Env }>();

// Validate environment variables using runtime env
app.use('/api/*', async (c, next) => {
  const runtimeEnv = env(c);
  // Extract only string env vars for validation (exclude KVNamespace and other bindings)
  const stringEnv: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(runtimeEnv)) {
    if (typeof value === 'string') {
      stringEnv[key] = value;
    }
  }
  validateCalendarEnv(stringEnv);
  // Initialize encryption key provider from c.env (not process.env)
  await setCalendarKeyProviderFromEnv(c.env.ENCRYPTION_KEY);
  await next();
});

// Create shared DB client for the request
app.use('/api/*', async (c, next) => {
  const dbEnv: { HYPERDRIVE?: { connectionString: string }; DATABASE_URL?: string } = {};
  if (c.env.HYPERDRIVE) {
    dbEnv.HYPERDRIVE = c.env.HYPERDRIVE;
  }
  if (c.env.DATABASE_URL) {
    dbEnv.DATABASE_URL = c.env.DATABASE_URL;
  }
  const db = createDbClient(dbEnv);
  c.set('db', db);
  await next();
});

// Create usage repository for monitoring
let usageRepository: PostgresUsageRepository | null = null;
app.use('/api/*', async (c, next) => {
  if (!usageRepository) {
    const db = c.get('db');
    usageRepository = new PostgresUsageRepository(db);
  }
  await next();
});

// Mount request ID middleware (must be before logger to ensure logs include request ID)
app.use('/api/*', requestId());

// Custom timeout exception that returns standardized error format
const timeoutException = () => new HTTPException(408, {
  res: new Response(
    JSON.stringify({
      error: {
        code: ERROR_CODES.GLOBAL_REQUEST_TIMEOUT,
        message: 'Request timeout',
        timestamp: new Date().toISOString(),
      },
    }),
    { status: 408, headers: { 'Content-Type': 'application/json' } }
  ),
});

// Mount timeout middleware (30 second default)
app.use('/api/*', timeout(30000, timeoutException));

// Mount body size limit middleware (1MB default)
app.use('/api/*', bodyLimit({
  maxSize: 1 * 1024 * 1024, // 1MB
  onError: (c) => {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_REQUEST_TOO_LARGE,
          message: 'Request body too large',
          details: { maxSize: '1MB' },
          timestamp: new Date().toISOString(),
        },
      },
      413,
    );
  },
}));

// Middleware to collect metrics (must be early to track all requests)
app.use('/api/*', async (c, next) => {
  const start = performance.now();
  metrics.requestCount++;

  try {
    await next();

    // Track latency for successful requests
    const latency = performance.now() - start;
    metrics.requestLatencies.push(latency);
    // Keep only last 1000 latency samples
    if (metrics.requestLatencies.length > 1000) {
      metrics.requestLatencies.shift();
    }
  } catch (error) {
    metrics.errorCount++;
    throw error;
  }
});

// Mount structured logging middleware
app.use('/api/*', structuredLogger());

// Add API version header to all responses
app.use('/api/*', async (c, next) => {
  await next();
  c.header('API-Version', '1.0.0');
});

// Mount CORS middleware
app.use('/api/*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'];
  return cors({
    origin: (origin) => (allowedOrigins.includes(origin) || !origin ? origin : undefined),
    credentials: true,
  })(c, next);
});

// Mount security headers middleware
app.use('/api/*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
}));

// Add cache control headers
app.use('/api/*', async (c, next) => {
  await next();
  // No caching for authenticated endpoints
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
});

// Middleware to create auth instance per request
app.use('/api/*', async (c, next) => {
  const db = c.get('db');
  const auth = createAuth({
    db,
    env: {
      AUTH_KV: c.env.AUTH_KV,
    },
    waitUntil: c.env.waitUntil,
    ...(c.env.TRUSTED_ORIGINS && { trustedOrigins: c.env.TRUSTED_ORIGINS }),
    ...(c.env.BETTER_AUTH_API_KEY && { betterAuthApiKey: c.env.BETTER_AUTH_API_KEY }),
    ...(c.env.GOOGLE_CLIENT_ID && { googleClientId: c.env.GOOGLE_CLIENT_ID }),
    ...(c.env.GOOGLE_CLIENT_SECRET && { googleClientSecret: c.env.GOOGLE_CLIENT_SECRET }),
    ...(c.env.GITHUB_CLIENT_ID && { githubClientId: c.env.GITHUB_CLIENT_ID }),
    ...(c.env.GITHUB_CLIENT_SECRET && { githubClientSecret: c.env.GITHUB_CLIENT_SECRET }),
    ...(c.env.PASSKEY_RP_ID && { passkeyRpId: c.env.PASSKEY_RP_ID }),
    ...(c.env.NODE_ENV && { nodeEnv: c.env.NODE_ENV }),
  });
  c.set('auth', auth);
  await next();
});

// Mount Better Auth handler
mountAuth(app);

// Mount auth middleware globally to set userId in context for all requests
app.use('/api/*', authMiddleware);

// Mount UsageMonitor middleware (blocks at 80% of 1000 requests per hour)
app.use('/api/*', async (c, next) => {
  if (usageRepository) {
    return UsageMonitor({
      limit: 1000,
      periodMs: 3600000, // 1 hour
      usageRepository,
    })(c, next);
  }
  await next();
});

// Mount rate limiting middleware (60 requests per minute per user)
app.use('/api/*', async (c, next) => {
  const kv = c.env?.RATE_LIMIT_KV;
  await rateLimit({ requestsPerMinute: 60, kv })(c, next);
});

// Middleware to create repositories per-request and attach to context
app.use('/api/*', async (c, next) => {
  const userId = c.get('userId') as string | undefined;
  
  // Require encryption in production
  if (c.env.NODE_ENV === 'production' && !isEncryptionEnabled()) {
    throw new Error(
      'ENCRYPTION_KEY must be set in production. Set it via wrangler secret put ENCRYPTION_KEY. ' +
      'Generate a key with: openssl rand -base64 32'
    );
  }

  if (userId) {
    // Use organizationId from auth context as tenantId, fallback to 'default' for single-tenant
    const organizationId = c.get('organizationId') || 'default';
    
    // Get requestId from headers (set by requestId middleware)
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

    // Create repository context
    const repositoryContext: RepositoryContext = {
      userId,
      tenantId: organizationId,
      requestId,
    };
    c.set('repositoryContext', repositoryContext);
    
    const db = c.get('db');
    const repo = new PostgresCalendarEventRepository(db);
    c.set('calendarRepo', repo);
  }
  await next();
});

// Validate repository context for API routes that require it (exclude health and metrics)
app.use('/api/v1/*', requireRepositoryContext());

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

function readCalendarError(error: unknown): { status: CalendarResponseStatus; body: Record<string, unknown> } {
  if (error instanceof CalendarEventError) {
    if (error.code === 'conflict_error') {
      return {
        status: 409,
        body: {
          error: {
            code: ERROR_CODES.CALENDAR_EVENT_CONFLICT,
            message: error.message,
            details: error.details,
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    if (error.code === 'not_found_error') {
      return {
        status: 404,
        body: {
          error: {
            code: ERROR_CODES.CALENDAR_EVENT_NOT_FOUND,
            message: error.message,
            details: error.details,
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    return {
      status: 400,
      body: {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: ERROR_CODES.GLOBAL_INTERNAL_ERROR,
        message: 'Unable to process calendar event',
        timestamp: new Date().toISOString(),
      },
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

// Simple in-memory metrics collector
const metrics = {
  requestCount: 0,
  errorCount: 0,
  requestLatencies: [] as number[],
};

app.get('/api/health', async (c) => {
  const db = c.get('db');
  let dbStatus = 'ok';
  let dbLatency: number | undefined;

  try {
    const start = performance.now();
    await db.query('SELECT 1');
    dbLatency = performance.now() - start;
  } catch (_error) {
    dbStatus = 'error';
  }

  const health = {
    ok: dbStatus === 'ok',
    app: 'calendar',
    db: dbStatus,
    timestamp: new Date().toISOString(),
    ...(dbLatency !== undefined && { dbLatency: `${dbLatency.toFixed(2)}ms` }),
  };

  const statusCode = dbStatus === 'ok' ? 200 : 503;
  c.header('Cache-Control', 'public, max-age=60');
  return c.json(health, statusCode);
});

app.get('/api/metrics', async (c) => {
  const avgLatency = metrics.requestLatencies.length > 0
    ? metrics.requestLatencies.reduce((a, b) => a + b, 0) / metrics.requestLatencies.length
    : 0;

  const sortedLatencies = [...metrics.requestLatencies].sort((a, b) => a - b);
  const p50Latency = sortedLatencies.length > 0
    ? sortedLatencies[Math.floor(sortedLatencies.length * 0.5)]
    : 0;

  const p95Latency = sortedLatencies.length > 0
    ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)]
    : 0;

  const p99Latency = sortedLatencies.length > 0
    ? sortedLatencies[Math.floor(sortedLatencies.length * 0.99)]
    : 0;

  const errorRate = metrics.requestCount > 0
    ? (metrics.errorCount / metrics.requestCount) * 100
    : 0;

  const prometheusMetrics = `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{app="calendar"} ${metrics.requestCount}

# HELP http_errors_total Total number of HTTP errors
# TYPE http_errors_total counter
http_errors_total{app="calendar"} ${metrics.errorCount}

# HELP http_request_duration_seconds Average request duration in seconds
# TYPE http_request_duration_seconds gauge
http_request_duration_seconds{app="calendar",quantile="0.5"} ${(p50Latency ?? 0) / 1000}
http_request_duration_seconds{app="calendar",quantile="0.95"} ${(p95Latency ?? 0) / 1000}
http_request_duration_seconds{app="calendar",quantile="0.99"} ${(p99Latency ?? 0) / 1000}
http_request_duration_seconds{app="calendar",quantile="avg"} ${avgLatency / 1000}

# HELP http_error_rate Error rate percentage
# TYPE http_error_rate gauge
http_error_rate{app="calendar"} ${errorRate}
`.trim();

  c.header('Content-Type', 'text/plain');
  return c.text(prometheusMetrics);
});

app.get('/api/v1/events', async (c) => {
  const range = readEventRange(c.req.query());
  const repo = c.get('calendarRepo');
  const repositoryContext = c.get('repositoryContext');

  if (!repositoryContext) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Repository context not found',
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }

  if (range === null) {
    const hasStartAt = c.req.query('startAt') !== undefined;
    const hasEndAt = c.req.query('endAt') !== undefined;

    if (hasStartAt || hasEndAt) {
      return c.json(
        {
          error: {
            code: ERROR_CODES.CALENDAR_INVALID_DATE_RANGE,
            message: 'Invalid event range',
            details: { expected: ['startAt', 'endAt'] },
            timestamp: new Date().toISOString(),
          },
        },
        400,
      );
    }

    const events = await listCalendarEvents(repo, repositoryContext);
    return c.json({ events });
  }

  const events = await listCalendarEventsInRange(range, repo, repositoryContext);
  return c.json({ events });
});

app.post('/api/v1/events', requireAuth, requireOrganization, async (c) => {
  const body = await readRequestBody(c);

  if (body === undefined) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid JSON body',
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  const result = createEventBodySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid event payload',
          details: result.error.errors,
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  try {
    const repo = c.get('calendarRepo');
    const repositoryContext = c.get('repositoryContext');
    if (!repositoryContext) {
      return c.json(
        {
          error: {
            code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
            message: 'Repository context not found',
            timestamp: new Date().toISOString(),
          },
        },
        500,
      );
    }
    const event = await createCalendarEvent(result.data, repo, repositoryContext);
    return c.json({ event }, 201);
  } catch (error) {
    const response = readCalendarError(error);

    return c.json(response.body, response.status);
  }
});

app.put('/api/v1/events/:id', requireAuth, requireOrganization, async (c) => {
  const id = (c.req.param('id') || '').trim();

  if (!isNonEmptyString(id)) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid event id',
          details: { expected: ['id'] },
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  const body = await readRequestBody(c);

  if (body === undefined) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid JSON body',
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  const result = updateEventBodySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid event payload',
          details: result.error.errors,
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  try {
    const repo = c.get('calendarRepo');
    const repositoryContext = c.get('repositoryContext');
    if (!repositoryContext) {
      return c.json(
        {
          error: {
            code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
            message: 'Repository context not found',
            timestamp: new Date().toISOString(),
          },
        },
        500,
      );
    }
    const event = await updateCalendarEvent(id, result.data, repo, repositoryContext);
    return c.json({ event });
  } catch (error) {
    const response = readCalendarError(error);

    return c.json(response.body, response.status);
  }
});

app.delete('/api/v1/events/:id', requireAuth, requireOrganization, async (c) => {
  const id = (c.req.param('id') || '').trim();

  if (!isNonEmptyString(id)) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid event id',
          details: { expected: ['id'] },
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  try {
    const repo = c.get('calendarRepo');
    const repositoryContext = c.get('repositoryContext');
    if (!repositoryContext) {
      return c.json(
        {
          error: {
            code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
            message: 'Repository context not found',
            timestamp: new Date().toISOString(),
          },
        },
        500,
      );
    }
    await deleteCalendarEvent(id, repo, repositoryContext);
    return c.json({ success: true });
  } catch (error) {
    const response = readCalendarError(error);

    return c.json(response.body, response.status);
  }
});

// Serve OpenAPI spec
app.get('/api/openapi.json', (c) => c.json(openApiDoc));

// Serve Swagger UI
app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

export default app;
