import { describe, it, expect, beforeEach } from 'vitest';
import { resetTasks } from '@suite/domain-tasks';
import app from './index.js';

describe('tasks API - health', () => {
  it('should return health check', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, app: 'tasks' });
  });
});

describe('tasks API - list tasks', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should list all tasks', async () => {
    const res = await app.request('/api/tasks');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('tasks');
    expect(Array.isArray(json.tasks)).toBe(true);
  });
});

describe('tasks API - create task', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should create a valid task', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('task');
    expect(json.task).toHaveProperty('id');
    expect(json.task.title).toBe('Buy groceries');
    expect(json.task.completed).toBe(false);
  });

  it('should create a task with completed status', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        completed: true,
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.task.completed).toBe(true);
  });

  it('should reject invalid JSON', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject missing title', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject empty title', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - get task', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should get task by id', async () => {
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/tasks/${taskId}`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('task');
    expect(json.task.id).toBe(taskId);
  });

  it('should return 404 for non-existent task', async () => {
    const res = await app.request('/api/tasks/non-existent-id');
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - update completion', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should update task completion', async () => {
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/tasks/${taskId}/completion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed: true,
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('task');
    expect(json.task.completed).toBe(true);
  });

  it('should reject invalid completion payload', async () => {
    const res = await app.request('/api/tasks/some-id/completion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed: 'not-a-boolean',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - update task', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should update task title', async () => {
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy milk and eggs',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('task');
    expect(json.task.title).toBe('Buy milk and eggs');
  });

  it('should reject empty title', async () => {
    const res = await app.request('/api/tasks/some-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - archive task', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should archive a task', async () => {
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/tasks/${taskId}/archive`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        archived: true,
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('task');
    expect(json.task.archived).toBe(true);
  });
});

describe('tasks API - delete task', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should delete a task', async () => {
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('success');
    expect(json.success).toBe(true);
  });

  it('should return 404 for non-existent task', async () => {
    const res = await app.request('/api/tasks/non-existent-id', {
      method: 'DELETE',
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});
