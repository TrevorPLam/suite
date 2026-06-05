export type TaskItem = {
  id: string;
  title: string;
  completed: boolean;
  archived: boolean;
};

export type CreateTaskInput = {
  title: string;
  completed?: boolean;
};

export type UpdateTaskCompletionInput = {
  completed: boolean;
};

export type UpdateTaskInput = {
  title: string;
};

export type ArchiveTaskInput = {
  archived: boolean;
};

export type TaskErrorCode = 'validation_error' | 'not_found_error';

export class TaskError extends Error {
  constructor(
    message: string,
    public readonly code: TaskErrorCode,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'TaskError';
  }
}

const taskItems = new Map<string, TaskItem>();

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function snapshot(task: TaskItem): TaskItem {
  return {
    ...task,
  };
}

function createTaskId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;

  if (typeof randomUUID === 'function') {
    return randomUUID.call(globalThis.crypto);
  }

  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTaskTitle(title: unknown): string {
  if (!isNonEmptyString(title)) {
    throw new TaskError('Invalid task payload', 'validation_error', [
      'title must be a non-empty string',
    ]);
  }

  return title.trim();
}

export function resetTasks(): void {
  taskItems.clear();
}

export function listTasks(): TaskItem[] {
  return [...taskItems.values()].reverse().map(snapshot);
}

export function getTask(id: string): TaskItem | null {
  const task = taskItems.get(id);

  return task ? snapshot(task) : null;
}

export function createTask(input: CreateTaskInput): TaskItem {
  const task: TaskItem = {
    id: createTaskId(),
    title: normalizeTaskTitle(input.title),
    completed: input.completed ?? false,
    archived: false,
  };

  taskItems.set(task.id, task);

  return snapshot(task);
}

export function updateTaskCompletion(id: string, input: UpdateTaskCompletionInput): TaskItem {
  if (!isNonEmptyString(id)) {
    throw new TaskError('Invalid task id', 'validation_error', ['id must be a non-empty string']);
  }

  const existingTask = taskItems.get(id);

  if (!existingTask) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  const updatedTask: TaskItem = {
    ...existingTask,
    completed: input.completed,
  };

  taskItems.set(id, updatedTask);

  return snapshot(updatedTask);
}

export function updateTask(id: string, input: UpdateTaskInput): TaskItem {
  if (!isNonEmptyString(id)) {
    throw new TaskError('Invalid task id', 'validation_error', ['id must be a non-empty string']);
  }

  const existingTask = taskItems.get(id);

  if (!existingTask) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  const updatedTask: TaskItem = {
    ...existingTask,
    title: normalizeTaskTitle(input.title),
  };

  taskItems.set(id, updatedTask);

  return snapshot(updatedTask);
}

export function archiveTask(id: string, input: ArchiveTaskInput): TaskItem {
  if (!isNonEmptyString(id)) {
    throw new TaskError('Invalid task id', 'validation_error', ['id must be a non-empty string']);
  }

  const existingTask = taskItems.get(id);

  if (!existingTask) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  const updatedTask: TaskItem = {
    ...existingTask,
    archived: input.archived,
  };

  taskItems.set(id, updatedTask);

  return snapshot(updatedTask);
}

export function deleteTask(id: string): void {
  if (!isNonEmptyString(id)) {
    throw new TaskError('Invalid task id', 'validation_error', ['id must be a non-empty string']);
  }

  const existingTask = taskItems.get(id);

  if (!existingTask) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  taskItems.delete(id);
}

export type TaskFilter = 'all' | 'active' | 'completed' | 'archived';

export function filterTasks(filter: TaskFilter): TaskItem[] {
  const allTasks = listTasks();

  switch (filter) {
    case 'active':
      return allTasks.filter((task) => !task.completed && !task.archived);
    case 'completed':
      return allTasks.filter((task) => task.completed && !task.archived);
    case 'archived':
      return allTasks.filter((task) => task.archived);
    case 'all':
    default:
      return allTasks.filter((task) => !task.archived);
  }
}
