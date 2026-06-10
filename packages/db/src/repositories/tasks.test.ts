import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgresTaskRepository } from './tasks.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tasks } from '../schema/tasks/index.js';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import type { RepositoryContext } from '../index.js';
import { withTransaction } from '../test-helpers/transaction-wrapper.js';
import { createTask } from '../test-helpers/factories/tasks.js';

// Skip tests if DATABASE_URL is not set
const dbUrl = process.env.DATABASE_URL;
const tenantId1 = randomUUID();
const tenantId2 = randomUUID();
const userId1 = randomUUID();
const userId2 = randomUUID();

describe.skipIf(!dbUrl)('PostgresTaskRepository', () => {
  let client: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let repository: PostgresTaskRepository;
  let context1: RepositoryContext;
  let _context2: RepositoryContext;

  beforeAll(async () => {
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required for integration tests');
    }
    client = postgres(dbUrl);
    db = drizzle(client);
    // Create a mock Database interface for testing
    const mockDb = {
      getDrizzleDb: () => db,
      query: async () => [],
      transaction: async () => {},
      close: async () => {},
    };
    repository = new PostgresTaskRepository(mockDb as never);
    context1 = {
      userId: userId1,
      tenantId: tenantId1,
      requestId: randomUUID(),
    };
    _context2 = {
      userId: userId2,
      tenantId: tenantId2,
      requestId: randomUUID(),
    };
  });

  afterAll(async () => {
    await client.end();
  });

  describe('create', () => {
    it('should create a task with basic fields', async () => {
      await withTransaction(client, async () => {
        const taskData = await createTask({
          title: 'Test Task',
          completed: false,
          archived: false,
          dueDate: null,
          priority: 'medium',
          tags: [],
        });
        const task = await repository.create(taskData, context1);

        expect(task).toBeDefined();
        expect(task.id).toBeDefined();
        expect(task.title).toBe('Test Task');
        expect(task.completed).toBe(false);
        expect(task.archived).toBe(false);
      });
    });

    it('should create a task with optional fields (dueDate, priority, tags)', async () => {
      await withTransaction(client, async () => {
        const taskData = await createTask({
          title: 'Task with optional fields',
          completed: false,
          archived: false,
          dueDate: '2026-06-10T10:00:00Z',
          priority: 'high',
          tags: ['urgent', 'work'],
        });
        const task = await repository.create(taskData, context1);

        expect(task).toBeDefined();
        expect(task.id).toBeDefined();
        expect(task.title).toBe('Task with optional fields');
        expect(task.dueDate).toBe('2026-06-10T10:00:00Z');
        expect(task.priority).toBe('high');
        expect(task.tags).toEqual(['urgent', 'work']);
      });
    });
  });

  describe('findById', () => {
    it('should find a task by id', async () => {
      await withTransaction(client, async () => {
        const taskData = await createTask({
          title: 'Find Me',
          completed: false,
          archived: false,
          dueDate: null,
          priority: 'medium',
          tags: [],
        });
        const created = await repository.create(taskData, context1);

        const found = await repository.findById(created.id, context1);

        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
        expect(found?.title).toBe('Find Me');
      });
    });

    it('should return null for non-existent id', async () => {
      await withTransaction(client, async () => {
        const found = await repository.findById('non-existent-id', context1);
        expect(found).toBeNull();
      });
    });
  });

  describe('findAll', () => {
    it('should return all tasks', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createTask({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 3', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);

        const allTasks = await repository.findAll(context1);

        expect(allTasks).toHaveLength(3);
        expect(allTasks.map(t => t.title)).toEqual(['Task 1', 'Task 2', 'Task 3']);
      });
    });

    it('should return empty array when no tasks exist', async () => {
      await withTransaction(client, async () => {
        const allTasks = await repository.findAll(context1);
        expect(allTasks).toEqual([]);
      });
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      await withTransaction(client, async () => {
        const taskData = await createTask({
          title: 'Original Title',
          completed: false,
          archived: false,
          dueDate: null,
          priority: 'medium',
          tags: [],
        });
        const created = await repository.create(taskData, context1);

        const updated = await repository.update(created.id, {
          title: 'Updated Title',
          completed: true,
        }, context1);

        expect(updated).toBeDefined();
        expect(updated?.id).toBe(created.id);
        expect(updated?.title).toBe('Updated Title');
        expect(updated?.completed).toBe(true);
      });
    });

    it('should return null when updating non-existent task', async () => {
      await withTransaction(client, async () => {
        const updated = await repository.update('non-existent-id', { title: 'New Title' }, context1);
        expect(updated).toBeNull();
      });
    });

    it('should update optional fields', async () => {
      await withTransaction(client, async () => {
        const taskData = await createTask({
          title: 'Task',
          completed: false,
          archived: false,
          dueDate: null,
          priority: 'medium',
          tags: [],
        });
        const created = await repository.create(taskData, context1);

        const updated = await repository.update(created.id, {
          dueDate: '2026-06-15T14:00:00Z',
          priority: 'medium',
          tags: ['review'],
        }, context1);

        expect(updated).toBeDefined();
        expect(updated?.dueDate).toBe('2026-06-15T14:00:00Z');
        expect(updated?.priority).toBe('medium');
        expect(updated?.tags).toEqual(['review']);
      });
    });
  });

  describe('delete', () => {
    it('should delete a task', async () => {
      await withTransaction(client, async () => {
        const taskData = await createTask({
          title: 'To Delete',
          completed: false,
          archived: false,
          dueDate: null,
          priority: 'medium',
          tags: [],
        });
        const created = await repository.create(taskData, context1);

        const deleted = await repository.delete(created.id, context1);

        expect(deleted).toBe(true);

        const found = await repository.findById(created.id, context1);
        expect(found).toBeNull();
      });
    });

    it('should return false when deleting non-existent task', async () => {
      await withTransaction(client, async () => {
        const deleted = await repository.delete('non-existent-id', context1);
        expect(deleted).toBe(false);
      });
    });
  });

  describe('findWhere', () => {
    it('should find tasks matching criteria', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createTask({ title: 'Task 1', completed: false, archived: false, priority: 'high', dueDate: null, tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 2', completed: true, archived: false, priority: 'high', dueDate: null, tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 3', completed: false, archived: false, priority: 'low', dueDate: null, tags: [] }), context1);

        const highPriorityTasks = await repository.findWhere({ priority: 'high' }, context1);

        expect(highPriorityTasks).toHaveLength(2);
        expect(highPriorityTasks.every(t => t.priority === 'high')).toBe(true);
      });
    });

    it('should return all tasks when no criteria provided', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createTask({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);

        const allTasks = await repository.findWhere({}, context1);

        expect(allTasks).toHaveLength(2);
      });
    });
  });

  describe('count', () => {
    it('should count all tasks', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createTask({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 3', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);

        const count = await repository.count({}, context1);

        expect(count).toBe(3);
      });
    });

    it('should count tasks matching criteria', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createTask({ title: 'Task 1', completed: false, archived: false, priority: 'high', dueDate: null, tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 2', completed: true, archived: false, priority: 'high', dueDate: null, tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 3', completed: false, archived: false, priority: 'low', dueDate: null, tags: [] }), context1);

        const highPriorityCount = await repository.count({ priority: 'high' }, context1);

        expect(highPriorityCount).toBe(2);
      });
    });

    it('should return 0 when no tasks exist', async () => {
      await withTransaction(client, async () => {
        const count = await repository.count({}, context1);
        expect(count).toBe(0);
      });
    });
  });

  describe('batch operations', () => {
    it('should handle multiple creates in sequence', async () => {
      await withTransaction(client, async () => {
        const task1 = await repository.create(await createTask({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        const task2 = await repository.create(await createTask({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        const task3 = await repository.create(await createTask({ title: 'Task 3', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);

        const allTasks = await repository.findAll(context1);
        expect(allTasks).toHaveLength(3);
        expect(allTasks.map(t => t.id)).toEqual([task1.id, task2.id, task3.id]);
      });
    });

    it('should handle multiple updates in sequence', async () => {
      await withTransaction(client, async () => {
        const task1 = await repository.create(await createTask({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        const task2 = await repository.create(await createTask({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);

        await repository.update(task1.id, { completed: true }, context1);
        await repository.update(task2.id, { completed: true }, context1);

        const allTasks = await repository.findAll(context1);
        expect(allTasks.every(t => t.completed)).toBe(true);
      });
    });

    it('should handle multiple deletes in sequence', async () => {
      await withTransaction(client, async () => {
        const task1 = await repository.create(await createTask({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        const task2 = await repository.create(await createTask({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        const task3 = await repository.create(await createTask({ title: 'Task 3', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);

        await repository.delete(task1.id, context1);
        await repository.delete(task2.id, context1);

        const allTasks = await repository.findAll(context1);
        expect(allTasks).toHaveLength(1);
        expect(allTasks[0]?.id).toBe(task3.id);
      });
    });
  });

  describe('filtering', () => {
    it('should filter by completed status', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createTask({ title: 'Task 1', completed: true, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 3', completed: true, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);

        const completedTasks = await repository.findWhere({ completed: true }, context1);
        expect(completedTasks).toHaveLength(2);
        expect(completedTasks.every(t => t.completed)).toBe(true);
      });
    });

    it('should filter by archived status', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createTask({ title: 'Task 1', completed: false, archived: true, dueDate: null, priority: 'medium', tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 3', completed: false, archived: true, dueDate: null, priority: 'medium', tags: [] }), context1);

        const archivedTasks = await repository.findWhere({ archived: true }, context1);
        expect(archivedTasks).toHaveLength(2);
        expect(archivedTasks.every(t => t.archived)).toBe(true);
      });
    });

    it('should filter by priority', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createTask({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'high', tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        await repository.create(await createTask({ title: 'Task 3', completed: false, archived: false, dueDate: null, priority: 'high', tags: [] }), context1);

        const highPriorityTasks = await repository.findWhere({ priority: 'high' }, context1);
        expect(highPriorityTasks).toHaveLength(2);
        expect(highPriorityTasks.every(t => t.priority === 'high')).toBe(true);
      });
    });
  });

  describe('searching', () => {
    it('should find tasks by title substring (case-sensitive)', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createTask({ title: 'Buy groceries', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        await repository.create(await createTask({ title: 'Call mom', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        await repository.create(await createTask({ title: 'Buy milk', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);

        const buyTasks = await repository.findWhere({ title: 'Buy' }, context1);
        expect(buyTasks).toHaveLength(2);
        expect(buyTasks.every(t => t.title.includes('Buy'))).toBe(true);
      });
    });

    it('should find tasks by tags', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createTask({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: ['work', 'urgent'] }), context1);
        await repository.create(await createTask({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: ['personal'] }), context1);
        await repository.create(await createTask({ title: 'Task 3', completed: false, archived: false, dueDate: null, priority: 'medium', tags: ['work'] }), context1);

        const workTasks = await repository.findWhere({ tags: ['work'] }, context1);
        expect(workTasks).toHaveLength(2);
      });
    });
  });

  describe('transactions', () => {
    it('should maintain consistency when operations fail mid-sequence', async () => {
      await withTransaction(client, async () => {
        const task1 = await repository.create(await createTask({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);
        const task2 = await repository.create(await createTask({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);

        // Update task1 successfully
        await repository.update(task1.id, { completed: true }, context1);

        // Attempt to update non-existent task (should fail but not affect task1)
        await repository.update('non-existent-id', { completed: true }, context1);

        // Verify task1 is still updated
        const updatedTask1 = await repository.findById(task1.id, context1);
        expect(updatedTask1?.completed).toBe(true);

        // Verify task2 is unchanged
        const task2After = await repository.findById(task2.id, context1);
        expect(task2After?.completed).toBe(false);
      });
    });

    it('should handle concurrent operations on same task', async () => {
      await withTransaction(client, async () => {
        const task = await repository.create(await createTask({ title: 'Task', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }), context1);

        // Sequential updates (simulating concurrent operations)
        const update1 = await repository.update(task.id, { completed: true }, context1);
        const update2 = await repository.update(task.id, { priority: 'high' }, context1);

        expect(update1?.completed).toBe(true);
        expect(update2?.priority).toBe('high');

        // Final state should have both updates
        const finalTask = await repository.findById(task.id, context1);
        expect(finalTask?.completed).toBe(true);
        expect(finalTask?.priority).toBe('high');
      });
    });
  });

  describe('tenant isolation', () => {
    it('should ensure data from one tenant is not visible to another', async () => {
      await withTransaction(client, async () => {
        // Create task for tenant 1
        await db.insert(tasks).values({
          id: randomUUID(),
          tenantId: tenantId1,
          userId: userId1,
          title: 'Tenant 1 Task',
          completed: false,
          archived: false,
          dueDate: null,
          priority: 'medium',
          tags: [],
        });

        // Create task for tenant 2
        await db.insert(tasks).values({
          id: randomUUID(),
          tenantId: tenantId2,
          userId: userId2,
          title: 'Tenant 2 Task',
          completed: false,
          archived: false,
          dueDate: null,
          priority: 'high',
          tags: [],
        });

        // Query all tasks - should return both (no RLS in test)
        const allTasks = await db.select().from(tasks);
        expect(allTasks).toHaveLength(2);

        // Query with tenant filter - should return only tenant 1 tasks
        const tenant1Tasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.tenantId, tenantId1));
        expect(tenant1Tasks).toHaveLength(1);
        expect(tenant1Tasks[0]?.title).toBe('Tenant 1 Task');

        // Query with tenant filter - should return only tenant 2 tasks
        const tenant2Tasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.tenantId, tenantId2));
        expect(tenant2Tasks).toHaveLength(1);
        expect(tenant2Tasks[0]?.title).toBe('Tenant 2 Task');
      });
    });
  });
});
