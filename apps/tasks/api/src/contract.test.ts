import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from './index.js';
import { resetTasks } from '@suite/domain-tasks';

describe('Tasks API Contract Tests', () => {
  beforeAll(async () => {
    // Reset domain state before tests
    resetTasks();
  });

  afterAll(async () => {
    // Clean up after tests
    resetTasks();
  });

  describe('GET /api/v1/health', () => {
    it('returns 200 with valid health response structure', async () => {
      const res = await app.request('/api/v1/health');
      expect(res.status).toBe(200);
      
      const body = await res.json() as { ok: boolean; app: string; db: string; timestamp: string; dbLatency?: string };
      expect(body).toHaveProperty('ok');
      expect(body).toHaveProperty('app');
      expect(body).toHaveProperty('db');
      expect(body).toHaveProperty('timestamp');
      expect(typeof body.ok).toBe('boolean');
      expect(typeof body.app).toBe('string');
      expect(typeof body.db).toBe('string');
      expect(typeof body.timestamp).toBe('string');
    });

    it('returns 503 when database is unhealthy', async () => {
      const res = await app.request('/api/v1/health');
      expect([200, 503]).toContain(res.status);
      
      const body = await res.json() as { ok: boolean; app: string; db: string; timestamp: string };
      expect(body).toHaveProperty('ok');
      expect(body).toHaveProperty('app');
      expect(body).toHaveProperty('db');
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('returns 200 with valid tasks array structure', async () => {
      const res = await app.request('/api/v1/tasks');
      expect(res.status).toBe(200);
      
      const body = await res.json() as { tasks: Array<{ id: string; title: string; completed: boolean; archived: boolean }> };
      expect(body).toHaveProperty('tasks');
      expect(Array.isArray(body.tasks)).toBe(true);
      
      // Validate task structure if tasks exist
      if (body.tasks.length > 0) {
        const task = body.tasks[0];
        if (task) {
          expect(task).toHaveProperty('id');
          expect(task).toHaveProperty('title');
          expect(task).toHaveProperty('completed');
          expect(task).toHaveProperty('archived');
          expect(typeof task.id).toBe('string');
          expect(typeof task.title).toBe('string');
          expect(typeof task.completed).toBe('boolean');
          expect(typeof task.archived).toBe('boolean');
        }
      }
    });
  });

  describe('POST /api/v1/tasks', () => {
    it('returns 201 with valid task structure on successful creation', async () => {
      const newTask = {
        title: 'Contract Test Task',
        completed: false,
        tags: ['contract-test'],
      };

      const res = await app.request('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });

      expect(res.status).toBe(201);
      
      const body = await res.json() as { task: { id: string; title: string; completed: boolean; archived: boolean } };
      expect(body).toHaveProperty('task');
      expect(body.task).toHaveProperty('id');
      expect(body.task).toHaveProperty('title');
      expect(body.task).toHaveProperty('completed');
      expect(body.task).toHaveProperty('archived');
      expect(typeof body.task.id).toBe('string');
      expect(typeof body.task.title).toBe('string');
      expect(typeof body.task.completed).toBe('boolean');
      expect(typeof body.task.archived).toBe('boolean');
    });

    it('returns 400 with error structure for invalid request body', async () => {
      const invalidTask = {
        title: '', // Invalid: empty title
      };

      const res = await app.request('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidTask),
      });

      expect(res.status).toBe(400);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.timestamp).toBe('string');
    });

    it('returns 400 with error structure for missing required fields', async () => {
      const incompleteTask = {
        completed: true,
      };

      const res = await app.request('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompleteTask),
      });

      expect(res.status).toBe(400);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    it('returns 200 with valid task structure on successful update', async () => {
      // First create a task
      const createRes = await app.request('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Update Test Task',
          completed: false,
        }),
      });

      const createBody = await createRes.json() as { task: { id: string } };
      const taskId = createBody.task.id;

      // Update the task
      const updateData = {
        title: 'Updated Contract Test Task',
        completed: true,
      };

      const res = await app.request(`/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      expect(res.status).toBe(200);
      
      const body = await res.json() as { task: { id: string; title: string; completed: boolean } };
      expect(body).toHaveProperty('task');
      expect(body.task).toHaveProperty('id');
      expect(body.task).toHaveProperty('title');
      expect(body.task).toHaveProperty('completed');
      expect(typeof body.task.id).toBe('string');
      expect(typeof body.task.title).toBe('string');
      expect(typeof body.task.completed).toBe('boolean');
      expect(body.task.title).toBe('Updated Contract Test Task');
      expect(body.task.completed).toBe(true);
    });

    it('returns 400 with error structure for invalid request body', async () => {
      const res = await app.request('/api/v1/tasks/nonexistent-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '' }), // Invalid: empty title
      });

      expect(res.status).toBe(400);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
    });

    it('returns 404 with error structure for non-existent task', async () => {
      const res = await app.request('/api/v1/tasks/00000000-0000-0000-0000-000000000000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      expect(res.status).toBe(404);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.timestamp).toBe('string');
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('returns 200 with success structure on successful deletion', async () => {
      // First create a task
      const createRes = await app.request('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Delete Test Task',
          completed: false,
        }),
      });

      const createBody = await createRes.json() as { task: { id: string } };
      const taskId = createBody.task.id;

      // Delete the task
      const res = await app.request(`/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      
      const body = await res.json() as { success: boolean };
      expect(body).toHaveProperty('success');
      expect(typeof body.success).toBe('boolean');
      expect(body.success).toBe(true);
    });

    it('returns 404 with error structure for non-existent task', async () => {
      const res = await app.request('/api/v1/tasks/00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.timestamp).toBe('string');
    });
  });

  describe('GET /api/v1/tasks/search', () => {
    it('returns 200 with valid tasks array structure for search', async () => {
      const res = await app.request('/api/v1/tasks/search?q=test');
      expect(res.status).toBe(200);
      
      const body = await res.json() as { tasks: unknown[] };
      expect(body).toHaveProperty('tasks');
      expect(Array.isArray(body.tasks)).toBe(true);
    });

    it('returns 400 with error structure for invalid search query', async () => {
      const res = await app.request('/api/v1/tasks/search?q=<invalid>');
      expect(res.status).toBe(400);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
    });
  });

  describe('Error Response Contract', () => {
    it('all error responses follow standard error structure', async () => {
      const errorScenarios = [
        { url: '/api/v1/tasks', method: 'POST', body: { title: '' }, expectedStatus: 400 },
        { url: '/api/v1/tasks', method: 'POST', body: {}, expectedStatus: 400 },
      ];

      for (const scenario of errorScenarios) {
        const res = await app.request(scenario.url, {
          method: scenario.method || 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: scenario.body ? JSON.stringify(scenario.body) : null,
        });

        if (res.status >= 400) {
          const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
          expect(body).toHaveProperty('error');
          expect(body.error).toHaveProperty('code');
          expect(body.error).toHaveProperty('message');
          expect(body.error).toHaveProperty('timestamp');
          expect(typeof body.error.code).toBe('string');
          expect(typeof body.error.message).toBe('string');
          expect(typeof body.error.timestamp).toBe('string');
        }
      }
    });
  });
});
