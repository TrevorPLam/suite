import { Hono } from 'hono';
import {
  createFolder,
  deleteDriveFile,
  deleteFolder,
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
import { wireRepositories } from './bootstrap.js';
import { validateDriveEnv } from '@suite/env-config';
import { mountAuth } from '@suite/auth';

// Validate environment variables at startup
const env = validateDriveEnv();

// Wire repositories before mounting routes
wireRepositories();

const app = new Hono();

// Mount Better Auth handler
mountAuth(app);

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

app.post('/api/files', async (c) => {
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

app.put('/api/files/:id', async (c) => {
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

app.delete('/api/files/:id', async (c) => {
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

// Folder endpoints
app.get('/api/folders', async (c) => {
  const parentId = c.req.query('parentId');
  const folders = await listFolders(parentId);
  return c.json({ folders });
});

app.post('/api/folders', async (c) => {
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

app.put('/api/folders/:id', async (c) => {
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

app.delete('/api/folders/:id', async (c) => {
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
app.post('/api/files/:id/move', async (c) => {
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
