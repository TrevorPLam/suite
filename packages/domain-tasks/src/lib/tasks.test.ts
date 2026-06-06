import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTask,
  getTask,
  listTasks,
  updateTaskCompletion,
  updateTask,
  archiveTask,
  deleteTask,
  filterTasks,
  resetTasks,
  TaskError,
  type CreateTaskInput,
  type UpdateTaskCompletionInput,
  type UpdateTaskInput,
  type ArchiveTaskInput,
} from './tasks.js';

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
    const secondTask = await createTask(secondInput);

    await archiveTask(firstTask.id, { archived: true });

    const tasks = await filterTasks('archived');

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe(firstTask.id);
  });
});
