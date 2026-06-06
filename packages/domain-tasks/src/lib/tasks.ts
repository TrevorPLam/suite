import type { QueryRepository } from '@suite/db';

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

export interface TaskRepository extends QueryRepository<TaskItem> {
  clear?(): void;
}

// In-memory repository for testing (default)
class InMemoryTaskRepository implements TaskRepository {
  private tasks = new Map<string, TaskItem>();

  async findById(id: string): Promise<TaskItem | null> {
    return this.tasks.get(id) ?? null;
  }

  async findAll(): Promise<TaskItem[]> {
    return Array.from(this.tasks.values());
  }

  async create(entity: Omit<TaskItem, 'id'>): Promise<TaskItem> {
    const task: TaskItem = {
      id: crypto.randomUUID(),
      ...entity,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async update(id: string, entity: Partial<TaskItem>): Promise<TaskItem | null> {
    const existing = this.tasks.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...entity };
    this.tasks.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async findWhere(criteria: Partial<TaskItem>): Promise<TaskItem[]> {
    const allTasks = Array.from(this.tasks.values());
    return allTasks.filter(task => {
      for (const [key, value] of Object.entries(criteria)) {
        if (task[key as keyof TaskItem] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  async count(criteria?: Partial<TaskItem>): Promise<number> {
    if (!criteria || Object.keys(criteria).length === 0) {
      return this.tasks.size;
    }
    const results = await this.findWhere(criteria);
    return results.length;
  }

  clear(): void {
    this.tasks.clear();
  }
}

// Default repository (in-memory for backward compatibility)
let defaultRepository: TaskRepository = new InMemoryTaskRepository();

// Current repository (can be injected)
let currentRepository: TaskRepository = defaultRepository;

export function setTaskRepository(repository: TaskRepository): void {
  currentRepository = repository;
}

export function getTaskRepository(): TaskRepository {
  return currentRepository;
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
  if (currentRepository instanceof InMemoryTaskRepository) {
    (currentRepository as InMemoryTaskRepository).clear();
  }
}

export async function resetTasksDB(): Promise<void> {
  // For database repositories, delete all tasks
  const tasks = await currentRepository.findAll();
  for (const task of tasks) {
    await currentRepository.delete(task.id);
  }
}

export async function listTasks(): Promise<TaskItem[]> {
  const tasks = await currentRepository.findAll();
  return tasks.reverse().map(snapshot);
}

export async function getTask(id: string): Promise<TaskItem | null> {
  const task = await currentRepository.findById(id);
  return task ? snapshot(task) : null;
}

export async function createTask(input: CreateTaskInput): Promise<TaskItem> {
  const taskInput = {
    title: normalizeTaskTitle(input.title),
    completed: input.completed ?? false,
    archived: false,
  };

  const created = await currentRepository.create(taskInput);

  return snapshot(created);
}

export async function updateTaskCompletion(id: string, input: UpdateTaskCompletionInput): Promise<TaskItem> {
  if (!isNonEmptyString(id)) {
    throw new TaskError('Invalid task id', 'validation_error', ['id must be a non-empty string']);
  }

  const existingTask = await currentRepository.findById(id);

  if (!existingTask) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  const updated = await currentRepository.update(id, { completed: input.completed });

  if (!updated) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  return snapshot(updated);
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<TaskItem> {
  if (!isNonEmptyString(id)) {
    throw new TaskError('Invalid task id', 'validation_error', ['id must be a non-empty string']);
  }

  const existingTask = await currentRepository.findById(id);

  if (!existingTask) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  const updated = await currentRepository.update(id, { title: normalizeTaskTitle(input.title) });

  if (!updated) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  return snapshot(updated);
}

export async function archiveTask(id: string, input: ArchiveTaskInput): Promise<TaskItem> {
  if (!isNonEmptyString(id)) {
    throw new TaskError('Invalid task id', 'validation_error', ['id must be a non-empty string']);
  }

  const existingTask = await currentRepository.findById(id);

  if (!existingTask) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  const updated = await currentRepository.update(id, { archived: input.archived });

  if (!updated) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  return snapshot(updated);
}

export async function deleteTask(id: string): Promise<void> {
  if (!isNonEmptyString(id)) {
    throw new TaskError('Invalid task id', 'validation_error', ['id must be a non-empty string']);
  }

  const existingTask = await currentRepository.findById(id);

  if (!existingTask) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  await currentRepository.delete(id);
}

export type TaskFilter = 'all' | 'active' | 'completed' | 'archived';

export async function filterTasks(filter: TaskFilter): Promise<TaskItem[]> {
  // Use database-specific filtering if available
  if (currentRepository.findWhere) {
    switch (filter) {
      case 'active':
        return currentRepository.findWhere({ completed: false, archived: false });
      case 'completed':
        return currentRepository.findWhere({ completed: true, archived: false });
      case 'archived':
        return currentRepository.findWhere({ archived: true });
      case 'all':
      default:
        return currentRepository.findWhere({ archived: false });
    }
  }

  // Fallback to in-memory filtering
  const allTasks = await listTasks();

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
