import { Hono } from 'hono';
import { deleteDriveFile, listDriveFiles, renameDriveFile, type RenameDriveFileInput, type UploadDriveFileInput, uploadDriveFile } from '@suite/domain-drive';

const app = new Hono();

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseUploadDriveFileBody(body: unknown): UploadDriveFileInput | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { name, size } = body as Record<string, unknown>;

  if (!isNonEmptyString(name) || typeof size !== 'number' || !Number.isInteger(size) || size < 0) {
    return null;
  }

  return {
    name: name.trim(),
    size,
  };
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

app.get('/api/health', (c) => c.json({ ok: true, app: 'drive' }));

app.get('/api/files', (c) => c.json({ files: listDriveFiles() }));

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
    }, 400);
  }

  return c.json(uploadDriveFile(payload), 201);
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

  const result = renameDriveFile(payload);

  if (!result) {
    return c.json({ error: 'File not found' }, 404);
  }

  return c.json(result);
});

app.delete('/api/files/:id', (c) => {
  const id = c.req.param('id');

  if (!id) {
    return c.json({ error: 'File ID is required' }, 400);
  }

  const deleted = deleteDriveFile(id);

  if (!deleted) {
    return c.json({ error: 'File not found' }, 404);
  }

  return c.json({ ok: true });
});

export default app;
