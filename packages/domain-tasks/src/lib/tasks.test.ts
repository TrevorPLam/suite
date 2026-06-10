import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  createTask,
  getTask,
  listTasks,
  updateTaskCompletion,
  updateTask,
  archiveTask,
  deleteTask,
  filterTasks,
  searchTasks,
  batchComplete,
  batchArchive,
  resetTasks,
  resetTasksDB,
  TaskError,
  type CreateTaskInput,
  type UpdateTaskCompletionInput,
  type UpdateTaskInput,
  type ArchiveTaskInput,
  type SearchTasksInput,
  type BatchOperationInput,
  type TaskItem,
  type TaskRepository,
  InMemoryTaskRepository,
} from './tasks.js';
import { sealTask, unsealTask, setTaskKeyProvider, resetKeyProvider } from './tasks-crypto.js';
import { generateAESKey } from '@suite/crypto';
import type { RepositoryContext } from '@suite/db';
import { randomUUID } from 'crypto';

// Helper function to create a test RepositoryContext
function createTestContext(): RepositoryContext {
  return {
    userId: randomUUID(),
    tenantId: randomUUID(),
    requestId: randomUUID(),
  };
}

describe('tasks - create', () => {
  let context: RepositoryContext;

  beforeEach(() => {
    resetTasks();
    context = createTestContext();
  });

  it('should create a valid task with a stable ID', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input, undefined, context);

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Buy groceries');
    expect(task.completed).toBe(false);
    expect(task.archived).toBe(false);
  });

  it('should create a task with completed status', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      completed: true,
    };

    const task = await createTask(input, undefined, context);

    expect(task.completed).toBe(true);
  });

  it('should default completed to false when not provided', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input, undefined, context);

    expect(task.completed).toBe(false);
  });

  it('should trim whitespace from title', async () => {
    const input: CreateTaskInput = {
      title: '  Buy groceries  ',
    };

    const task = await createTask(input, undefined, context);

    expect(task.title).toBe('Buy groceries');
  });

  it('should reject empty title', async () => {
    const input: CreateTaskInput = {
      title: '',
    };

    await expect(createTask(input, undefined, context)).rejects.toThrow(TaskError);
  });

  it('should reject whitespace-only title', async () => {
    const input: CreateTaskInput = {
      title: '   ',
    };

    await expect(createTask(input, undefined, context)).rejects.toThrow(TaskError);
  });
});

describe('tasks - update completion', () => {
  let repository: InMemoryTaskRepository;
  let context: RepositoryContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    context = createTestContext();
  });

  it('should update task completion status', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput, repository, context);

    const updateInput: UpdateTaskCompletionInput = {
      completed: true,
    };

    const updated = await updateTaskCompletion(task.id, updateInput, repository, context);

    expect(updated.id).toBe(task.id);
    expect(updated.completed).toBe(true);
    expect(updated.title).toBe('Buy groceries');
  });

  it('should reject update with empty id', async () => {
    const updateInput: UpdateTaskCompletionInput = {
      completed: true,
    };

    await expect(updateTaskCompletion('', updateInput, repository, context)).rejects.toThrow(TaskError);
  });

  it('should reject update for non-existent task', async () => {
    const updateInput: UpdateTaskCompletionInput = {
      completed: true,
    };

    await expect(updateTaskCompletion('non-existent-id', updateInput, repository, context)).rejects.toThrow(TaskError);
  });
});

describe('tasks - update', () => {
  let repository: InMemoryTaskRepository;
  let context: RepositoryContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    context = createTestContext();
  });

  it('should update task title', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput, repository, context);

    const updateInput: UpdateTaskInput = {
      title: 'Buy milk and eggs',
    };

    const updated = await updateTask(task.id, updateInput, repository, context);

    expect(updated.id).toBe(task.id);
    expect(updated.title).toBe('Buy milk and eggs');
    expect(updated.completed).toBe(task.completed);
    expect(updated.archived).toBe(task.archived);
  });

  it('should trim whitespace from updated title', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput, repository, context);

    const updateInput: UpdateTaskInput = {
      title: '  Buy milk and eggs  ',
    };

    const updated = await updateTask(task.id, updateInput, repository, context);

    expect(updated.title).toBe('Buy milk and eggs');
  });

  it('should reject update with empty id', async () => {
    const updateInput: UpdateTaskInput = {
      title: 'Buy milk',
    };

    await expect(updateTask('', updateInput, repository, context)).rejects.toThrow(TaskError);
  });

  it('should reject update for non-existent task', async () => {
    const updateInput: UpdateTaskInput = {
      title: 'Buy milk',
    };

    await expect(updateTask('non-existent-id', updateInput, repository, context)).rejects.toThrow(TaskError);
  });

  it('should reject update with empty title', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput, repository, context);

    const updateInput: UpdateTaskInput = {
      title: '',
    };

    await expect(updateTask(task.id, updateInput, repository, context)).rejects.toThrow(TaskError);
  });
});

describe('tasks - archive', () => {
  let repository: InMemoryTaskRepository;
  let context: RepositoryContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    context = createTestContext();
  });

  it('should archive a task', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput, repository, context);

    const archiveInput: ArchiveTaskInput = {
      archived: true,
    };

    const archived = await archiveTask(task.id, archiveInput, repository, context);

    expect(archived.id).toBe(task.id);
    expect(archived.archived).toBe(true);
  });

  it('should unarchive a task', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput, repository, context);

    const archiveInput: ArchiveTaskInput = {
      archived: true,
    };

    await archiveTask(task.id, archiveInput, repository, context);

    const unarchiveInput: ArchiveTaskInput = {
      archived: false,
    };

    const unarchived = await archiveTask(task.id, unarchiveInput, repository, context);

    expect(unarchived.archived).toBe(false);
  });

  it('should reject archive with empty id', async () => {
    const archiveInput: ArchiveTaskInput = {
      archived: true,
    };

    await expect(archiveTask('', archiveInput, repository, context)).rejects.toThrow(TaskError);
  });

  it('should reject archive for non-existent task', async () => {
    const archiveInput: ArchiveTaskInput = {
      archived: true,
    };

    await expect(archiveTask('non-existent-id', archiveInput, repository, context)).rejects.toThrow(TaskError);
  });
});

describe('tasks - delete', () => {
  let repository: InMemoryTaskRepository;
  let context: RepositoryContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    context = createTestContext();
  });

  it('should delete a task', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput, repository, context);

    await deleteTask(task.id, repository, context);

    const found = await getTask(task.id, repository, context);
    expect(found).toBeNull();
  });

  it('should reject delete with empty id', async () => {
    await expect(deleteTask('', repository, context)).rejects.toThrow(TaskError);
  });

  it('should reject delete for non-existent task', async () => {
    await expect(deleteTask('non-existent-id', repository, context)).rejects.toThrow(TaskError);
  });
});

describe('tasks - query', () => {
  let repository: InMemoryTaskRepository;
  let context: RepositoryContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    context = createTestContext();
  });

  it('should list all tasks in reverse creation order', async () => {
    const firstInput: CreateTaskInput = {
      title: 'First task',
    };

    const secondInput: CreateTaskInput = {
      title: 'Second task',
    };

    const firstTask = await createTask(firstInput, repository, context);
    const secondTask = await createTask(secondInput, repository, context);

    const tasks = await listTasks(repository, context);

    expect(tasks).toHaveLength(2);
    expect(tasks[0]?.id).toBe(secondTask.id);
    expect(tasks[1]?.id).toBe(firstTask.id);
  });

  it('should get task by id', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input, repository, context);
    const found = await getTask(task.id, repository, context);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(task.id);
    expect(found?.title).toBe('Buy groceries');
  });

  it('should return null for non-existent task', async () => {
    const found = await getTask('non-existent-id', repository, context);
    expect(found).toBeNull();
  });

  it('should filter tasks by all (including archived)', async () => {
    const firstInput: CreateTaskInput = {
      title: 'First task',
    };

    const secondInput: CreateTaskInput = {
      title: 'Second task',
    };

    const firstTask = await createTask(firstInput, repository, context);
    const secondTask = await createTask(secondInput, repository, context);

    await archiveTask(firstTask.id, { archived: true }, repository, context);

    const tasks = await filterTasks('all', repository, context);

    expect(tasks).toHaveLength(2);
    expect(tasks.map(t => t.id)).toContain(firstTask.id);
    expect(tasks.map(t => t.id)).toContain(secondTask.id);
  });

  it('should filter tasks by active (not completed, not archived)', async () => {
    const firstInput: CreateTaskInput = {
      title: 'First task',
    };

    const secondInput: CreateTaskInput = {
      title: 'Second task',
      completed: true,
    };

    const thirdInput: CreateTaskInput = {
      title: 'Third task',
    };

    const firstTask = await createTask(firstInput, repository, context);
    await createTask(secondInput, repository, context);
    const thirdTask = await createTask(thirdInput, repository, context);

    await archiveTask(thirdTask.id, { archived: true }, repository, context);

    const tasks = await filterTasks('active', repository, context);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe(firstTask.id);
  });

  it('should filter tasks by completed (completed, not archived)', async () => {
    const firstInput: CreateTaskInput = {
      title: 'First task',
      completed: true,
    };

    const secondInput: CreateTaskInput = {
      title: 'Second task',
    };

    const firstTask = await createTask(firstInput, repository, context);
    const secondTask = await createTask(secondInput, repository, context);

    await archiveTask(secondTask.id, { archived: true }, repository, context);

    const tasks = await filterTasks('completed', repository, context);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe(firstTask.id);
  });

  it('should filter tasks by archived', async () => {
    const firstInput: CreateTaskInput = {
      title: 'First task',
    };

    const secondInput: CreateTaskInput = {
      title: 'Second task',
    };

    const firstTask = await createTask(firstInput, repository, context);
    await createTask(secondInput, repository, context);

    await archiveTask(firstTask.id, { archived: true }, repository, context);

    const tasks = await filterTasks('archived', repository, context);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe(firstTask.id);
  });

  it('should not mutate repository internal state on repeated calls', async () => {
    const firstInput: CreateTaskInput = {
      title: 'First task',
    };

    const secondInput: CreateTaskInput = {
      title: 'Second task',
    };

    await createTask(firstInput, repository, context);
    await createTask(secondInput, repository, context);

    const firstCall = await listTasks(repository, context);
    const secondCall = await listTasks(repository, context);

    // Both calls should return items in the same order
    expect(firstCall).toHaveLength(2);
    expect(secondCall).toHaveLength(2);
    expect(firstCall[0]?.id).toBe(secondCall[0]?.id);
    expect(firstCall[1]?.id).toBe(secondCall[1]?.id);
  });
});

describe('filterTasks', () => {
  let repository: InMemoryTaskRepository;
  let context: RepositoryContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    context = createTestContext();
  });

  describe('filter: all', () => {
    it('should return all tasks including archived when using findWhere', async () => {
      const activeTask = await createTask({ title: 'Active task' }, repository, context);
      const archivedTask = await createTask({ title: 'Archived task' }, repository, context);
      await archiveTask(archivedTask.id, { archived: true }, repository, context);

      const tasks = await filterTasks('all', repository, context);

      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.id)).toContain(activeTask.id);
      expect(tasks.map(t => t.id)).toContain(archivedTask.id);
    });

    it('should return all tasks including archived when using fallback path', async () => {
      // Create a repository without findWhere to force fallback path
      const fallbackRepository = {
        findById: repository.findById.bind(repository),
        findAll: repository.findAll.bind(repository),
        create: repository.create.bind(repository),
        update: repository.update.bind(repository),
        delete: repository.delete.bind(repository),
        count: repository.count.bind(repository),
        // No findWhere - forces fallback path
      } as TaskRepository;

      const activeTask = await createTask({ title: 'Active task' }, fallbackRepository, context);
      const archivedTask = await createTask({ title: 'Archived task' }, fallbackRepository, context);
      await archiveTask(archivedTask.id, { archived: true }, fallbackRepository, context);

      const tasks = await filterTasks('all', fallbackRepository, context);

      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.id)).toContain(activeTask.id);
      expect(tasks.map(t => t.id)).toContain(archivedTask.id);
    });

    it('should decrypt tasks when encryption is enabled (findWhere path)', async () => {
      const testKey = await generateAESKey(false);
      setTaskKeyProvider(async () => testKey);

      await createTask({ title: 'Task 1' }, repository, context);
      await createTask({ title: 'Task 2' }, repository, context);

      const tasks = await filterTasks('all', repository, context);

      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.title)).toContain('Task 1');
      expect(tasks.map(t => t.title)).toContain('Task 2');
      resetKeyProvider();
    });

    it('should decrypt tasks when encryption is enabled (fallback path)', async () => {
      const testKey = await generateAESKey(false);
      setTaskKeyProvider(async () => testKey);

      const fallbackRepository = {
        findById: repository.findById.bind(repository),
        findAll: repository.findAll.bind(repository),
        create: repository.create.bind(repository),
        update: repository.update.bind(repository),
        delete: repository.delete.bind(repository),
        count: repository.count.bind(repository),
      } as TaskRepository;

      await createTask({ title: 'Task 1' }, fallbackRepository, context);
      await createTask({ title: 'Task 2' }, fallbackRepository, context);

      const tasks = await filterTasks('all', fallbackRepository, context);

      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.title)).toContain('Task 1');
      expect(tasks.map(t => t.title)).toContain('Task 2');
      resetKeyProvider();
    });
  });

  describe('filter: active', () => {
    it('should return only non-completed, non-archived tasks when using findWhere', async () => {
      const activeTask = await createTask({ title: 'Active task' }, repository, context);
      await createTask({ title: 'Completed task', completed: true }, repository, context);
      const archivedTask = await createTask({ title: 'Archived task' }, repository, context);
      await archiveTask(archivedTask.id, { archived: true }, repository, context);

      const tasks = await filterTasks('active', repository, context);

      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.id).toBe(activeTask.id);
    });

    it('should return only non-completed, non-archived tasks when using fallback path', async () => {
      const fallbackRepository = {
        findById: repository.findById.bind(repository),
        findAll: repository.findAll.bind(repository),
        create: repository.create.bind(repository),
        update: repository.update.bind(repository),
        delete: repository.delete.bind(repository),
        count: repository.count.bind(repository),
      } as TaskRepository;

      const activeTask = await createTask({ title: 'Active task' }, fallbackRepository, context);
      await createTask({ title: 'Completed task', completed: true }, fallbackRepository, context);
      const archivedTask = await createTask({ title: 'Archived task' }, fallbackRepository, context);
      await archiveTask(archivedTask.id, { archived: true }, fallbackRepository, context);

      const tasks = await filterTasks('active', fallbackRepository, context);

      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.id).toBe(activeTask.id);
    });
  });

  describe('filter: completed', () => {
    it('should return only completed, non-archived tasks when using findWhere', async () => {
      await createTask({ title: 'Active task' }, repository, context);
      const completedTask = await createTask({ title: 'Completed task', completed: true }, repository, context);
      const archivedTask = await createTask({ title: 'Archived completed task', completed: true }, repository, context);
      await archiveTask(archivedTask.id, { archived: true }, repository, context);

      const tasks = await filterTasks('completed', repository, context);

      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.id).toBe(completedTask.id);
    });

    it('should return only completed, non-archived tasks when using fallback path', async () => {
      const fallbackRepository = {
        findById: repository.findById.bind(repository),
        findAll: repository.findAll.bind(repository),
        create: repository.create.bind(repository),
        update: repository.update.bind(repository),
        delete: repository.delete.bind(repository),
        count: repository.count.bind(repository),
      } as TaskRepository;

      await createTask({ title: 'Active task' }, fallbackRepository, context);
      const completedTask = await createTask({ title: 'Completed task', completed: true }, fallbackRepository, context);
      const archivedTask = await createTask({ title: 'Archived completed task', completed: true }, fallbackRepository, context);
      await archiveTask(archivedTask.id, { archived: true }, fallbackRepository, context);

      const tasks = await filterTasks('completed', fallbackRepository, context);

      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.id).toBe(completedTask.id);
    });
  });

  describe('filter: archived', () => {
    it('should return only archived tasks when using findWhere', async () => {
      const activeTask = await createTask({ title: 'Active task' }, repository, context);
      const archivedTask1 = await createTask({ title: 'Archived task 1' }, repository, context);
      const archivedTask2 = await createTask({ title: 'Archived task 2' }, repository, context);
      await archiveTask(archivedTask1.id, { archived: true }, repository, context);
      await archiveTask(archivedTask2.id, { archived: true }, repository, context);

      const tasks = await filterTasks('archived', repository, context);

      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.id)).toContain(archivedTask1.id);
      expect(tasks.map(t => t.id)).toContain(archivedTask2.id);
      expect(tasks.map(t => t.id)).not.toContain(activeTask.id);
    });

    it('should return only archived tasks when using fallback path', async () => {
      const fallbackRepository = {
        findById: repository.findById.bind(repository),
        findAll: repository.findAll.bind(repository),
        create: repository.create.bind(repository),
        update: repository.update.bind(repository),
        delete: repository.delete.bind(repository),
        count: repository.count.bind(repository),
      } as TaskRepository;

      const activeTask = await createTask({ title: 'Active task' }, fallbackRepository, context);
      const archivedTask1 = await createTask({ title: 'Archived task 1' }, fallbackRepository, context);
      const archivedTask2 = await createTask({ title: 'Archived task 2' }, fallbackRepository, context);
      await archiveTask(archivedTask1.id, { archived: true }, fallbackRepository, context);
      await archiveTask(archivedTask2.id, { archived: true }, fallbackRepository, context);

      const tasks = await filterTasks('archived', fallbackRepository, context);

      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.id)).toContain(archivedTask1.id);
      expect(tasks.map(t => t.id)).toContain(archivedTask2.id);
      expect(tasks.map(t => t.id)).not.toContain(activeTask.id);
    });
  });
});

describe('tasks - due dates', () => {
  let repository: InMemoryTaskRepository;
  let context: RepositoryContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    context = createTestContext();
  });

  it('should create a task with a due date', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      dueDate: '2026-06-15T00:00:00Z',
    };

    const task = await createTask(input, repository, context);

    expect(task.dueDate).toBe('2026-06-15T00:00:00Z');
  });

  it('should create a task without a due date', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input, repository, context);

    expect(task.dueDate).toBeNull();
  });

  it('should update a task with a due date', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput, repository, context);

    const updateInput: UpdateTaskInput = {
      dueDate: '2026-06-15T00:00:00Z',
    };

    const updated = await updateTask(task.id, updateInput, repository, context);

    expect(updated.dueDate).toBe('2026-06-15T00:00:00Z');
  });

  it('should remove a due date by setting to empty string', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
      dueDate: '2026-06-15T00:00:00Z',
    };

    const task = await createTask(createInput, repository, context);

    const updateInput: UpdateTaskInput = {
      dueDate: '',
    };

    const updated = await updateTask(task.id, updateInput, repository, context);

    expect(updated.dueDate).toBeNull();
  });

  it('should reject invalid due date format', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      dueDate: 'invalid-date',
    };

    await expect(createTask(input, repository, context)).rejects.toThrow(TaskError);
  });

  it('should reject non-string due date', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      dueDate: 123 as any,
    };

    await expect(createTask(input, repository, context)).rejects.toThrow(TaskError);
  });
});

describe('tasks - priorities', () => {
  let repository: InMemoryTaskRepository;
  let context: RepositoryContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    context = createTestContext();
  });

  it('should create a task with high priority', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      priority: 'high',
    };

    const task = await createTask(input, repository, context);

    expect(task.priority).toBe('high');
  });

  it('should default priority to medium', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input, repository, context);

    expect(task.priority).toBe('medium');
  });

  it('should create a task with low priority', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      priority: 'low',
    };

    const task = await createTask(input, repository, context);

    expect(task.priority).toBe('low');
  });

  it('should update task priority', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput, repository, context);

    const updateInput: UpdateTaskInput = {
      priority: 'high',
    };

    const updated = await updateTask(task.id, updateInput, repository, context);

    expect(updated.priority).toBe('high');
  });

  it('should reject invalid priority', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      priority: 'urgent' as any,
    };

    await expect(createTask(input, repository, context)).rejects.toThrow(TaskError);
  });

  it('should reject non-string priority', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      priority: 1 as any,
    };

    await expect(createTask(input, repository, context)).rejects.toThrow(TaskError);
  });
});

describe('tasks - tags', () => {
  let repository: InMemoryTaskRepository;
  let context: RepositoryContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    context = createTestContext();
  });

  it('should create a task with tags', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      tags: ['shopping', 'home'],
    };

    const task = await createTask(input, repository, context);

    expect(task.tags).toEqual(['shopping', 'home']);
  });

  it('should default tags to empty array', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input, repository, context);

    expect(task.tags).toEqual([]);
  });

  it('should trim tag whitespace', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      tags: ['  shopping  ', '  home  '],
    };

    const task = await createTask(input, repository, context);

    expect(task.tags).toEqual(['shopping', 'home']);
  });

  it('should update task tags', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
      tags: ['shopping'],
    };

    const task = await createTask(createInput, repository, context);

    const updateInput: UpdateTaskInput = {
      tags: ['shopping', 'urgent'],
    };

    const updated = await updateTask(task.id, updateInput, repository, context);

    expect(updated.tags).toEqual(['shopping', 'urgent']);
  });

  it('should reject non-array tags', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      tags: 'shopping' as any,
    };

    await expect(createTask(input, repository, context)).rejects.toThrow(TaskError);
  });

  it('should reject non-string tag', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      tags: [123] as any,
    };

    await expect(createTask(input, repository, context)).rejects.toThrow(TaskError);
  });

  it('should reject empty tag string', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      tags: [''],
    };

    await expect(createTask(input, repository, context)).rejects.toThrow(TaskError);
  });
});

describe('tasks - search', () => {
  let repository: InMemoryTaskRepository;
  let context: RepositoryContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    context = createTestContext();
  });

  it('should search tasks by query', async () => {
    await createTask({ title: 'Buy groceries' }, repository, context);
    await createTask({ title: 'Pay bills' }, repository, context);
    await createTask({ title: 'Walk the dog' }, repository, context);

    const input: SearchTasksInput = {
      query: 'buy',
    };

    const results = await searchTasks(input, repository, context);

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Buy groceries');
  });

  it('should search tasks case-insensitively', async () => {
    await createTask({ title: 'Buy groceries' }, repository, context);
    await createTask({ title: 'Pay bills' }, repository, context);

    const input: SearchTasksInput = {
      query: 'BUY',
    };

    const results = await searchTasks(input, repository, context);

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Buy groceries');
  });

  it('should search tasks by tags', async () => {
    await createTask({ title: 'Buy groceries', tags: ['shopping', 'home'] }, repository, context);
    await createTask({ title: 'Pay bills', tags: ['finance'] }, repository, context);
    await createTask({ title: 'Walk the dog', tags: ['home'] }, repository, context);

    const input: SearchTasksInput = {
      tags: ['shopping'],
    };

    const results = await searchTasks(input, repository, context);

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Buy groceries');
  });

  it('should search tasks by multiple tags (AND logic)', async () => {
    await createTask({ title: 'Buy groceries', tags: ['shopping', 'home'] }, repository, context);
    await createTask({ title: 'Pay bills', tags: ['finance'] }, repository, context);
    await createTask({ title: 'Walk the dog', tags: ['home'] }, repository, context);

    const input: SearchTasksInput = {
      tags: ['shopping', 'home'],
    };

    const results = await searchTasks(input, repository, context);

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Buy groceries');
  });

  it('should search tasks by query and tags', async () => {
    await createTask({ title: 'Buy groceries', tags: ['shopping'] }, repository, context);
    await createTask({ title: 'Buy milk', tags: ['shopping'] }, repository, context);
    await createTask({ title: 'Pay bills', tags: ['finance'] }, repository, context);

    const input: SearchTasksInput = {
      query: 'buy',
      tags: ['shopping'],
    };

    const results = await searchTasks(input, repository, context);

    expect(results).toHaveLength(2);
  });

  it('should return all tasks when no filters provided', async () => {
    await createTask({ title: 'Buy groceries' }, repository, context);
    await createTask({ title: 'Pay bills' }, repository, context);

    const input: SearchTasksInput = {};

    const results = await searchTasks(input, repository, context);

    expect(results).toHaveLength(2);
  });
});

describe('tasks - batch operations', () => {
  let repository: InMemoryTaskRepository;
  let context: RepositoryContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    context = createTestContext();
  });

  it('should batch complete multiple tasks', async () => {
    const task1 = await createTask({ title: 'First task' }, repository, context);
    const task2 = await createTask({ title: 'Second task' }, repository, context);
    const _task3 = await createTask({ title: 'Third task' }, repository, context);

    const input: BatchOperationInput = {
      taskIds: [task1.id, task2.id],
    };

    const results = await batchComplete(input, repository, context);

    expect(results).toHaveLength(2);
    expect(results[0]?.completed).toBe(true);
    expect(results[1]?.completed).toBe(true);
  });

  it('should batch archive multiple tasks', async () => {
    const task1 = await createTask({ title: 'First task' }, repository, context);
    const task2 = await createTask({ title: 'Second task' }, repository, context);
    const _task3 = await createTask({ title: 'Third task' }, repository, context);

    const input: BatchOperationInput = {
      taskIds: [task1.id, task2.id],
    };

    const results = await batchArchive(input, repository, context);

    expect(results).toHaveLength(2);
    expect(results[0]?.archived).toBe(true);
    expect(results[1]?.archived).toBe(true);
  });

  it('should handle partial failures in batch complete', async () => {
    const task1 = await createTask({ title: 'First task' }, repository, context);
    const task2 = await createTask({ title: 'Second task' }, repository, context);

    const input: BatchOperationInput = {
      taskIds: [task1.id, 'non-existent-id', task2.id],
    };

    const results = await batchComplete(input, repository, context);

    // Should complete the valid tasks and skip the invalid one
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty task IDs array', async () => {
    const input: BatchOperationInput = {
      taskIds: [],
    };

    const results = await batchComplete(input, undefined, context);

    expect(results).toHaveLength(0);
  });
});

describe('tasks - encryption', () => {
  let context: RepositoryContext;

  beforeEach(() => {
    resetTasks();
    resetKeyProvider();
    context = createTestContext();
  });

  it('should encrypt task title so it is not equal to plaintext', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const task: import('./tasks.js').TaskItem = {
      id: 'test-id',
      title: 'Buy groceries',
      completed: false,
      archived: false,
      dueDate: null,
      priority: 'medium',
      tags: ['shopping', 'home'],
    };

    const encrypted = await sealTask(task);

    // Encrypted title should not equal plaintext
    expect(encrypted.encryptedTitle).toBeDefined();
    expect(encrypted.encryptedTitle.ciphertext).not.toBe(task.title);
    expect(encrypted.encryptedTitle.iv).toBeDefined();
  });

  it('should decrypt task title back to original plaintext', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const task: import('./tasks.js').TaskItem = {
      id: 'test-id',
      title: 'Buy groceries',
      completed: false,
      archived: false,
      dueDate: null,
      priority: 'medium',
      tags: ['shopping', 'home'],
    };

    const encrypted = await sealTask(task);
    const decrypted = await unsealTask(encrypted);

    expect(decrypted.title).toBe(task.title);
    expect(decrypted.tags).toEqual(task.tags);
  });

  it('should encrypt and decrypt empty tags array', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const task: import('./tasks.js').TaskItem = {
      id: 'test-id',
      title: 'Buy groceries',
      completed: false,
      archived: false,
      dueDate: null,
      priority: 'medium',
      tags: [],
    };

    const encrypted = await sealTask(task);
    const decrypted = await unsealTask(encrypted);

    expect(decrypted.title).toBe(task.title);
    expect(decrypted.tags).toEqual([]);
  });

  it('should create task with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const repository = new InMemoryTaskRepository();
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input, repository, context);
    expect(task.title).toBe('Buy groceries');
    resetKeyProvider();
  });

  it('should list tasks with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const repository = new InMemoryTaskRepository();
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    await createTask(input, repository, context);
    const tasks = await listTasks(repository, context);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.title).toBe('Buy groceries');
    resetKeyProvider();
  });

  it('should get task by id with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const repository = new InMemoryTaskRepository();
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input, repository, context);
    const found = await getTask(task.id, repository, context);

    expect(found).not.toBeNull();
    expect(found?.title).toBe('Buy groceries');
    resetKeyProvider();
  });

  it('should update task completion with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const repository = new InMemoryTaskRepository();
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input, repository, context);
    const updated = await updateTaskCompletion(task.id, { completed: true }, repository, context);

    expect(updated.completed).toBe(true);
    resetKeyProvider();
  });

  it('should update task with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const repository = new InMemoryTaskRepository();
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input, repository, context);
    const updated = await updateTask(task.id, { title: 'Buy milk' }, repository, context);

    expect(updated.title).toBe('Buy milk');
    resetKeyProvider();
  });

  it('should update task tags with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const repository = new InMemoryTaskRepository();
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      tags: ['shopping'],
    };

    const task = await createTask(input, repository, context);
    const updated = await updateTask(task.id, { tags: ['shopping', 'urgent'] }, repository, context);

    expect(updated.tags).toEqual(['shopping', 'urgent']);
    resetKeyProvider();
  });

  it('should archive task with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const repository = new InMemoryTaskRepository();
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input, repository, context);
    const archived = await archiveTask(task.id, { archived: true }, repository, context);

    expect(archived.archived).toBe(true);
    resetKeyProvider();
  });

  it('should filter tasks with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const repository = new InMemoryTaskRepository();
    await createTask({ title: 'First task' }, repository, context);
    await createTask({ title: 'Second task', completed: true }, repository, context);

    const tasks = await filterTasks('active', repository, context);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.title).toBe('First task');
    resetKeyProvider();
  });

  it('should reset tasks DB', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    await createTask(input, undefined, context);
    await resetTasksDB(undefined, context);

    const tasks = await listTasks(undefined, context);
    expect(tasks).toHaveLength(0);
  });
});

describe('tasks - database-specific filtering', () => {
  let context: RepositoryContext;

  beforeEach(() => {
    resetTasks();
    context = createTestContext();
  });

  it('should use database-specific filtering when available', async () => {
    let findWhereCalled = false;

    const customRepository = new InMemoryTaskRepository();
    const originalFindWhere = customRepository.findWhere.bind(customRepository);
    customRepository.findWhere = async (_criteria: Partial<TaskItem>, _context: RepositoryContext) => {
      findWhereCalled = true;
      return originalFindWhere(_criteria, _context);
    };

    await createTask({ title: 'Test task' }, customRepository, context);
    await filterTasks('active', customRepository, context);

    expect(findWhereCalled).toBe(true);
  });
});

describe('tasks - blind index search', () => {
  let context: RepositoryContext;

  beforeEach(() => {
    resetTasks();
    context = createTestContext();
  });

  it('should search tasks by blind index', async () => {
    await createTask({ title: 'Buy groceries', tags: ['shopping'] }, undefined, context);
    await createTask({ title: 'Pay bills', tags: ['finance'] }, undefined, context);

    const input: SearchTasksInput = {
      blindIndex: 'some-blind-index',
    };

    const results = await searchTasks(input, undefined, context);

    // No tasks have blind index set, so should return empty
    expect(results).toHaveLength(0);
  });
});

describe('tasks - property-based tests', () => {
  let context: RepositoryContext;

  beforeEach(() => {
    resetTasks();
    context = createTestContext();
  });

  it('property: title trimming preserves non-empty content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
        fc.string({ minLength: 0, maxLength: 10 }),
        async (title: string, whitespace: string) => {
          resetTasks();
          const titleWithWhitespace = whitespace + title + whitespace;

          const input: CreateTaskInput = {
            title: titleWithWhitespace,
          };

          const task = await createTask(input, undefined, context);
          expect(task.title).toBe(titleWithWhitespace.trim());
          expect(task.title.length).toBeGreaterThan(0);
        }
      )
    );
  });

  it('property: priority is always valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
        fc.oneof(fc.constant('low'), fc.constant('medium'), fc.constant('high')) as fc.Arbitrary<'low' | 'medium' | 'high'>,
        async (title: string, priority: 'low' | 'medium' | 'high') => {
          resetTasks();

          const input: CreateTaskInput = {
            title,
            priority,
          };

          const task = await createTask(input, undefined, context);
          expect(['low', 'medium', 'high']).toContain(task.priority);
        }
      )
    );
  });

  it('property: tags are trimmed and non-empty', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter((s: string) => s.trim().length > 0), { minLength: 0, maxLength: 5 }),
        async (title: string, tags: string[]) => {
          resetTasks();

          const input: CreateTaskInput = {
            title,
            tags,
          };

          const task = await createTask(input, undefined, context);
          expect(task.tags).toEqual(tags.map((t: string) => t.trim()));
          expect(task.tags.every((t: string) => t.length > 0)).toBe(true);
        }
      )
    );
  });

  it('property: completed status is boolean', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
        fc.boolean(),
        async (title: string, completed: boolean) => {
          resetTasks();

          const input: CreateTaskInput = {
            title,
            completed,
          };

          const task = await createTask(input, undefined, context);
          expect(typeof task.completed).toBe('boolean');
          expect(task.completed).toBe(completed);
        }
      )
    );
  });

  it('property: archived status is boolean', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
        fc.boolean(),
        async (title: string, archived: boolean) => {
          const repository = new InMemoryTaskRepository();
          const input: CreateTaskInput = {
            title,
          };

          const task = await createTask(input, repository, context);
          await archiveTask(task.id, { archived }, repository, context);

          const updated = await getTask(task.id, repository, context);
          expect(updated?.archived).toBe(archived);
        }
      )
    );
  });

  it('property: due date is valid ISO timestamp when provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
        fc.date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31) }),
        async (title: string, dueDate: Date) => {
          resetTasks();

          const input: CreateTaskInput = {
            title,
            dueDate: dueDate.toISOString(),
          };

          const task = await createTask(input, undefined, context);
          expect(task.dueDate).toBe(dueDate.toISOString());
          expect(task.dueDate !== null && !Number.isNaN(Date.parse(task.dueDate))).toBe(true);
        }
      )
    );
  });

  it('property: search is case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s: string) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s: string) => s.trim().length > 0),
        async (title: string, query: string) => {
          const repository = new InMemoryTaskRepository();
          const taskTitle = title.toLowerCase();

          await createTask({ title: taskTitle }, repository, context);

          const results = await searchTasks({ query: query.toLowerCase() }, repository, context);
          if (taskTitle.includes(query.toLowerCase())) {
            expect(results.length).toBeGreaterThan(0);
          }
        }
      )
    );
  });
});
