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
  TaskError,
  type CreateTaskInput,
  type UpdateTaskCompletionInput,
  type UpdateTaskInput,
  type ArchiveTaskInput,
  type SearchTasksInput,
  type BatchOperationInput,
} from './tasks.js';
import { sealTask, unsealTask, setTaskKeyProvider } from './tasks-crypto.js';
import { generateAESKey } from '@suite/crypto';

describe('tasks - create', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should create a valid task with a stable ID', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input);

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

    const task = await createTask(input);

    expect(task.completed).toBe(true);
  });

  it('should default completed to false when not provided', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input);

    expect(task.completed).toBe(false);
  });

  it('should trim whitespace from title', async () => {
    const input: CreateTaskInput = {
      title: '  Buy groceries  ',
    };

    const task = await createTask(input);

    expect(task.title).toBe('Buy groceries');
  });

  it('should reject empty title', async () => {
    const input: CreateTaskInput = {
      title: '',
    };

    await expect(createTask(input)).rejects.toThrow(TaskError);
  });

  it('should reject whitespace-only title', async () => {
    const input: CreateTaskInput = {
      title: '   ',
    };

    await expect(createTask(input)).rejects.toThrow(TaskError);
  });
});

describe('tasks - update completion', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should update task completion status', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput);

    const updateInput: UpdateTaskCompletionInput = {
      completed: true,
    };

    const updated = await updateTaskCompletion(task.id, updateInput);

    expect(updated.id).toBe(task.id);
    expect(updated.completed).toBe(true);
    expect(updated.title).toBe('Buy groceries');
  });

  it('should reject update with empty id', async () => {
    const updateInput: UpdateTaskCompletionInput = {
      completed: true,
    };

    await expect(updateTaskCompletion('', updateInput)).rejects.toThrow(TaskError);
  });

  it('should reject update for non-existent task', async () => {
    const updateInput: UpdateTaskCompletionInput = {
      completed: true,
    };

    await expect(updateTaskCompletion('non-existent-id', updateInput)).rejects.toThrow(TaskError);
  });
});

describe('tasks - update', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should update task title', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput);

    const updateInput: UpdateTaskInput = {
      title: 'Buy milk and eggs',
    };

    const updated = await updateTask(task.id, updateInput);

    expect(updated.id).toBe(task.id);
    expect(updated.title).toBe('Buy milk and eggs');
    expect(updated.completed).toBe(task.completed);
    expect(updated.archived).toBe(task.archived);
  });

  it('should trim whitespace from updated title', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput);

    const updateInput: UpdateTaskInput = {
      title: '  Buy milk and eggs  ',
    };

    const updated = await updateTask(task.id, updateInput);

    expect(updated.title).toBe('Buy milk and eggs');
  });

  it('should reject update with empty id', async () => {
    const updateInput: UpdateTaskInput = {
      title: 'Buy milk',
    };

    await expect(updateTask('', updateInput)).rejects.toThrow(TaskError);
  });

  it('should reject update for non-existent task', async () => {
    const updateInput: UpdateTaskInput = {
      title: 'Buy milk',
    };

    await expect(updateTask('non-existent-id', updateInput)).rejects.toThrow(TaskError);
  });

  it('should reject update with empty title', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput);

    const updateInput: UpdateTaskInput = {
      title: '',
    };

    await expect(updateTask(task.id, updateInput)).rejects.toThrow(TaskError);
  });
});

describe('tasks - archive', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should archive a task', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput);

    const archiveInput: ArchiveTaskInput = {
      archived: true,
    };

    const archived = await archiveTask(task.id, archiveInput);

    expect(archived.id).toBe(task.id);
    expect(archived.archived).toBe(true);
  });

  it('should unarchive a task', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput);

    const archiveInput: ArchiveTaskInput = {
      archived: true,
    };

    await archiveTask(task.id, archiveInput);

    const unarchiveInput: ArchiveTaskInput = {
      archived: false,
    };

    const unarchived = await archiveTask(task.id, unarchiveInput);

    expect(unarchived.archived).toBe(false);
  });

  it('should reject archive with empty id', async () => {
    const archiveInput: ArchiveTaskInput = {
      archived: true,
    };

    await expect(archiveTask('', archiveInput)).rejects.toThrow(TaskError);
  });

  it('should reject archive for non-existent task', async () => {
    const archiveInput: ArchiveTaskInput = {
      archived: true,
    };

    await expect(archiveTask('non-existent-id', archiveInput)).rejects.toThrow(TaskError);
  });
});

describe('tasks - delete', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should delete a task', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput);

    await deleteTask(task.id);

    const found = await getTask(task.id);
    expect(found).toBeNull();
  });

  it('should reject delete with empty id', async () => {
    await expect(deleteTask('')).rejects.toThrow(TaskError);
  });

  it('should reject delete for non-existent task', async () => {
    await expect(deleteTask('non-existent-id')).rejects.toThrow(TaskError);
  });
});

describe('tasks - query', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should list all tasks in reverse creation order', async () => {
    const firstInput: CreateTaskInput = {
      title: 'First task',
    };

    const secondInput: CreateTaskInput = {
      title: 'Second task',
    };

    const firstTask = await createTask(firstInput);
    const secondTask = await createTask(secondInput);

    const tasks = await listTasks();

    expect(tasks).toHaveLength(2);
    expect(tasks[0]?.id).toBe(secondTask.id);
    expect(tasks[1]?.id).toBe(firstTask.id);
  });

  it('should get task by id', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input);
    const found = await getTask(task.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(task.id);
    expect(found?.title).toBe('Buy groceries');
  });

  it('should return null for non-existent task', async () => {
    const found = await getTask('non-existent-id');
    expect(found).toBeNull();
  });

  it('should filter tasks by all (non-archived)', async () => {
    const firstInput: CreateTaskInput = {
      title: 'First task',
    };

    const secondInput: CreateTaskInput = {
      title: 'Second task',
    };

    const firstTask = await createTask(firstInput);
    const secondTask = await createTask(secondInput);

    await archiveTask(firstTask.id, { archived: true });

    const tasks = await filterTasks('all');

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe(secondTask.id);
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

    const firstTask = await createTask(firstInput);
    await createTask(secondInput);
    const thirdTask = await createTask(thirdInput);

    await archiveTask(thirdTask.id, { archived: true });

    const tasks = await filterTasks('active');

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

    const firstTask = await createTask(firstInput);
    const secondTask = await createTask(secondInput);

    await archiveTask(secondTask.id, { archived: true });

    const tasks = await filterTasks('completed');

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

    const firstTask = await createTask(firstInput);
    await createTask(secondInput);

    await archiveTask(firstTask.id, { archived: true });

    const tasks = await filterTasks('archived');

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe(firstTask.id);
  });
});

describe('tasks - due dates', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should create a task with a due date', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      dueDate: '2026-06-15T00:00:00Z',
    };

    const task = await createTask(input);

    expect(task.dueDate).toBe('2026-06-15T00:00:00Z');
  });

  it('should create a task without a due date', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input);

    expect(task.dueDate).toBeNull();
  });

  it('should update a task with a due date', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput);

    const updateInput: UpdateTaskInput = {
      dueDate: '2026-06-15T00:00:00Z',
    };

    const updated = await updateTask(task.id, updateInput);

    expect(updated.dueDate).toBe('2026-06-15T00:00:00Z');
  });

  it('should remove a due date by setting to empty string', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
      dueDate: '2026-06-15T00:00:00Z',
    };

    const task = await createTask(createInput);

    const updateInput: UpdateTaskInput = {
      dueDate: '',
    };

    const updated = await updateTask(task.id, updateInput);

    expect(updated.dueDate).toBeNull();
  });

  it('should reject invalid due date format', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      dueDate: 'invalid-date',
    };

    await expect(createTask(input)).rejects.toThrow(TaskError);
  });

  it('should reject non-string due date', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      dueDate: 123 as any,
    };

    await expect(createTask(input)).rejects.toThrow(TaskError);
  });
});

describe('tasks - priorities', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should create a task with high priority', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      priority: 'high',
    };

    const task = await createTask(input);

    expect(task.priority).toBe('high');
  });

  it('should default priority to medium', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input);

    expect(task.priority).toBe('medium');
  });

  it('should create a task with low priority', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      priority: 'low',
    };

    const task = await createTask(input);

    expect(task.priority).toBe('low');
  });

  it('should update task priority', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(createInput);

    const updateInput: UpdateTaskInput = {
      priority: 'high',
    };

    const updated = await updateTask(task.id, updateInput);

    expect(updated.priority).toBe('high');
  });

  it('should reject invalid priority', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      priority: 'urgent' as any,
    };

    await expect(createTask(input)).rejects.toThrow(TaskError);
  });

  it('should reject non-string priority', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      priority: 1 as any,
    };

    await expect(createTask(input)).rejects.toThrow(TaskError);
  });
});

describe('tasks - tags', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should create a task with tags', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      tags: ['shopping', 'home'],
    };

    const task = await createTask(input);

    expect(task.tags).toEqual(['shopping', 'home']);
  });

  it('should default tags to empty array', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = await createTask(input);

    expect(task.tags).toEqual([]);
  });

  it('should trim tag whitespace', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      tags: ['  shopping  ', '  home  '],
    };

    const task = await createTask(input);

    expect(task.tags).toEqual(['shopping', 'home']);
  });

  it('should update task tags', async () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
      tags: ['shopping'],
    };

    const task = await createTask(createInput);

    const updateInput: UpdateTaskInput = {
      tags: ['shopping', 'urgent'],
    };

    const updated = await updateTask(task.id, updateInput);

    expect(updated.tags).toEqual(['shopping', 'urgent']);
  });

  it('should reject non-array tags', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      tags: 'shopping' as any,
    };

    await expect(createTask(input)).rejects.toThrow(TaskError);
  });

  it('should reject non-string tag', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      tags: [123] as any,
    };

    await expect(createTask(input)).rejects.toThrow(TaskError);
  });

  it('should reject empty tag string', async () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      tags: [''],
    };

    await expect(createTask(input)).rejects.toThrow(TaskError);
  });
});

describe('tasks - search', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should search tasks by query', async () => {
    await createTask({ title: 'Buy groceries' });
    await createTask({ title: 'Pay bills' });
    await createTask({ title: 'Walk the dog' });

    const input: SearchTasksInput = {
      query: 'buy',
    };

    const results = await searchTasks(input);

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Buy groceries');
  });

  it('should search tasks case-insensitively', async () => {
    await createTask({ title: 'Buy groceries' });
    await createTask({ title: 'Pay bills' });

    const input: SearchTasksInput = {
      query: 'BUY',
    };

    const results = await searchTasks(input);

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Buy groceries');
  });

  it('should search tasks by tags', async () => {
    await createTask({ title: 'Buy groceries', tags: ['shopping', 'home'] });
    await createTask({ title: 'Pay bills', tags: ['finance'] });
    await createTask({ title: 'Walk the dog', tags: ['home'] });

    const input: SearchTasksInput = {
      tags: ['shopping'],
    };

    const results = await searchTasks(input);

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Buy groceries');
  });

  it('should search tasks by multiple tags (AND logic)', async () => {
    await createTask({ title: 'Buy groceries', tags: ['shopping', 'home'] });
    await createTask({ title: 'Pay bills', tags: ['finance'] });
    await createTask({ title: 'Walk the dog', tags: ['home'] });

    const input: SearchTasksInput = {
      tags: ['shopping', 'home'],
    };

    const results = await searchTasks(input);

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Buy groceries');
  });

  it('should search tasks by query and tags', async () => {
    await createTask({ title: 'Buy groceries', tags: ['shopping'] });
    await createTask({ title: 'Buy milk', tags: ['shopping'] });
    await createTask({ title: 'Pay bills', tags: ['finance'] });

    const input: SearchTasksInput = {
      query: 'buy',
      tags: ['shopping'],
    };

    const results = await searchTasks(input);

    expect(results).toHaveLength(2);
  });

  it('should return all tasks when no filters provided', async () => {
    await createTask({ title: 'Buy groceries' });
    await createTask({ title: 'Pay bills' });

    const input: SearchTasksInput = {};

    const results = await searchTasks(input);

    expect(results).toHaveLength(2);
  });
});

describe('tasks - batch operations', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should batch complete multiple tasks', async () => {
    const task1 = await createTask({ title: 'First task' });
    const task2 = await createTask({ title: 'Second task' });
    const _task3 = await createTask({ title: 'Third task' });

    const input: BatchOperationInput = {
      taskIds: [task1.id, task2.id],
    };

    const results = await batchComplete(input);

    expect(results).toHaveLength(2);
    expect(results[0]?.completed).toBe(true);
    expect(results[1]?.completed).toBe(true);
  });

  it('should batch archive multiple tasks', async () => {
    const task1 = await createTask({ title: 'First task' });
    const task2 = await createTask({ title: 'Second task' });
    const _task3 = await createTask({ title: 'Third task' });

    const input: BatchOperationInput = {
      taskIds: [task1.id, task2.id],
    };

    const results = await batchArchive(input);

    expect(results).toHaveLength(2);
    expect(results[0]?.archived).toBe(true);
    expect(results[1]?.archived).toBe(true);
  });

  it('should handle partial failures in batch complete', async () => {
    const task1 = await createTask({ title: 'First task' });
    const task2 = await createTask({ title: 'Second task' });

    const input: BatchOperationInput = {
      taskIds: [task1.id, 'non-existent-id', task2.id],
    };

    const results = await batchComplete(input);

    // Should complete the valid tasks and skip the invalid one
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty task IDs array', async () => {
    const input: BatchOperationInput = {
      taskIds: [],
    };

    const results = await batchComplete(input);

    expect(results).toHaveLength(0);
  });
});

describe('tasks - encryption', () => {
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
});

describe('tasks - property-based tests', () => {
  beforeEach(() => {
    resetTasks();
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

          const task = await createTask(input);
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

          const task = await createTask(input);
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

          const task = await createTask(input);
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

          const task = await createTask(input);
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
          resetTasks();

          const input: CreateTaskInput = {
            title,
          };

          const task = await createTask(input);
          await archiveTask(task.id, { archived });

          const updated = await getTask(task.id);
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

          const task = await createTask(input);
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
          resetTasks();
          const taskTitle = title.toLowerCase();

          await createTask({ title: taskTitle });

          const results = await searchTasks({ query: query.toLowerCase() });
          if (taskTitle.includes(query.toLowerCase())) {
            expect(results.length).toBeGreaterThan(0);
          }
        }
      )
    );
  });
});
