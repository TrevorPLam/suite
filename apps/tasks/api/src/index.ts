import { Hono } from 'hono';
import {
  TaskError,
  createTask,
  getTask,
  listTasks,
  updateTaskCompletion,
  updateTask,
  archiveTask,
  deleteTask,
  type CreateTaskInput,
  type UpdateTaskCompletionInput,
  type UpdateTaskInput,
  type ArchiveTaskInput,
} from '@suite/domain-tasks';

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

function parseTaskCompletionBody(body: unknown): UpdateTaskCompletionInput | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { completed } = body as Record<string, unknown>;

  if (typeof completed !== 'boolean') {
    return null;
  }

  return { completed };
}

function parseUpdateTaskBody(body: unknown): UpdateTaskInput | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { title } = body as Record<string, unknown>;

  if (!isNonEmptyString(title)) {
    return null;
  }

  return { title: title.trim() };
}

function parseArchiveTaskBody(body: unknown): ArchiveTaskInput | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { archived } = body as Record<string, unknown>;

  if (typeof archived !== 'boolean') {
    return null;
  }

  return { archived };
}

function readTaskError(error: unknown): { status: 400 | 404 | 500; body: Record<string, unknown> } {
  if (error instanceof TaskError) {
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
      error: 'Unable to process task',
    },
  };
}

app.get('/api/health', (c) => c.json({ ok: true, app: 'tasks' }));

app.get('/api/tasks', (c) => c.json({ tasks: listTasks() }));

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

  try {
    return c.json({ task: createTask(payload) }, 201);
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.get('/api/tasks/:id', (c) => {
  const task = getTask(c.req.param('id').trim());

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json({ task });
});

app.put('/api/tasks/:id/completion', async (c) => {
  const id = c.req.param('id').trim();

  if (!id) {
    return c.json({ error: 'Invalid task id', expected: ['id'] }, 400);
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const payload = parseTaskCompletionBody(body);

  if (!payload) {
    return c.json({ error: 'Invalid task completion payload', expected: ['completed'] }, 400);
  }

  try {
    return c.json({ task: updateTaskCompletion(id, payload) });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.put('/api/tasks/:id', async (c) => {
  const id = c.req.param('id').trim();

  if (!id) {
    return c.json({ error: 'Invalid task id', expected: ['id'] }, 400);
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const payload = parseUpdateTaskBody(body);

  if (!payload) {
    return c.json({ error: 'Invalid task update payload', expected: ['title'] }, 400);
  }

  try {
    return c.json({ task: updateTask(id, payload) });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.put('/api/tasks/:id/archive', async (c) => {
  const id = c.req.param('id').trim();

  if (!id) {
    return c.json({ error: 'Invalid task id', expected: ['id'] }, 400);
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const payload = parseArchiveTaskBody(body);

  if (!payload) {
    return c.json({ error: 'Invalid task archive payload', expected: ['archived'] }, 400);
  }

  try {
    return c.json({ task: archiveTask(id, payload) });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.delete('/api/tasks/:id', (c) => {
  const id = c.req.param('id').trim();

  if (!id) {
    return c.json({ error: 'Invalid task id', expected: ['id'] }, 400);
  }

  try {
    deleteTask(id);
    return c.json({ success: true });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

export default app;
