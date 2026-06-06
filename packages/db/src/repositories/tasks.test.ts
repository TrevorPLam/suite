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
    client = postgres(dbUrl!);
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
});
