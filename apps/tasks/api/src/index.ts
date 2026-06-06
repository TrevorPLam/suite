import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { swaggerUI } from '@hono/swagger-ui';
import { timeout } from 'hono/timeout';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { env } from 'hono/adapter';
import {
  TaskError,
  createTask,
  getTask,
  listTasks,
  updateTaskCompletion,
  updateTask,
  archiveTask,
  deleteTask,
  searchTasks,
  batchComplete,
  batchArchive,
  type SearchTasksInput,
  type TaskRepository,
  setTaskKeyProviderFromEnv,
  isEncryptionEnabled,
} from '@suite/domain-tasks';
import { PostgresTaskRepository, createDbClient } from '@suite/db';
import { validateTasksEnv, type TasksEnv } from '@suite/env-config';
import { mountAuth, requireAuth, requireOrganization, createAuth } from '@suite/auth';
import {
  createTaskBodySchema,
  taskCompletionBodySchema,
  updateTaskBodySchema,
  archiveTaskBodySchema,
  batchOperationBodySchema,
} from './schemas.js';
import { UsageMonitor, rateLimit, structuredLogger, requestId, ERROR_CODES, type KVNamespace } from '@suite/shared-kernel';
import { PostgresUsageRepository } from '@suite/db';
import { openApiDoc } from './openapi.js';

type Env = {
  RATE_LIMIT_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  HYPERDRIVE?: { connectionString: string };
  waitUntil: (promise: Promise<unknown>) => void;
} & TasksEnv;

type Variables = {
  userId: string | null;
  auth: ReturnType<typeof createAuth>;
  taskRepo: TaskRepository;
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
  validateTasksEnv(stringEnv);
  await next();
});

// Create usage repository for monitoring
let usageRepository: PostgresUsageRepository | null = null;
app.use('/api/*', async (c, next) => {
  if (!usageRepository) {
    const dbEnv: { HYPERDRIVE?: { connectionString: string }; DATABASE_URL?: string } = {};
    if (c.env.HYPERDRIVE) {
      dbEnv.HYPERDRIVE = c.env.HYPERDRIVE;
    }
    if (c.env.DATABASE_URL) {
      dbEnv.DATABASE_URL = c.env.DATABASE_URL;
    }
    const db = createDbClient(dbEnv);
    usageRepository = new PostgresUsageRepository(db);
  }
  await next();
});

// Simple in-memory metrics collector
const metrics = {
  requestCount: 0,
  errorCount: 0,
  totalLatency: 0,
  requestLatencies: [] as number[],
};

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
  const dbEnv: { HYPERDRIVE?: { connectionString: string }; DATABASE_URL?: string } = {};
  if (c.env.HYPERDRIVE) {
    dbEnv.HYPERDRIVE = c.env.HYPERDRIVE;
  }
  if (c.env.DATABASE_URL) {
    dbEnv.DATABASE_URL = c.env.DATABASE_URL;
  }
  const db = Object.keys(dbEnv).length > 0 ? createDbClient(dbEnv) : null;
  const auth = createAuth({
    db,
    env: {
      AUTH_KV: c.env.AUTH_KV,
    },
    waitUntil: c.env.waitUntil,
    ...(c.env.TRUSTED_ORIGINS && { trustedOrigins: c.env.TRUSTED_ORIGINS }),
    ...(c.env.BETTER_AUTH_API_KEY && { betterAuthApiKey: c.env.BETTER_AUTH_API_KEY }),
  });
  c.set('auth', auth);
  await next();
});

// Mount Better Auth handler
mountAuth(app);

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
  
  // Set up encryption key provider from environment
  await setTaskKeyProviderFromEnv();

  // Require encryption in production
  if (c.env.NODE_ENV === 'production' && !isEncryptionEnabled()) {
    throw new Error(
      'ENCRYPTION_KEY must be set in production. Set it via wrangler secret put ENCRYPTION_KEY. ' +
      'Generate a key with: openssl rand -base64 32'
    );
  }

  if (userId) {
    // Use organizationId from auth context as tenantId, fallback to 'default' for single-tenant
    const organizationId = (c.get('auth') as any)?.session?.organizationId || 'default';
    
    // Use HYPERDRIVE if available (Workers), otherwise DATABASE_URL (Node.js)
    const dbEnv: { HYPERDRIVE?: { connectionString: string }; DATABASE_URL?: string } = {};
    if (c.env.HYPERDRIVE) {
      dbEnv.HYPERDRIVE = c.env.HYPERDRIVE;
    } else if (c.env.DATABASE_URL) {
      dbEnv.DATABASE_URL = c.env.DATABASE_URL;
    } else {
      throw new Error('Either HYPERDRIVE or DATABASE_URL must be set');
    }
    const db = createDbClient(dbEnv);
    const repo = new PostgresTaskRepository(db, userId, organizationId);
    c.set('taskRepo', repo);
  }
  await next();
});

function readTaskError(error: unknown): { status: 400 | 404 | 500; body: Record<string, unknown> } {
  if (error instanceof TaskError) {
    if (error.code === 'not_found_error') {
      return {
        status: 404,
        body: {
          error: {
            code: ERROR_CODES.TASKS_TASK_NOT_FOUND,
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
        message: 'Unable to process task',
        timestamp: new Date().toISOString(),
      },
    },
  };
}

app.get('/api/v1/health', async (c) => {
  const dbEnv: { HYPERDRIVE?: { connectionString: string }; DATABASE_URL?: string } = {};
  if (c.env.HYPERDRIVE) {
    dbEnv.HYPERDRIVE = c.env.HYPERDRIVE;
  }
  if (c.env.DATABASE_URL) {
    dbEnv.DATABASE_URL = c.env.DATABASE_URL;
  }
  const db = Object.keys(dbEnv).length > 0 ? createDbClient(dbEnv) : null;
  let dbStatus = 'ok';
  let dbLatency: number | undefined;

  if (db) {
    try {
      const start = performance.now();
      await db.query('SELECT 1');
      dbLatency = performance.now() - start;
    } catch (_error) {
      dbStatus = 'error';
    }
  } else {
    dbStatus = 'error';
  }

  const health = {
    ok: dbStatus === 'ok',
    app: 'tasks',
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
http_requests_total{app="tasks"} ${metrics.requestCount}

# HELP http_errors_total Total number of HTTP errors
# TYPE http_errors_total counter
http_errors_total{app="tasks"} ${metrics.errorCount}

# HELP http_request_duration_seconds Average request duration in seconds
# TYPE http_request_duration_seconds gauge
http_request_duration_seconds{app="tasks",quantile="0.5"} ${(p50Latency ?? 0) / 1000}
http_request_duration_seconds{app="tasks",quantile="0.95"} ${(p95Latency ?? 0) / 1000}
http_request_duration_seconds{app="tasks",quantile="0.99"} ${(p99Latency ?? 0) / 1000}
http_request_duration_seconds{app="tasks",quantile="avg"} ${avgLatency / 1000}

# HELP http_error_rate Error rate percentage
# TYPE http_error_rate gauge
http_error_rate{app="tasks"} ${errorRate}
`.trim();

  c.header('Content-Type', 'text/plain');
  return c.text(prometheusMetrics);
});

app.get('/api/v1/tasks', async (c) => {
  const repo = c.get('taskRepo');
  return c.json({ tasks: await listTasks(repo) });
});

app.get('/api/v1/tasks/search', async (c) => {
  const query = c.req.query('q');
  const tagsParam = c.req.query('tags');
  const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()) : undefined;

  const searchInput: SearchTasksInput = {};
  if (query) {
    searchInput.query = query;
  }
  if (tags && tags.length > 0) {
    searchInput.tags = tags;
  }

  const results = await searchTasks(searchInput);
  return c.json({ tasks: results });
});

app.post('/api/v1/tasks', requireAuth, requireOrganization, async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({
      error: {
        code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
        message: 'Invalid JSON body',
        details: [],
        timestamp: new Date().toISOString(),
      },
    }, 400);
  }

  const result = createTaskBodySchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: {
        code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
        message: 'Invalid task payload',
        details: result.error.errors.map((e) => e.message),
        timestamp: new Date().toISOString(),
      },
    }, 400);
  }

  try {
    const repo = c.get('taskRepo');
    return c.json({ task: await createTask(result.data, repo) }, 201);
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.get('/api/v1/tasks/:id', async (c) => {
  const repo = c.get('taskRepo');
  const task = await getTask(c.req.param('id').trim(), repo);

  if (!task) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.TASKS_TASK_NOT_FOUND,
          message: 'Task not found',
          timestamp: new Date().toISOString(),
        },
      },
      404,
    );
  }

  return c.json({ task });
});

app.put('/api/v1/tasks/:id/completion', requireAuth, requireOrganization, async (c) => {
  const id = (c.req.param('id') || '').trim();

  if (!id) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid task id',
          details: { expected: ['id'] },
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
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

  const result = taskCompletionBodySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid task completion payload',
          details: { expected: ['completed'] },
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  try {
    const repo = c.get('taskRepo');
    return c.json({ task: await updateTaskCompletion(id, result.data, repo) });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.put('/api/v1/tasks/:id', requireAuth, requireOrganization, async (c) => {
  const id = (c.req.param('id') || '').trim();

  if (!id) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid task id',
          details: { expected: ['id'] },
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
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

  const result = updateTaskBodySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid task update payload',
          details: { expected: ['title'] },
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  try {
    const repo = c.get('taskRepo');
    return c.json({ task: await updateTask(id, result.data, repo) });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.put('/api/v1/tasks/:id/archive', requireAuth, requireOrganization, async (c) => {
  const id = (c.req.param('id') || '').trim();

  if (!id) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid task id',
          details: { expected: ['id'] },
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
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

  const result = archiveTaskBodySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid task archive payload',
          details: { expected: ['archived'] },
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  try {
    const repo = c.get('taskRepo');
    return c.json({ task: await archiveTask(id, result.data, repo) });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.delete('/api/v1/tasks/:id', requireAuth, requireOrganization, async (c) => {
  const id = (c.req.param('id') || '').trim();

  if (!id) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid task id',
          details: { expected: ['id'] },
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  try {
    const repo = c.get('taskRepo');
    await deleteTask(id, repo);
    return c.json({ success: true });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.post('/api/v1/tasks/batch/complete', requireAuth, requireOrganization, async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
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

  const result = batchOperationBodySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid batch operation payload',
          details: { expected: ['taskIds: string[]'] },
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  try {
    const results = await batchComplete(result.data);
    return c.json({ tasks: results });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.post('/api/v1/tasks/batch/archive', requireAuth, requireOrganization, async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
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

  const result = batchOperationBodySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid batch operation payload',
          details: { expected: ['taskIds: string[]'] },
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  try {
    const results = await batchArchive(result.data);
    return c.json({ tasks: results });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

// Serve OpenAPI spec
app.get('/api/openapi.json', (c) => c.json(openApiDoc));

// Serve Swagger UI
app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

export default app;
