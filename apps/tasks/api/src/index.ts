import { Hono } from 'hono';
import { createTask, type CreateTaskInput } from '@suite/domain-tasks';

const app = new Hono();

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseCreateTaskBody(body: unknown): CreateTaskInput | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { title, completed } = body as Record<string, unknown>;

  if (!isNonEmptyString(title)) {
    return null;
  }

  if (completed !== undefined && typeof completed !== 'boolean') {
    return null;
  }

  const payload: CreateTaskInput = {
    title: title.trim(),
  };

  if (completed !== undefined) {
    payload.completed = completed;
  }

  return payload;
}

app.get('/api/health', (c) => c.json({ ok: true, app: 'tasks' }));

app.post('/api/tasks', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const payload = parseCreateTaskBody(body);

  if (!payload) {
    return c.json({
      error: 'Invalid task payload',
      expected: ['title', 'completed?'],
    }, 400);
  }

  return c.json(createTask(payload), 201);
});

export default app;
