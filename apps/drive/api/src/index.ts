import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { swaggerUI } from '@hono/swagger-ui';
import { timeout } from 'hono/timeout';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { env } from 'hono/adapter';
import {
  createFolder,
  deleteDriveFile,
  deleteFolder,
  getDriveFile,
  listDriveFiles,
  listFolders,
  moveFile,
  renameDriveFile,
  renameFolder,
  searchFiles,
  type UploadDriveFileInput,
  uploadDriveFile,
  DriveError,
  type DriveFileRepository,
  type DriveFolderRepository,
  type StorageAdapter,
  setDriveKeyProviderFromEnv,
  isEncryptionEnabled,
  setDriveStorage,
  InMemoryDriveFileRepository,
  InMemoryDriveFolderRepository,
} from '@suite/domain-drive';
import { PostgresDriveFileRepository, PostgresDriveFolderRepository, createDbClient, type RepositoryContext } from '@suite/db';
import { R2StorageAdapter } from './bootstrap.js';
import { validateDriveEnv, type DriveEnv } from '@suite/env-config';
import { mountAuth, requireAuth, requireOrganization, createAuth } from '@suite/auth';
import { UsageMonitor, rateLimit, structuredLogger, requestId, ERROR_CODES, type KVNamespace, requireRepositoryContext } from '@suite/shared-kernel';
import { PostgresUsageRepository } from '@suite/db';
import {
  uploadFileBodySchema,
  renameFileBodySchema,
  createFolderBodySchema,
  renameFolderBodySchema,
  moveFileBodySchema,
  searchFilesQuerySchema,
} from './schemas.js';
import { openApiDoc } from './openapi.js';

type Env = {
  R2: R2Bucket;
  RATE_LIMIT_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  HYPERDRIVE?: { connectionString: string };
  waitUntil: (promise: Promise<unknown>) => void;
} & DriveEnv;

type Variables = {
  userId: string | null;
  r2Bucket: R2Bucket | null;
  auth: ReturnType<typeof createAuth>;
  fileRepo: DriveFileRepository;
  folderRepo: DriveFolderRepository;
  storageAdapter: StorageAdapter | null;
  repositoryContext: RepositoryContext | null;
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
  validateDriveEnv(stringEnv);
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

// Mount UsageMonitor middleware (blocks at 80% of 1000 requests per hour) - only if DATABASE_URL is set
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

// Middleware to wire repositories with userId from auth context
// This runs before route handlers, but we'll wire repos after auth succeeds
app.use('/api/*', async (c, next) => {
  const r2Bucket = c.env?.R2 || null;
  c.set('r2Bucket', r2Bucket);
  await next();
});

// Middleware to create repositories per-request and attach to context
app.use('/api/*', async (c, next) => {
  const userId = c.get('userId') as string | undefined;
  const r2Bucket = c.get('r2Bucket');
  
  // Set up encryption key provider from environment
  await setDriveKeyProviderFromEnv();

  // Require encryption in production
  if (c.env.NODE_ENV === 'production' && !isEncryptionEnabled()) {
    throw new Error(
      'ENCRYPTION_KEY must be set in production. Set it via wrangler secret put ENCRYPTION_KEY. ' +
      'Generate a key with: openssl rand -base64 32'
    );
  }

  // Set up storage adapter
  let storageAdapter: StorageAdapter | null = null;
  if (r2Bucket) {
    storageAdapter = new R2StorageAdapter(r2Bucket);
    setDriveStorage(storageAdapter);
  }
  c.set('storageAdapter', storageAdapter);

  if (userId) {
    // Use organizationId from auth context as tenantId, fallback to 'default' for single-tenant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const organizationId = (c.get('auth') as any)?.session?.organizationId || 'default';
    
    // Create repository context
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const repositoryContext: RepositoryContext = {
      userId,
      tenantId: organizationId,
      requestId,
    };
    c.set('repositoryContext', repositoryContext);
    
    // Use Postgres repositories if HYPERDRIVE or DATABASE_URL is set, otherwise use in-memory repositories
    if (c.env.HYPERDRIVE || c.env.DATABASE_URL) {
      const dbEnv: { HYPERDRIVE?: { connectionString: string }; DATABASE_URL?: string } = {};
      if (c.env.HYPERDRIVE) {
        dbEnv.HYPERDRIVE = c.env.HYPERDRIVE;
      } else if (c.env.DATABASE_URL) {
        dbEnv.DATABASE_URL = c.env.DATABASE_URL;
      }
      const db = createDbClient(dbEnv);
      const fileRepo = new PostgresDriveFileRepository(db);
      const folderRepo = new PostgresDriveFolderRepository(db);
      c.set('fileRepo', fileRepo);
      c.set('folderRepo', folderRepo);
    } else {
      // Use in-memory repositories for testing or when database is not available
      const fileRepo = new InMemoryDriveFileRepository();
      const folderRepo = new InMemoryDriveFolderRepository();
      c.set('fileRepo', fileRepo);
      c.set('folderRepo', folderRepo);
    }
  }
  await next();
});

// Validate repository context for all API routes
app.use('/api/*', requireRepositoryContext());

function readDriveError(error: unknown): { status: 400 | 404 | 500; body: Record<string, unknown> } {
  if (error instanceof DriveError) {
    if (error.code === 'not_found_error') {
      return {
        status: 404,
        body: {
          error: {
            code: ERROR_CODES.DRIVE_FILE_NOT_FOUND,
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
        message: 'Unable to process drive operation',
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
    app: 'drive',
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
http_requests_total{app="drive"} ${metrics.requestCount}

# HELP http_errors_total Total number of HTTP errors
# TYPE http_errors_total counter
http_errors_total{app="drive"} ${metrics.errorCount}

# HELP http_request_duration_seconds Average request duration in seconds
# TYPE http_request_duration_seconds gauge
http_request_duration_seconds{app="drive",quantile="0.5"} ${(p50Latency ?? 0) / 1000}
http_request_duration_seconds{app="drive",quantile="0.95"} ${(p95Latency ?? 0) / 1000}
http_request_duration_seconds{app="drive",quantile="0.99"} ${(p99Latency ?? 0) / 1000}
http_request_duration_seconds{app="drive",quantile="avg"} ${avgLatency / 1000}

# HELP http_error_rate Error rate percentage
# TYPE http_error_rate gauge
http_error_rate{app="drive"} ${errorRate}
`.trim();

  c.header('Content-Type', 'text/plain');
  return c.text(prometheusMetrics);
});

app.get('/api/v1/files', async (c) => {
  // Use in-memory repositories for public endpoint (no auth required)
  const fileRepo = new InMemoryDriveFileRepository();
  const repositoryContext: RepositoryContext = {
    userId: 'anonymous',
    tenantId: 'default',
    requestId: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
  };
  const files = await listDriveFiles(fileRepo, repositoryContext);
  return c.json({ files });
});

// Upload endpoint with longer timeout (5 minutes for file uploads) and higher body limit (100MB)
app.post('/api/v1/files', requireAuth, requireOrganization, timeout(300000, timeoutException), bodyLimit({
  maxSize: 100 * 1024 * 1024, // 100MB
  onError: (c) => {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_REQUEST_TOO_LARGE,
          message: 'Request body too large',
          details: { maxSize: '100MB' },
          timestamp: new Date().toISOString(),
        },
      },
      413,
    );
  },
}), async (c) => {
  const contentType = c.req.header('content-type') || '';

  // Handle multipart/form-data for file uploads
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;
      const name = formData.get('name') as string | null;
      const folderId = formData.get('folderId') as string | null;
      const mimeType = formData.get('mimeType') as string | null;

      if (!file) {
        return c.json(
          {
            error: {
              code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
              message: 'File is required',
              timestamp: new Date().toISOString(),
            },
          },
          400,
        );
      }

      if (!name) {
        return c.json(
          {
            error: {
              code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
              message: 'Name is required',
              timestamp: new Date().toISOString(),
            },
          },
          400,
        );
      }

      // File size limit: 100MB
      const MAX_FILE_SIZE = 100 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        return c.json(
          {
            error: {
              code: ERROR_CODES.DRIVE_QUOTA_EXCEEDED,
              message: 'File size exceeds limit',
              details: { maxSize: MAX_FILE_SIZE, actualSize: file.size },
              timestamp: new Date().toISOString(),
            },
          },
          413,
        );
      }

      const payload: UploadDriveFileInput = {
        name: name.trim(),
        size: file.size,
        bytes: file.stream(),
      };

      if (folderId) {
        payload.folderId = folderId.trim();
      }

      if (mimeType) {
        payload.mimeType = mimeType.trim();
      }

      try {
        const fileRepo = c.get('fileRepo');
        const folderRepo = c.get('folderRepo');
        const storageAdapter = c.get('storageAdapter');
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
        const uploadedFile = await uploadDriveFile(payload, fileRepo, folderRepo, storageAdapter, repositoryContext);
        return c.json({ file: uploadedFile }, 201);
      } catch (error) {
        const response = readDriveError(error);
        return c.json(response.body, response.status);
      }
    } catch (_error) {
      return c.json(
        {
          error: {
            code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
            message: 'Failed to parse form data',
            timestamp: new Date().toISOString(),
          },
        },
        400,
      );
    }
  }

  // Handle JSON for metadata-only uploads (legacy support)
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

  const result = uploadFileBodySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid file payload',
          details: result.error.errors,
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  // File size limit: 100MB
  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  if (result.data.size > MAX_FILE_SIZE) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.DRIVE_QUOTA_EXCEEDED,
          message: 'File size exceeds limit',
          details: { maxSize: MAX_FILE_SIZE, actualSize: result.data.size },
          timestamp: new Date().toISOString(),
        },
      },
      413,
    );
  }

  try {
    const fileRepo = c.get('fileRepo');
    const folderRepo = c.get('folderRepo');
    const storageAdapter = c.get('storageAdapter');
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
    const file = await uploadDriveFile(result.data, fileRepo, folderRepo, storageAdapter, repositoryContext);
    return c.json({ file }, 201);
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});

app.put('/api/v1/files/:id', requireAuth, requireOrganization, async (c) => {
  const id = c.req.param('id');

  if (!id) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'File ID is required',
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

  const result = renameFileBodySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid rename payload',
          details: result.error.errors,
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  try {
    const fileRepo = c.get('fileRepo');
    const payload = { id, name: result.data.name };
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
    const renamed = await renameDriveFile(payload, fileRepo, repositoryContext);
    if (!renamed) {
      return c.json(
        {
          error: {
            code: ERROR_CODES.DRIVE_FILE_NOT_FOUND,
            message: 'File not found',
            timestamp: new Date().toISOString(),
          },
        },
        404,
      );
    }
    return c.json({ file: renamed });
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});

app.delete('/api/v1/files/:id', requireAuth, requireOrganization, async (c) => {
  const id = c.req.param('id');

  if (!id) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'File ID is required',
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  const fileRepo = c.get('fileRepo');
  const storageAdapter = c.get('storageAdapter');
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
  const deleted = await deleteDriveFile(id, fileRepo, storageAdapter, repositoryContext);

  if (!deleted) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.DRIVE_FILE_NOT_FOUND,
          message: 'File not found',
          timestamp: new Date().toISOString(),
        },
      },
      404,
    );
  }

  return c.json({ success: true });
});

app.get('/api/v1/files/:id/download', async (c) => {
  const id = c.req.param('id');

  if (!id) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'File ID is required',
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  const fileRepo = c.get('fileRepo');
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
  const file = await getDriveFile(id, fileRepo, repositoryContext);

  if (!file) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.DRIVE_FILE_NOT_FOUND,
          message: 'File not found',
          timestamp: new Date().toISOString(),
        },
      },
      404,
    );
  }

  const storageAdapter = c.get('storageAdapter');
  if (!storageAdapter) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_SERVICE_UNAVAILABLE,
          message: 'Storage not available',
          timestamp: new Date().toISOString(),
        },
      },
      503,
    );
  }

  const storageKey = `files/${id}`;
  const stream = await storageAdapter.get(storageKey);

  if (!stream) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.DRIVE_FILE_NOT_FOUND,
          message: 'File bytes not found in storage',
          timestamp: new Date().toISOString(),
        },
      },
      404,
    );
  }

  return new Response(stream, {
    headers: {
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${file.name}"`,
    },
  });
});

// Folder endpoints
app.get('/api/v1/folders', async (c) => {
  // Use in-memory repositories for public endpoint (no auth required)
  const folderRepo = new InMemoryDriveFolderRepository();
  const parentId = c.req.query('parentId');
  const repositoryContext: RepositoryContext = {
    userId: 'anonymous',
    tenantId: 'default',
    requestId: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
  };
  const folders = await listFolders(folderRepo, repositoryContext, parentId);
  return c.json({ folders });
});

app.post('/api/v1/folders', requireAuth, requireOrganization, async (c) => {
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

  const result = createFolderBodySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid folder payload',
          details: result.error.errors,
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  try {
    const folderRepo = c.get('folderRepo');
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
    const folder = await createFolder(result.data, folderRepo, repositoryContext);
    return c.json({ folder }, 201);
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});

app.put('/api/v1/folders/:id', requireAuth, requireOrganization, async (c) => {
  const id = c.req.param('id');

  if (!id) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Folder ID is required',
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

  const result = renameFolderBodySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid rename payload',
          details: result.error.errors,
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  try {
    const folderRepo = c.get('folderRepo');
    const payload = { id, name: result.data.name };
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
    const renamed = await renameFolder(payload, folderRepo, repositoryContext);
    if (!renamed) {
      return c.json(
        {
          error: {
            code: ERROR_CODES.DRIVE_FILE_NOT_FOUND,
            message: 'Folder not found',
            timestamp: new Date().toISOString(),
          },
        },
        404,
      );
    }
    return c.json({ folder: renamed });
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});

app.delete('/api/v1/folders/:id', requireAuth, requireOrganization, async (c) => {
  const id = c.req.param('id');

  if (!id) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Folder ID is required',
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  const fileRepo = c.get('fileRepo');
  const folderRepo = c.get('folderRepo');
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
  const deleted = await deleteFolder(id, fileRepo, folderRepo, repositoryContext);

  if (!deleted) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.DRIVE_FOLDER_NOT_EMPTY,
          message: 'Folder not found or not empty',
          timestamp: new Date().toISOString(),
        },
      },
      404,
    );
  }

  return c.json({ success: true });
});

// Move file endpoint
app.post('/api/v1/files/:id/move', requireAuth, requireOrganization, async (c) => {
  const id = c.req.param('id');

  if (!id) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'File ID is required',
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

  const result = moveFileBodySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid move payload',
          details: result.error.errors,
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  try {
    const fileRepo = c.get('fileRepo');
    const folderRepo = c.get('folderRepo');
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
    const payload: { id: string; folderId?: string } = { id };
    if (result.data.folderId !== undefined) {
      payload.folderId = result.data.folderId;
    }
    const moved = await moveFile(payload, fileRepo, folderRepo, repositoryContext);
    if (!moved) {
      return c.json(
        {
          error: {
            code: ERROR_CODES.DRIVE_FILE_NOT_FOUND,
            message: 'File not found',
            timestamp: new Date().toISOString(),
          },
        },
        404,
      );
    }
    return c.json({ file: moved });
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});

// Search endpoint
app.get('/api/v1/files/search', async (c) => {
  // Use in-memory repositories for public endpoint (no auth required)
  const fileRepo = new InMemoryDriveFileRepository();
  const query = c.req.query();
  const result = searchFilesQuerySchema.safeParse(query);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.GLOBAL_INVALID_REQUEST,
          message: 'Invalid search query',
          details: result.error.errors,
          timestamp: new Date().toISOString(),
        },
      },
      400,
    );
  }

  const repositoryContext: RepositoryContext = {
    userId: 'anonymous',
    tenantId: 'default',
    requestId: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
  };
  const results = await searchFiles(result.data, fileRepo, repositoryContext);
  return c.json({ files: results });
});

// Serve OpenAPI spec
app.get('/api/openapi.json', (c) => c.json(openApiDoc));

// Serve Swagger UI
app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

export default app;
