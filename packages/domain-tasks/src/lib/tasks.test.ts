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

function assertTaskError(fn: () => void, code: string, detail?: string): void {
  let error: TaskError | undefined;
  try {
    fn();
  } catch (e) {
    error = e as TaskError;
  }
  expect(error).toBeInstanceOf(TaskError);
  expect(error?.code).toBe(code);
  if (detail) {
    expect(error?.details).toContain(detail);
  }
}

describe('tasks - create', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should create a valid task with a stable ID', () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = createTask(input);

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Buy groceries');
    expect(task.completed).toBe(false);
    expect(task.archived).toBe(false);
  });

  it('should create a task with completed status', () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
      completed: true,
    };

    const task = createTask(input);

    expect(task.completed).toBe(true);
  });

  it('should default completed to false when not provided', () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = createTask(input);

    expect(task.completed).toBe(false);
  });

  it('should trim whitespace from title', () => {
    const input: CreateTaskInput = {
      title: '  Buy groceries  ',
    };

    const task = createTask(input);

    expect(task.title).toBe('Buy groceries');
  });

  it('should reject empty title', () => {
    const input: CreateTaskInput = {
      title: '',
    };

    assertTaskError(() => createTask(input), 'validation_error', 'title must be a non-empty string');
  });

  it('should reject whitespace-only title', () => {
    const input: CreateTaskInput = {
      title: '   ',
    };

    expect(() => createTask(input)).toThrow(TaskError);
  });
});

describe('tasks - update completion', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should update task completion status', () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = createTask(createInput);

    const updateInput: UpdateTaskCompletionInput = {
      completed: true,
    };

    const updated = updateTaskCompletion(task.id, updateInput);

    expect(updated.id).toBe(task.id);
    expect(updated.completed).toBe(true);
    expect(updated.title).toBe('Buy groceries');
  });

  it('should reject update with empty id', () => {
    const updateInput: UpdateTaskCompletionInput = {
      completed: true,
    };

    assertTaskError(() => updateTaskCompletion('', updateInput), 'validation_error', 'id must be a non-empty string');
  });

  it('should reject update for non-existent task', () => {
    const updateInput: UpdateTaskCompletionInput = {
      completed: true,
    };

    assertTaskError(() => updateTaskCompletion('non-existent-id', updateInput), 'not_found_error');
  });
});

describe('tasks - update', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should update task title', () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = createTask(createInput);

    const updateInput: UpdateTaskInput = {
      title: 'Buy milk and eggs',
    };

    const updated = updateTask(task.id, updateInput);

    expect(updated.id).toBe(task.id);
    expect(updated.title).toBe('Buy milk and eggs');
    expect(updated.completed).toBe(task.completed);
    expect(updated.archived).toBe(task.archived);
  });

  it('should trim whitespace from updated title', () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = createTask(createInput);

    const updateInput: UpdateTaskInput = {
      title: '  Buy milk and eggs  ',
    };

    const updated = updateTask(task.id, updateInput);

    expect(updated.title).toBe('Buy milk and eggs');
  });

  it('should reject update with empty id', () => {
    const updateInput: UpdateTaskInput = {
      title: 'Buy milk',
    };

    expect(() => updateTask('', updateInput)).toThrow(TaskError);
  });

  it('should reject update for non-existent task', () => {
    const updateInput: UpdateTaskInput = {
      title: 'Buy milk',
    };

    assertTaskError(() => updateTask('non-existent-id', updateInput), 'not_found_error');
  });

  it('should reject update with empty title', () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = createTask(createInput);

    const updateInput: UpdateTaskInput = {
      title: '',
    };

    expect(() => updateTask(task.id, updateInput)).toThrow(TaskError);
  });
});

describe('tasks - archive', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should archive a task', () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = createTask(createInput);

    const archiveInput: ArchiveTaskInput = {
      archived: true,
    };

    const archived = archiveTask(task.id, archiveInput);

    expect(archived.id).toBe(task.id);
    expect(archived.archived).toBe(true);
  });

  it('should unarchive a task', () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = createTask(createInput);

    const archiveInput: ArchiveTaskInput = {
      archived: true,
    };

    archiveTask(task.id, archiveInput);

    const unarchiveInput: ArchiveTaskInput = {
      archived: false,
    };

    const unarchived = archiveTask(task.id, unarchiveInput);

    expect(unarchived.archived).toBe(false);
  });

  it('should reject archive with empty id', () => {
    const archiveInput: ArchiveTaskInput = {
      archived: true,
    };

    expect(() => archiveTask('', archiveInput)).toThrow(TaskError);
  });

  it('should reject archive for non-existent task', () => {
    const archiveInput: ArchiveTaskInput = {
      archived: true,
    };

    assertTaskError(() => archiveTask('non-existent-id', archiveInput), 'not_found_error');
  });
});

describe('tasks - delete', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should delete a task', () => {
    const createInput: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = createTask(createInput);

    deleteTask(task.id);

    const found = getTask(task.id);
    expect(found).toBeNull();
  });

  it('should reject delete with empty id', () => {
    expect(() => deleteTask('')).toThrow(TaskError);
  });

  it('should reject delete for non-existent task', () => {
    assertTaskError(() => deleteTask('non-existent-id'), 'not_found_error');
  });
});

describe('tasks - query', () => {
  beforeEach(() => {
    resetTasks();
  });

  it('should list all tasks in reverse creation order', () => {
    const firstInput: CreateTaskInput = {
      title: 'First task',
    };

    const secondInput: CreateTaskInput = {
      title: 'Second task',
    };

    const firstTask = createTask(firstInput);
    const secondTask = createTask(secondInput);

    const tasks = listTasks();

    expect(tasks).toHaveLength(2);
    expect(tasks[0]?.id).toBe(secondTask.id);
    expect(tasks[1]?.id).toBe(firstTask.id);
  });

  it('should get task by id', () => {
    const input: CreateTaskInput = {
      title: 'Buy groceries',
    };

    const task = createTask(input);
    const found = getTask(task.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(task.id);
    expect(found?.title).toBe('Buy groceries');
  });

  it('should return null for non-existent task', () => {
    const found = getTask('non-existent-id');
    expect(found).toBeNull();
  });

  it('should filter tasks by all (non-archived)', () => {
    const firstInput: CreateTaskInput = {
      title: 'First task',
    };

    const secondInput: CreateTaskInput = {
      title: 'Second task',
    };

    const firstTask = createTask(firstInput);
    const secondTask = createTask(secondInput);

    archiveTask(firstTask.id, { archived: true });

    const tasks = filterTasks('all');

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe(secondTask.id);
  });

  it('should filter tasks by active (not completed, not archived)', () => {
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

    const firstTask = createTask(firstInput);
    createTask(secondInput);
    const thirdTask = createTask(thirdInput);

    archiveTask(thirdTask.id, { archived: true });

    const tasks = filterTasks('active');

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe(firstTask.id);
  });

  it('should filter tasks by completed (completed, not archived)', () => {
    const firstInput: CreateTaskInput = {
      title: 'First task',
      completed: true,
    };

    const secondInput: CreateTaskInput = {
      title: 'Second task',
    };

    const firstTask = createTask(firstInput);
    const secondTask = createTask(secondInput);

    archiveTask(secondTask.id, { archived: true });

    const tasks = filterTasks('completed');

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe(firstTask.id);
  });

  it('should filter tasks by archived', () => {
    const firstInput: CreateTaskInput = {
      title: 'First task',
    };

    const secondInput: CreateTaskInput = {
      title: 'Second task',
    };

    const firstTask = createTask(firstInput);
    const secondTask = createTask(secondInput);

    archiveTask(firstTask.id, { archived: true });

    const tasks = filterTasks('archived');

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe(firstTask.id);
  });
});
