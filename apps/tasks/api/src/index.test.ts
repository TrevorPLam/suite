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
  beforeEach(async () => {
    await resetTasks();
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
  beforeEach(async () => {
    await resetTasks();
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
  beforeEach(async () => {
    await resetTasks();
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
  beforeEach(async () => {
    await resetTasks();
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
  beforeEach(async () => {
    await resetTasks();
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
  beforeEach(async () => {
    await resetTasks();
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
  beforeEach(async () => {
    await resetTasks();
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

describe('tasks API - search tasks', () => {
  beforeEach(async () => {
    await resetTasks();
  });

  it('should search tasks by query', async () => {
    await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        tags: ['shopping'],
      }),
    });

    await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Walk the dog',
        tags: ['pets'],
      }),
    });

    const res = await app.request('/api/tasks/search?q=buy');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('tasks');
    expect(json.tasks.length).toBe(1);
    expect(json.tasks[0].title).toBe('Buy groceries');
  });

  it('should search tasks by tags', async () => {
    await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        tags: ['shopping', 'urgent'],
      }),
    });

    await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Walk the dog',
        tags: ['pets'],
      }),
    });

    const res = await app.request('/api/tasks/search?tags=shopping');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('tasks');
    expect(json.tasks.length).toBe(1);
    expect(json.tasks[0].title).toBe('Buy groceries');
  });

  it('should search tasks by query and tags', async () => {
    await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        tags: ['shopping'],
      }),
    });

    await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy milk',
        tags: ['shopping'],
      }),
    });

    const res = await app.request('/api/tasks/search?q=buy&tags=shopping');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('tasks');
    expect(json.tasks.length).toBe(2);
  });

  it('should return empty array for no matches', async () => {
    const res = await app.request('/api/tasks/search?q=nonexistent');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('tasks');
    expect(json.tasks.length).toBe(0);
  });
});

describe('tasks API - batch complete', () => {
  beforeEach(async () => {
    await resetTasks();
  });

  it('should complete multiple tasks', async () => {
    const task1Res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Task 1',
      }),
    });

    const task2Res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Task 2',
      }),
    });

    const task1 = await task1Res.json();
    const task2 = await task2Res.json();

    const res = await app.request('/api/tasks/batch/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskIds: [task1.task.id, task2.task.id],
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('tasks');
    expect(json.tasks.length).toBe(2);
    expect(json.tasks.every((t: { completed: boolean }) => t.completed)).toBe(true);
  });

  it('should reject invalid task IDs array', async () => {
    const res = await app.request('/api/tasks/batch/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskIds: 'not-an-array',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - batch archive', () => {
  beforeEach(async () => {
    await resetTasks();
  });

  it('should archive multiple tasks', async () => {
    const task1Res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Task 1',
      }),
    });

    const task2Res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Task 2',
      }),
    });

    const task1 = await task1Res.json();
    const task2 = await task2Res.json();

    const res = await app.request('/api/tasks/batch/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskIds: [task1.task.id, task2.task.id],
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('tasks');
    expect(json.tasks.length).toBe(2);
    expect(json.tasks.every((t: { archived: boolean }) => t.archived)).toBe(true);
  });

  it('should reject invalid task IDs array', async () => {
    const res = await app.request('/api/tasks/batch/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskIds: 'not-an-array',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - create with new fields', () => {
  beforeEach(async () => {
    await resetTasks();
  });

  it('should create task with due date', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        dueDate: '2026-12-31T23:59:59Z',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.task.dueDate).toBe('2026-12-31T23:59:59Z');
  });

  it('should create task with priority', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        priority: 'high',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.task.priority).toBe('high');
  });

  it('should create task with tags', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        tags: ['shopping', 'urgent'],
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.task.tags).toEqual(['shopping', 'urgent']);
  });

  it('should create task with all new fields', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        dueDate: '2026-12-31T23:59:59Z',
        priority: 'high',
        tags: ['shopping'],
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.task.dueDate).toBe('2026-12-31T23:59:59Z');
    expect(json.task.priority).toBe('high');
    expect(json.task.tags).toEqual(['shopping']);
  });

  it('should reject invalid priority', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        priority: 'invalid',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject invalid tags (not array)', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        tags: 'not-an-array',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - update with new fields', () => {
  beforeEach(async () => {
    await resetTasks();
  });

  it('should update task due date', async () => {
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
        dueDate: '2026-12-31T23:59:59Z',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.task.dueDate).toBe('2026-12-31T23:59:59Z');
  });

  it('should update task priority', async () => {
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
        priority: 'high',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.task.priority).toBe('high');
  });

  it('should update task tags', async () => {
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
        tags: ['shopping', 'urgent'],
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.task.tags).toEqual(['shopping', 'urgent']);
  });

  it('should remove due date with null', async () => {
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        dueDate: '2026-12-31T23:59:59Z',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dueDate: null,
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.task.dueDate).toBeNull();
  });

  it('should reject update with no fields', async () => {
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
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});
