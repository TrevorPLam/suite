import { Hono } from 'hono';
import { type UploadDriveFileInput, uploadDriveFile } from '@suite/domain-drive';

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

app.get('/api/health', (c) => c.json({ ok: true, app: 'drive' }));

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

export default app;
