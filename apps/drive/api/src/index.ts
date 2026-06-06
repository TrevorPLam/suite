import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { swaggerUI } from '@hono/swagger-ui';
import { timeout } from 'hono/timeout';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
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
} from '@suite/domain-drive';
import { wireRepositories, getR2Adapter } from './bootstrap.js';
import { validateDriveEnv } from '@suite/env-config';
import { mountAuth, requireAuth } from '@suite/auth';
import { UsageMonitor, rateLimit, structuredLogger, requestId, ERROR_CODES } from '@suite/shared-kernel';
import { PostgresUsageRepository, getDbOrNull } from '@suite/db';
import {
  uploadFileBodySchema,
  renameFileBodySchema,
  createFolderBodySchema,
  renameFolderBodySchema,
  moveFileBodySchema,
  searchFilesQuerySchema,
} from './schemas.js';
import { openApiDoc } from './openapi.js';

// Validate environment variables at startup
validateDriveEnv();

// Create usage repository for monitoring
const usageRepository = new PostgresUsageRepository();

type Env = {
  R2: R2Bucket;
};

type Variables = {
  userId: string | null;
  r2Bucket: R2Bucket | null;
};

const app = new Hono<{ Variables: Variables; Bindings: Env }>();

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
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'];
app.use('/api/*', cors({
  origin: allowedOrigins,
  credentials: true,
}));

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

// Mount Better Auth handler
mountAuth(app);

// Mount UsageMonitor middleware (blocks at 80% of 1000 requests per hour)
app.use('/api/*', UsageMonitor({
  limit: 1000,
  periodMs: 3600000, // 1 hour
  usageRepository,
}));

// Mount rate limiting middleware (60 requests per minute per user)
app.use('/api/*', rateLimit({
  requestsPerMinute: 60,
}));

// Middleware to wire repositories with userId from auth context
app.use('/api/*', async (c, next) => {
  const userId = c.get('userId') as string | undefined;
  const r2Bucket = c.env.R2 || null;
  c.set('r2Bucket', r2Bucket);
  if (userId) {
    await wireRepositories(userId, r2Bucket || undefined);
  }
  await next();
});

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
  const db = getDbOrNull();
  let dbStatus = 'ok';
  let dbLatency: number | undefined;

  if (db) {
    try {
      const start = performance.now();
      await db.execute('SELECT 1');
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
  const files = await listDriveFiles();
  return c.json({ files });
});

// Upload endpoint with longer timeout (5 minutes for file uploads) and higher body limit (100MB)
app.post('/api/v1/files', requireAuth, timeout(300000, timeoutException), bodyLimit({
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
        const uploadedFile = await uploadDriveFile(payload);
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
    const file = await uploadDriveFile(result.data);
    return c.json({ file }, 201);
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});

app.put('/api/v1/files/:id', requireAuth, async (c) => {
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
    const payload = { id, name: result.data.name };
    const renamed = await renameDriveFile(payload);
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

app.delete('/api/v1/files/:id', requireAuth, async (c) => {
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

  const deleted = await deleteDriveFile(id);

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

  const file = await getDriveFile(id);

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

  const r2Adapter = getR2Adapter();
  if (!r2Adapter) {
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
  const stream = await r2Adapter.get(storageKey);

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
  const parentId = c.req.query('parentId');
  const folders = await listFolders(parentId);
  return c.json({ folders });
});

app.post('/api/v1/folders', requireAuth, async (c) => {
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
    const folder = await createFolder(result.data);
    return c.json({ folder }, 201);
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});

app.put('/api/v1/folders/:id', requireAuth, async (c) => {
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
    const payload = { id, name: result.data.name };
    const renamed = await renameFolder(payload);
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

app.delete('/api/v1/folders/:id', requireAuth, async (c) => {
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

  const deleted = await deleteFolder(id);

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
app.post('/api/v1/files/:id/move', requireAuth, async (c) => {
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
    const payload: { id: string; folderId?: string } = { id };
    if (result.data.folderId !== undefined) {
      payload.folderId = result.data.folderId;
    }
    const moved = await moveFile(payload);
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

  const results = await searchFiles(result.data);
  return c.json({ files: results });
});

// Serve OpenAPI spec
app.get('/api/openapi.json', (c) => c.json(openApiDoc));

// Serve Swagger UI
app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

export default app;
