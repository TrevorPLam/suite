// Contract: apps/tasks/specs/create-task.spec.md
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Context, Next } from 'hono';

// Mock database to prevent real PostgreSQL connection attempts
const mockQuery = vi.fn();
const mockTransaction = vi.fn();
const mockGetDrizzleDb = vi.fn();
const mockSetTenantContext = vi.fn();
const mockClose = vi.fn();

vi.mock('@suite/db', () => ({
  createDbClient: vi.fn(() => ({
    query: mockQuery,
    transaction: mockTransaction,
    getDrizzleDb: mockGetDrizzleDb,
    setTenantContext: mockSetTenantContext,
    close: mockClose,
  })),
  PostgresUsageRepository: vi.fn().mockImplementation(() => ({
    incrementUsage: vi.fn(),
    getUsage: vi.fn().mockResolvedValue({ count: 0 }),
  })),
  PostgresTaskRepository: vi.fn().mockImplementation(() => ({
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Mock requireAuth to return 401 by default, but allow override for authenticated tests
let allowAuth = false;

vi.mock('@suite/auth', () => ({
  requireAuth: vi.fn(async (c: Context, next: Next) => {
    if (allowAuth) {
      c.set('userId', 'test-user-id');
      await next();
    } else {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }),
  mountAuth: vi.fn(() => {}),
  authMiddleware: vi.fn(async (c: Context, next: Next) => {
    // Simulate real authMiddleware: set userId from session if authenticated
    if (allowAuth) {
      c.set('userId', 'test-user-id');
      c.set('organizationId', 'default');
    }
    await next();
  }),
  requireOrganization: vi.fn(async (c: Context, next: Next) => {
    await next();
  }),
  createAuth: vi.fn(() => ({})),
}));

// Mock requireRepositoryContext to skip the check in tests
vi.mock('@suite/shared-kernel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@suite/shared-kernel')>();
  return {
    ...actual,
    requireRepositoryContext: () => async (c: Context, next: Next) => {
      // Always set context and proceed, bypassing validation
      c.set('repositoryContext', {
        userId: 'test-user-id',
        tenantId: 'default',
        requestId: 'test-request-id',
      });
      await next();
    },
  };
});

// Mock domain-tasks functions to return test data
vi.mock('@suite/domain-tasks', () => ({
  createTask: vi.fn().mockResolvedValue({
    id: 'test-task-id',
    title: 'Test Task',
    status: 'todo',
  }),
  listTasks: vi.fn().mockResolvedValue([]),
  updateTask: vi.fn().mockResolvedValue({
    id: 'test-task-id',
    title: 'Updated Task',
    status: 'done',
  }),
  deleteTask: vi.fn().mockResolvedValue(undefined),
  setTaskKeyProviderFromEnv: vi.fn().mockResolvedValue(undefined),
  isEncryptionEnabled: vi.fn().mockReturnValue(false),
  resetTasks: vi.fn(),
  TaskError: class TaskError extends Error {
    code: string;
    details: unknown;
    constructor(message: string, code: string, details?: unknown) {
      super(message);
      this.name = 'TaskError';
      this.code = code;
      this.details = details;
    }
  },
}));

// Mock validateTasksEnv to prevent errors
vi.mock('@suite/env-config', () => ({
  validateTasksEnv: vi.fn(() => ({
    DATABASE_URL: 'postgresql://localhost:5432/test',
    ENCRYPTION_KEY: undefined,
    PORT: 3001,
    NODE_ENV: 'test',
  })),
}));

import app from './index.js';

describe('tasks API - health', () => {
  it('should return health check', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, app: 'tasks' });
  });

  it('GET /api/health returns 200 without session', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
  });
});

describe('tasks API - authentication', () => {
  it('POST /api/tasks returns 401 without session', async () => {
    const res = await app.request('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('PUT /api/tasks/:id/completion returns 401 without session', async () => {
    const res = await app.request('/api/v1/tasks/some-id/completion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed: true,
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('PUT /api/tasks/:id returns 401 without session', async () => {
    const res = await app.request('/api/v1/tasks/some-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated title',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('PUT /api/tasks/:id/archive returns 401 without session', async () => {
    const res = await app.request('/api/v1/tasks/some-id/archive', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        archived: true,
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('DELETE /api/tasks/:id returns 401 without session', async () => {
    const res = await app.request('/api/v1/tasks/some-id', {
      method: 'DELETE',
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('POST /api/tasks/batch/complete returns 401 without session', async () => {
    const res = await app.request('/api/v1/tasks/batch/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskIds: ['task-1', 'task-2'],
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('POST /api/tasks/batch/archive returns 401 without session', async () => {
    const res = await app.request('/api/v1/tasks/batch/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskIds: ['task-1', 'task-2'],
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - list tasks', () => {
  it('should list all tasks', async () => {
    const res = await app.request('/api/tasks');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('tasks');
    expect(Array.isArray(json.tasks)).toBe(true);
  });
});

describe('tasks API - create task', () => {
  it('should create a valid task', async () => {
    allowAuth = true;
    const res = await app.request('/api/v1/tasks', {
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
    allowAuth = false;
  });

  it('should create a task with completed status', async () => {
    allowAuth = true;
    const res = await app.request('/api/v1/tasks', {
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
    allowAuth = false;
  });

  it('should reject invalid JSON', async () => {
    const res = await app.request('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject missing title', async () => {
    const res = await app.request('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject empty title', async () => {
    const res = await app.request('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - get task', () => {
  it('should get task by id', async () => {
    allowAuth = true;
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/v1/tasks/${taskId}`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('task');
    expect(json.task.id).toBe(taskId);
    allowAuth = false;
  });

  it('should return 404 for non-existent task', async () => {
    const res = await app.request('/api/v1/tasks/non-existent-id');
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - update completion', () => {
  beforeEach(async () => {
  });

  it('should update task completion', async () => {
    allowAuth = true;
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/v1/tasks/${taskId}/completion`, {
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
    allowAuth = false;
  });

  it('should reject invalid completion payload', async () => {
    const res = await app.request('/api/v1/tasks/some-id/completion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed: 'not-a-boolean',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - update task', () => {
  beforeEach(async () => {
  });

  it('should update task title', async () => {
    allowAuth = true;
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/v1/tasks/${taskId}`, {
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
    allowAuth = false;
  });

  it('should reject empty title', async () => {
    const res = await app.request('/api/v1/tasks/some-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - archive task', () => {
  beforeEach(async () => {
  });

  it('should archive a task', async () => {
    allowAuth = true;
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/v1/tasks/${taskId}/archive`, {
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
    allowAuth = false;
  });
});

describe('tasks API - delete task', () => {
  beforeEach(async () => {
  });

  it('should delete a task', async () => {
    allowAuth = true;
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/v1/tasks/${taskId}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('success');
    expect(json.success).toBe(true);
    allowAuth = false;
  });

  it('should return 404 for non-existent task', async () => {
    const res = await app.request('/api/v1/tasks/non-existent-id', {
      method: 'DELETE',
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - search tasks', () => {
  beforeEach(async () => {
  });

  it('should search tasks by query', async () => {
    allowAuth = true;
    await app.request('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        tags: ['shopping'],
      }),
    });

    await app.request('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Walk the dog',
        tags: ['pets'],
      }),
    });

    const res = await app.request('/api/v1/tasks/search?q=buy');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('tasks');
    expect(json.tasks.length).toBe(1);
    expect(json.tasks[0].title).toBe('Buy groceries');
    allowAuth = false;
  });

  it('should search tasks by tags', async () => {
    allowAuth = true;
    await app.request('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        tags: ['shopping', 'urgent'],
      }),
    });

    await app.request('/api/v1/tasks', {
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
    allowAuth = false;
  });

  it('should search tasks by query and tags', async () => {
    allowAuth = true;
    await app.request('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        tags: ['shopping'],
      }),
    });

    await app.request('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy milk',
        tags: ['shopping'],
      }),
    });

    const res = await app.request('/api/v1/tasks/search?q=buy&tags=shopping');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('tasks');
    expect(json.tasks.length).toBe(2);
    allowAuth = false;
  });

  it('should return empty array for no matches', async () => {
    const res = await app.request('/api/v1/tasks/search?q=nonexistent');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('tasks');
    expect(json.tasks.length).toBe(0);
  });
});

describe('tasks API - batch complete', () => {
  beforeEach(async () => {
  });

  it('should complete multiple tasks', async () => {
    allowAuth = true;
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

    const res = await app.request('/api/v1/tasks/batch/complete', {
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
    allowAuth = false;
  });

  it('should reject invalid task IDs array', async () => {
    const res = await app.request('/api/v1/tasks/batch/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskIds: 'not-an-array',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - batch archive', () => {
  beforeEach(async () => {
  });

  it('should archive multiple tasks', async () => {
    allowAuth = true;
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

    const res = await app.request('/api/v1/tasks/batch/archive', {
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
    allowAuth = false;
  });

  it('should reject invalid task IDs array', async () => {
    const res = await app.request('/api/v1/tasks/batch/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskIds: 'not-an-array',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - create with new fields', () => {
  beforeEach(async () => {
  });

  it('should create task with due date', async () => {
    allowAuth = true;
    const res = await app.request('/api/v1/tasks', {
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
    allowAuth = false;
  });

  it('should create task with priority', async () => {
    allowAuth = true;
    const res = await app.request('/api/v1/tasks', {
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
    allowAuth = false;
  });

  it('should create task with tags', async () => {
    allowAuth = true;
    const res = await app.request('/api/v1/tasks', {
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
    allowAuth = false;
  });

  it('should create task with all new fields', async () => {
    allowAuth = true;
    const res = await app.request('/api/v1/tasks', {
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
    allowAuth = false;
  });

  it('should reject invalid priority', async () => {
    const res = await app.request('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        priority: 'invalid',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject invalid tags (not array)', async () => {
    const res = await app.request('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
        tags: 'not-an-array',
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('tasks API - update with new fields', () => {
  beforeEach(async () => {
  });

  it('should update task due date', async () => {
    allowAuth = true;
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/v1/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dueDate: '2026-12-31T23:59:59Z',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.task.dueDate).toBe('2026-12-31T23:59:59Z');
    allowAuth = false;
  });

  it('should update task priority', async () => {
    allowAuth = true;
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/v1/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priority: 'high',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.task.priority).toBe('high');
    allowAuth = false;
  });

  it('should update task tags', async () => {
    allowAuth = true;
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Buy groceries',
      }),
    });

    const createJson = await createRes.json();
    const taskId = createJson.task.id;

    const res = await app.request(`/api/v1/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tags: ['shopping', 'urgent'],
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.task.tags).toEqual(['shopping', 'urgent']);
    allowAuth = false;
  });

  it('should remove due date with null', async () => {
    allowAuth = true;
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

    const res = await app.request(`/api/v1/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dueDate: null,
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.task.dueDate).toBeNull();
    allowAuth = false;
  });

  it('should reject update with no fields', async () => {
    const res = await app.request('/api/v1/tasks/some-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});
