import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgresTaskRepository } from './tasks.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tasks } from '../schema/tasks.js';

// Skip tests if DATABASE_URL is not set
const dbUrl = process.env.DATABASE_URL;
describe.skipIf(!dbUrl)('PostgresTaskRepository', () => {
  let client: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let repository: PostgresTaskRepository;

  beforeAll(async () => {
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required for integration tests');
    }
    client = postgres(dbUrl);
    db = drizzle(client);
    repository = new PostgresTaskRepository('test-user-id', db);
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(async () => {
    // Clean up tasks table before each test
    await db.delete(tasks);
  });

  describe('create', () => {
    it('should create a task with basic fields', async () => {
      const task = await repository.create({
        title: 'Test Task',
        completed: false,
        archived: false,
        dueDate: null,
        priority: 'medium',
        tags: [],
      });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.completed).toBe(false);
      expect(task.archived).toBe(false);
    });

    it('should create a task with optional fields (dueDate, priority, tags)', async () => {
      const task = await repository.create({
        title: 'Task with optional fields',
        completed: false,
        archived: false,
        dueDate: '2026-06-10T10:00:00Z',
        priority: 'high',
        tags: ['urgent', 'work'],
      });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Task with optional fields');
      expect(task.dueDate).toBe('2026-06-10T10:00:00Z');
      expect(task.priority).toBe('high');
      expect(task.tags).toEqual(['urgent', 'work']);
    });
  });

  describe('findById', () => {
    it('should find a task by id', async () => {
      const created = await repository.create({
        title: 'Find Me',
        completed: false,
        archived: false,
        dueDate: null,
        priority: 'medium',
        tags: [],
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Find Me');
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all tasks', async () => {
      await repository.create({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      await repository.create({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      await repository.create({ title: 'Task 3', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });

      const allTasks = await repository.findAll();

      expect(allTasks).toHaveLength(3);
      expect(allTasks.map(t => t.title)).toEqual(['Task 1', 'Task 2', 'Task 3']);
    });

    it('should return empty array when no tasks exist', async () => {
      const allTasks = await repository.findAll();
      expect(allTasks).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const created = await repository.create({
        title: 'Original Title',
        completed: false,
        archived: false,
        dueDate: null,
        priority: 'medium',
        tags: [],
      });

      const updated = await repository.update(created.id, {
        title: 'Updated Title',
        completed: true,
      });

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.completed).toBe(true);
    });

    it('should return null when updating non-existent task', async () => {
      const updated = await repository.update('non-existent-id', { title: 'New Title' });
      expect(updated).toBeNull();
    });

    it('should update optional fields', async () => {
      const created = await repository.create({
        title: 'Task',
        completed: false,
        archived: false,
        dueDate: null,
        priority: 'medium',
        tags: [],
      });

      const updated = await repository.update(created.id, {
        dueDate: '2026-06-15T14:00:00Z',
        priority: 'medium',
        tags: ['review'],
      });

      expect(updated).toBeDefined();
      expect(updated?.dueDate).toBe('2026-06-15T14:00:00Z');
      expect(updated?.priority).toBe('medium');
      expect(updated?.tags).toEqual(['review']);
    });
  });

  describe('delete', () => {
    it('should delete a task', async () => {
      const created = await repository.create({
        title: 'To Delete',
        completed: false,
        archived: false,
        dueDate: null,
        priority: 'medium',
        tags: [],
      });

      const deleted = await repository.delete(created.id);

      expect(deleted).toBe(true);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent task', async () => {
      const deleted = await repository.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('findWhere', () => {
    it('should find tasks matching criteria', async () => {
      await repository.create({ title: 'Task 1', completed: false, archived: false, priority: 'high', dueDate: null, tags: [] });
      await repository.create({ title: 'Task 2', completed: true, archived: false, priority: 'high', dueDate: null, tags: [] });
      await repository.create({ title: 'Task 3', completed: false, archived: false, priority: 'low', dueDate: null, tags: [] });

      const highPriorityTasks = await repository.findWhere({ priority: 'high' });

      expect(highPriorityTasks).toHaveLength(2);
      expect(highPriorityTasks.every(t => t.priority === 'high')).toBe(true);
    });

    it('should return all tasks when no criteria provided', async () => {
      await repository.create({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      await repository.create({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });

      const allTasks = await repository.findWhere({});

      expect(allTasks).toHaveLength(2);
    });
  });

  describe('count', () => {
    it('should count all tasks', async () => {
      await repository.create({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      await repository.create({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      await repository.create({ title: 'Task 3', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });

      const count = await repository.count();

      expect(count).toBe(3);
    });

    it('should count tasks matching criteria', async () => {
      await repository.create({ title: 'Task 1', completed: false, archived: false, priority: 'high', dueDate: null, tags: [] });
      await repository.create({ title: 'Task 2', completed: true, archived: false, priority: 'high', dueDate: null, tags: [] });
      await repository.create({ title: 'Task 3', completed: false, archived: false, priority: 'low', dueDate: null, tags: [] });

      const highPriorityCount = await repository.count({ priority: 'high' });

      expect(highPriorityCount).toBe(2);
    });

    it('should return 0 when no tasks exist', async () => {
      const count = await repository.count();
      expect(count).toBe(0);
    });
  });

  describe('batch operations', () => {
    it('should handle multiple creates in sequence', async () => {
      const task1 = await repository.create({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      const task2 = await repository.create({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      const task3 = await repository.create({ title: 'Task 3', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });

      const allTasks = await repository.findAll();
      expect(allTasks).toHaveLength(3);
      expect(allTasks.map(t => t.id)).toEqual([task1.id, task2.id, task3.id]);
    });

    it('should handle multiple updates in sequence', async () => {
      const task1 = await repository.create({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      const task2 = await repository.create({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });

      await repository.update(task1.id, { completed: true });
      await repository.update(task2.id, { completed: true });

      const allTasks = await repository.findAll();
      expect(allTasks.every(t => t.completed)).toBe(true);
    });

    it('should handle multiple deletes in sequence', async () => {
      const task1 = await repository.create({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      const task2 = await repository.create({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      const task3 = await repository.create({ title: 'Task 3', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });

      await repository.delete(task1.id);
      await repository.delete(task2.id);

      const allTasks = await repository.findAll();
      expect(allTasks).toHaveLength(1);
      expect(allTasks[0]?.id).toBe(task3.id);
    });
  });

  describe('filtering', () => {
    it('should filter by completed status', async () => {
      await repository.create({ title: 'Task 1', completed: true, archived: false, dueDate: null, priority: 'medium', tags: [] });
      await repository.create({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      await repository.create({ title: 'Task 3', completed: true, archived: false, dueDate: null, priority: 'medium', tags: [] });

      const completedTasks = await repository.findWhere({ completed: true });
      expect(completedTasks).toHaveLength(2);
      expect(completedTasks.every(t => t.completed)).toBe(true);
    });

    it('should filter by archived status', async () => {
      await repository.create({ title: 'Task 1', completed: false, archived: true, dueDate: null, priority: 'medium', tags: [] });
      await repository.create({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      await repository.create({ title: 'Task 3', completed: false, archived: true, dueDate: null, priority: 'medium', tags: [] });

      const archivedTasks = await repository.findWhere({ archived: true });
      expect(archivedTasks).toHaveLength(2);
      expect(archivedTasks.every(t => t.archived)).toBe(true);
    });

    it('should filter by priority', async () => {
      await repository.create({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'high', tags: [] });
      await repository.create({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      await repository.create({ title: 'Task 3', completed: false, archived: false, dueDate: null, priority: 'high', tags: [] });

      const highPriorityTasks = await repository.findWhere({ priority: 'high' });
      expect(highPriorityTasks).toHaveLength(2);
      expect(highPriorityTasks.every(t => t.priority === 'high')).toBe(true);
    });
  });

  describe('searching', () => {
    it('should find tasks by title substring (case-sensitive)', async () => {
      await repository.create({ title: 'Buy groceries', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      await repository.create({ title: 'Call mom', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      await repository.create({ title: 'Buy milk', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });

      const buyTasks = await repository.findWhere({ title: 'Buy' });
      expect(buyTasks).toHaveLength(2);
      expect(buyTasks.every(t => t.title.includes('Buy'))).toBe(true);
    });

    it('should find tasks by tags', async () => {
      await repository.create({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: ['work', 'urgent'] });
      await repository.create({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: ['personal'] });
      await repository.create({ title: 'Task 3', completed: false, archived: false, dueDate: null, priority: 'medium', tags: ['work'] });

      const workTasks = await repository.findWhere({ tags: ['work'] });
      expect(workTasks).toHaveLength(2);
    });
  });

  describe('transactions', () => {
    it('should maintain consistency when operations fail mid-sequence', async () => {
      const task1 = await repository.create({ title: 'Task 1', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });
      const task2 = await repository.create({ title: 'Task 2', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });

      // Update task1 successfully
      await repository.update(task1.id, { completed: true });

      // Attempt to update non-existent task (should fail but not affect task1)
      await repository.update('non-existent-id', { completed: true });

      // Verify task1 is still updated
      const updatedTask1 = await repository.findById(task1.id);
      expect(updatedTask1?.completed).toBe(true);

      // Verify task2 is unchanged
      const task2After = await repository.findById(task2.id);
      expect(task2After?.completed).toBe(false);
    });

    it('should handle concurrent operations on same task', async () => {
      const task = await repository.create({ title: 'Task', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] });

      // Sequential updates (simulating concurrent operations)
      const update1 = await repository.update(task.id, { completed: true });
      const update2 = await repository.update(task.id, { priority: 'high' });

      expect(update1?.completed).toBe(true);
      expect(update2?.priority).toBe('high');

      // Final state should have both updates
      const finalTask = await repository.findById(task.id);
      expect(finalTask?.completed).toBe(true);
      expect(finalTask?.priority).toBe('high');
    });
  });
});
