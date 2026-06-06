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
  searchTasks,
  batchComplete,
  batchArchive,
  type SearchTasksInput,
} from '@suite/domain-tasks';
import { wireRepositories } from './bootstrap.js';
import { validateTasksEnv } from '@suite/env-config';
import { mountAuth, requireAuth } from '@suite/auth';
import {
  createTaskBodySchema,
  taskCompletionBodySchema,
  updateTaskBodySchema,
  archiveTaskBodySchema,
  batchOperationBodySchema,
} from './schemas.js';

// Validate environment variables at startup
validateTasksEnv();

// Wire repositories before mounting routes
wireRepositories();

const app = new Hono();

// Mount Better Auth handler
mountAuth(app);

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

app.get('/api/tasks', async (c) => c.json({ tasks: await listTasks() }));

app.get('/api/tasks/search', async (c) => {
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

app.post('/api/tasks', requireAuth, async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = createTaskBodySchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: 'Invalid task payload',
      expected: ['title', 'completed?'],
      details: result.error.errors,
    }, 400);
  }

  try {
    return c.json({ task: await createTask(result.data) }, 201);
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.get('/api/tasks/:id', async (c) => {
  const task = await getTask(c.req.param('id').trim());

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json({ task });
});

app.put('/api/tasks/:id/completion', requireAuth, async (c) => {
  const id = (c.req.param('id') || '').trim();

  if (!id) {
    return c.json({ error: 'Invalid task id', expected: ['id'] }, 400);
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = taskCompletionBodySchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid task completion payload', expected: ['completed'] }, 400);
  }

  try {
    return c.json({ task: await updateTaskCompletion(id, result.data) });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.put('/api/tasks/:id', requireAuth, async (c) => {
  const id = (c.req.param('id') || '').trim();

  if (!id) {
    return c.json({ error: 'Invalid task id', expected: ['id'] }, 400);
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = updateTaskBodySchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid task update payload', expected: ['title'] }, 400);
  }

  try {
    return c.json({ task: await updateTask(id, result.data) });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.put('/api/tasks/:id/archive', requireAuth, async (c) => {
  const id = (c.req.param('id') || '').trim();

  if (!id) {
    return c.json({ error: 'Invalid task id', expected: ['id'] }, 400);
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = archiveTaskBodySchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid task archive payload', expected: ['archived'] }, 400);
  }

  try {
    return c.json({ task: await archiveTask(id, result.data) });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.delete('/api/tasks/:id', requireAuth, async (c) => {
  const id = (c.req.param('id') || '').trim();

  if (!id) {
    return c.json({ error: 'Invalid task id', expected: ['id'] }, 400);
  }

  try {
    await deleteTask(id);
    return c.json({ success: true });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.post('/api/tasks/batch/complete', requireAuth, async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = batchOperationBodySchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: 'Invalid batch operation payload',
      expected: ['taskIds: string[]'],
    }, 400);
  }

  try {
    const results = await batchComplete(result.data);
    return c.json({ tasks: results });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.post('/api/tasks/batch/archive', requireAuth, async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = batchOperationBodySchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: 'Invalid batch operation payload',
      expected: ['taskIds: string[]'],
    }, 400);
  }

  try {
    const results = await batchArchive(result.data);
    return c.json({ tasks: results });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

export default app;
