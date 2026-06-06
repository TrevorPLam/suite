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
  type CreateFolderInput,
  type MoveFileInput,
  type RenameDriveFileInput,
  type RenameFolderInput,
  type SearchFilesInput,
  type UploadDriveFileInput,
  uploadDriveFile,
  DriveError,
} from '@suite/domain-drive';
import { wireRepositories, getR2Adapter } from './bootstrap.js';
import { validateDriveEnv } from '@suite/env-config';
import { mountAuth, requireAuth } from '@suite/auth';
import { UsageMonitor, rateLimit, structuredLogger } from '@suite/shared-kernel';
import { PostgresUsageRepository } from '@suite/db';

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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseUploadDriveFileBody(body: unknown): UploadDriveFileInput | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { name, size, folderId, mimeType } = body as Record<string, unknown>;

  if (!isNonEmptyString(name) || typeof size !== 'number' || !Number.isInteger(size) || size < 0) {
    return null;
  }

  const result: UploadDriveFileInput = {
    name: name.trim(),
    size,
  };

  if (folderId !== undefined) {
    if (typeof folderId !== 'string' || folderId.trim().length === 0) {
      return null;
    }
    result.folderId = folderId.trim();
  }

  if (mimeType !== undefined) {
    if (typeof mimeType !== 'string' || mimeType.trim().length === 0) {
      return null;
    }
    result.mimeType = mimeType.trim();
  }

  return result;
}

function parseRenameDriveFileBody(body: unknown, id: string): RenameDriveFileInput | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { name } = body as Record<string, unknown>;

  if (!isNonEmptyString(name)) {
    return null;
  }

  return {
    id,
    name: name.trim(),
  };
}

function parseCreateFolderBody(body: unknown): CreateFolderInput | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { name, parentId } = body as Record<string, unknown>;

  if (!isNonEmptyString(name)) {
    return null;
  }

  const result: CreateFolderInput = {
    name: name.trim(),
  };

  if (parentId !== undefined) {
    if (typeof parentId !== 'string' || parentId.trim().length === 0) {
      return null;
    }
    result.parentId = parentId.trim();
  }

  return result;
}

function parseRenameFolderBody(body: unknown, id: string): RenameFolderInput | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { name } = body as Record<string, unknown>;

  if (!isNonEmptyString(name)) {
    return null;
  }

  return {
    id,
    name: name.trim(),
  };
}

function parseMoveFileBody(body: unknown, id: string): MoveFileInput | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { folderId } = body as Record<string, unknown>;

  const result: MoveFileInput = { id };

  if (folderId !== undefined) {
    if (typeof folderId !== 'string' || folderId.trim().length === 0) {
      return null;
    }
    result.folderId = folderId.trim();
  }

  return result;
}

function parseSearchFilesQuery(query: Record<string, string>): SearchFilesInput | null {
  const { q, folderId } = query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return null;
  }

  const result: SearchFilesInput = {
    query: q.trim(),
  };

  if (folderId !== undefined) {
    if (typeof folderId !== 'string' || folderId.trim().length === 0) {
      return null;
    }
    result.folderId = folderId.trim();
  }

  return result;
}

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
        return c.json(uploadedFile, 201);
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

  const payload = parseUploadDriveFileBody(body);

  if (!payload) {
    return c.json({
      error: 'Invalid file payload',
      expected: ['name', 'size'],
      optional: ['folderId', 'mimeType'],
    }, 400);
  }

  // File size limit: 100MB
  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  if (payload.size > MAX_FILE_SIZE) {
    return c.json({
      error: 'File size exceeds limit',
      maxSize: MAX_FILE_SIZE,
      actualSize: payload.size,
    }, 413);
  }

  try {
    const file = await uploadDriveFile(payload);
    return c.json(file, 201);
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

  const payload = parseRenameDriveFileBody(body, id);

  if (!payload) {
    return c.json({
      error: 'Invalid rename payload',
      expected: ['name'],
    }, 400);
  }

  try {
    const result = await renameDriveFile(payload);
    if (!result) {
      return c.json({ error: 'File not found' }, 404);
    }
    return c.json(result);
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

  return c.json({ ok: true });
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

  const payload = parseCreateFolderBody(body);

  if (!payload) {
    return c.json({
      error: 'Invalid folder payload',
      expected: ['name'],
      optional: ['parentId'],
    }, 400);
  }

  try {
    const folder = await createFolder(payload);
    return c.json(folder, 201);
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

  const payload = parseRenameFolderBody(body, id);

  if (!payload) {
    return c.json({
      error: 'Invalid rename payload',
      expected: ['name'],
    }, 400);
  }

  try {
    const result = await renameFolder(payload);
    if (!result) {
      return c.json({ error: 'Folder not found' }, 404);
    }
    return c.json(result);
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

  return c.json({ ok: true });
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

  const payload = parseMoveFileBody(body, id);

  if (!payload) {
    return c.json({
      error: 'Invalid move payload',
      optional: ['folderId'],
    }, 400);
  }

  try {
    const result = await moveFile(payload);
    if (!result) {
      return c.json({ error: 'File not found' }, 404);
    }
    return c.json(result);
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});

// Search endpoint
app.get('/api/files/search', async (c) => {
  const query = c.req.query();
  const payload = parseSearchFilesQuery(query);

  if (!payload) {
    return c.json({
      error: 'Invalid search query',
      expected: ['q'],
      optional: ['folderId'],
    }, 400);
  }

  const results = await searchFiles(payload);
  return c.json({ files: results });
});

export default app;
