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
  type CreateTaskInput,
  type UpdateTaskCompletionInput,
  type UpdateTaskInput,
  type ArchiveTaskInput,
  type TaskPriority,
  type SearchTasksInput,
  type BatchOperationInput,
} from '@suite/domain-tasks';

const app = new Hono();

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseCreateTaskBody(body: unknown): CreateTaskInput | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { title, completed, dueDate, priority, tags } = body as Record<string, unknown>;

  if (!isNonEmptyString(title)) {
    return null;
  }

  if (completed !== undefined && typeof completed !== 'boolean') {
    return null;
  }

  if (dueDate !== undefined && dueDate !== null && typeof dueDate !== 'string') {
    return null;
  }

  if (priority !== undefined && !['low', 'medium', 'high'].includes(priority as string)) {
    return null;
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    return null;
  }

  if (tags !== undefined && !tags.every((tag: unknown) => typeof tag === 'string')) {
    return null;
  }

  const payload: CreateTaskInput = {
    title: title.trim(),
  };

  if (completed !== undefined) {
    payload.completed = completed;
  }

  if (dueDate !== undefined) {
    payload.dueDate = dueDate === null ? null : dueDate;
  }

  if (priority !== undefined) {
    payload.priority = priority as TaskPriority;
  }

  if (tags !== undefined) {
    payload.tags = tags as string[];
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

  const { title, dueDate, priority, tags } = body as Record<string, unknown>;

  if (title !== undefined && !isNonEmptyString(title)) {
    return null;
  }

  if (dueDate !== undefined && dueDate !== null && typeof dueDate !== 'string') {
    return null;
  }

  if (priority !== undefined && !['low', 'medium', 'high'].includes(priority as string)) {
    return null;
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    return null;
  }

  if (tags !== undefined && !tags.every((tag: unknown) => typeof tag === 'string')) {
    return null;
  }

  const payload: UpdateTaskInput = {};

  if (title !== undefined) {
    payload.title = title.trim();
  }

  if (dueDate !== undefined) {
    payload.dueDate = dueDate === null ? null : dueDate;
  }

  if (priority !== undefined) {
    payload.priority = priority as TaskPriority;
  }

  if (tags !== undefined) {
    payload.tags = tags as string[];
  }

  if (Object.keys(payload).length === 0) {
    return null;
  }

  return payload;
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
    return c.json({ task: await createTask(payload) }, 201);
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
    return c.json({ task: await updateTaskCompletion(id, payload) });
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
    return c.json({ task: await updateTask(id, payload) });
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
    return c.json({ task: await archiveTask(id, payload) });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.delete('/api/tasks/:id', async (c) => {
  const id = c.req.param('id').trim();

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

function parseBatchOperationBody(body: unknown): BatchOperationInput | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { taskIds } = body as Record<string, unknown>;

  if (!Array.isArray(taskIds)) {
    return null;
  }

  if (!taskIds.every((id: unknown) => typeof id === 'string' && id.trim().length > 0)) {
    return null;
  }

  return { taskIds: taskIds as string[] };
}

app.post('/api/tasks/batch/complete', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const payload = parseBatchOperationBody(body);

  if (!payload) {
    return c.json({
      error: 'Invalid batch operation payload',
      expected: ['taskIds: string[]'],
    }, 400);
  }

  try {
    const results = await batchComplete(payload);
    return c.json({ tasks: results });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

app.post('/api/tasks/batch/archive', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const payload = parseBatchOperationBody(body);

  if (!payload) {
    return c.json({
      error: 'Invalid batch operation payload',
      expected: ['taskIds: string[]'],
    }, 400);
  }

  try {
    const results = await batchArchive(payload);
    return c.json({ tasks: results });
  } catch (error) {
    const response = readTaskError(error);

    return c.json(response.body, response.status);
  }
});

export default app;
