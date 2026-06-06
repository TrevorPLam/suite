import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
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
import { UsageMonitor, rateLimit, structuredLogger } from '@suite/shared-kernel';
import { PostgresUsageRepository } from '@suite/db';
import {
  uploadFileBodySchema,
  renameFileBodySchema,
  createFolderBodySchema,
  renameFolderBodySchema,
  moveFileBodySchema,
  searchFilesQuerySchema,
} from './schemas.js';

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

// Mount structured logging middleware
app.use('/api/*', structuredLogger());

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
      error: 'Unable to process drive operation',
    },
  };
}

app.get('/api/health', (c) => c.json({ ok: true, app: 'drive' }));

app.get('/api/files', async (c) => {
  const files = await listDriveFiles();
  return c.json({ files });
});

app.post('/api/files', requireAuth, async (c) => {
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
        return c.json({ error: 'File is required' }, 400);
      }

      if (!name) {
        return c.json({ error: 'Name is required' }, 400);
      }

      // File size limit: 100MB
      const MAX_FILE_SIZE = 100 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        return c.json({
          error: 'File size exceeds limit',
          maxSize: MAX_FILE_SIZE,
          actualSize: file.size,
        }, 413);
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
      return c.json({ error: 'Failed to parse form data' }, 400);
    }
  }

  // Handle JSON for metadata-only uploads (legacy support)
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = uploadFileBodySchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: 'Invalid file payload',
      details: result.error.errors,
    }, 400);
  }

  // File size limit: 100MB
  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  if (result.data.size > MAX_FILE_SIZE) {
    return c.json({
      error: 'File size exceeds limit',
      maxSize: MAX_FILE_SIZE,
      actualSize: result.data.size,
    }, 413);
  }

  try {
    const file = await uploadDriveFile(result.data);
    return c.json({ file }, 201);
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});

app.put('/api/files/:id', requireAuth, async (c) => {
  const id = c.req.param('id');

  if (!id) {
    return c.json({ error: 'File ID is required' }, 400);
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = renameFileBodySchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: 'Invalid rename payload',
      details: result.error.errors,
    }, 400);
  }

  try {
    const payload = { id, name: result.data.name };
    const renamed = await renameDriveFile(payload);
    if (!renamed) {
      return c.json({ error: 'File not found' }, 404);
    }
    return c.json({ file: renamed });
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});

app.delete('/api/files/:id', requireAuth, async (c) => {
  const id = c.req.param('id');

  if (!id) {
    return c.json({ error: 'File ID is required' }, 400);
  }

  const deleted = await deleteDriveFile(id);

  if (!deleted) {
    return c.json({ error: 'File not found' }, 404);
  }

  return c.json({ success: true });
});

app.get('/api/files/:id/download', async (c) => {
  const id = c.req.param('id');

  if (!id) {
    return c.json({ error: 'File ID is required' }, 400);
  }

  const file = await getDriveFile(id);

  if (!file) {
    return c.json({ error: 'File not found' }, 404);
  }

  const r2Adapter = getR2Adapter();
  if (!r2Adapter) {
    return c.json({ error: 'Storage not available' }, 503);
  }

  const storageKey = `files/${id}`;
  const stream = await r2Adapter.get(storageKey);

  if (!stream) {
    return c.json({ error: 'File bytes not found in storage' }, 404);
  }

  return new Response(stream, {
    headers: {
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${file.name}"`,
    },
  });
});

// Folder endpoints
app.get('/api/folders', async (c) => {
  const parentId = c.req.query('parentId');
  const folders = await listFolders(parentId);
  return c.json({ folders });
});

app.post('/api/folders', requireAuth, async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = createFolderBodySchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: 'Invalid folder payload',
      details: result.error.errors,
    }, 400);
  }

  try {
    const folder = await createFolder(result.data);
    return c.json({ folder }, 201);
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});

app.put('/api/folders/:id', requireAuth, async (c) => {
  const id = c.req.param('id');

  if (!id) {
    return c.json({ error: 'Folder ID is required' }, 400);
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = renameFolderBodySchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: 'Invalid rename payload',
      details: result.error.errors,
    }, 400);
  }

  try {
    const payload = { id, name: result.data.name };
    const renamed = await renameFolder(payload);
    if (!renamed) {
      return c.json({ error: 'Folder not found' }, 404);
    }
    return c.json({ folder: renamed });
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});

app.delete('/api/folders/:id', requireAuth, async (c) => {
  const id = c.req.param('id');

  if (!id) {
    return c.json({ error: 'Folder ID is required' }, 400);
  }

  const deleted = await deleteFolder(id);

  if (!deleted) {
    return c.json({ error: 'Folder not found or not empty' }, 404);
  }

  return c.json({ success: true });
});

// Move file endpoint
app.post('/api/files/:id/move', requireAuth, async (c) => {
  const id = c.req.param('id');

  if (!id) {
    return c.json({ error: 'File ID is required' }, 400);
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = moveFileBodySchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: 'Invalid move payload',
      details: result.error.errors,
    }, 400);
  }

  try {
    const payload: { id: string; folderId?: string } = { id };
    if (result.data.folderId !== undefined) {
      payload.folderId = result.data.folderId;
    }
    const moved = await moveFile(payload);
    if (!moved) {
      return c.json({ error: 'File not found' }, 404);
    }
    return c.json({ file: moved });
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});

// Search endpoint
app.get('/api/files/search', async (c) => {
  const query = c.req.query();
  const result = searchFilesQuerySchema.safeParse(query);

  if (!result.success) {
    return c.json({
      error: 'Invalid search query',
      details: result.error.errors,
    }, 400);
  }

  const results = await searchFiles(result.data);
  return c.json({ files: results });
});

export default app;
