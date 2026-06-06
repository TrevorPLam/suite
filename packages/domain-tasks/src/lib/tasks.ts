import type { QueryRepository } from '@suite/db';

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskItem = {
  id: string;
  title: string;
  completed: boolean;
  archived: boolean;
  dueDate: string | null;
  priority: TaskPriority;
  tags: string[]
};

export type CreateTaskInput = {
  title: string;
  completed?: boolean;
  dueDate?: string | null;
  priority?: TaskPriority;
  tags?: string[];
};

export type UpdateTaskCompletionInput = {
  completed: boolean;
};

export type UpdateTaskInput = {
  title?: string;
  dueDate?: string | null;
  priority?: TaskPriority;
  tags?: string[];
};

export type ArchiveTaskInput = {
  archived: boolean;
};

export type TaskErrorCode = 'validation_error' | 'not_found_error';

export type SearchTasksInput = {
  query?: string;
  tags?: string[];
};

export type BatchOperationInput = {
  taskIds: string[];
};

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

function validateDueDate(dueDate: unknown): string | null {
  if (dueDate === undefined || dueDate === null) {
    return null;
  }

  if (typeof dueDate !== 'string') {
    throw new TaskError('Invalid task payload', 'validation_error', [
      'dueDate must be a string',
    ]);
  }

  const trimmed = dueDate.trim();
  if (trimmed.length === 0) {
    return null;
  }

  // Basic ISO 8601 validation (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)
  const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
  if (!isoRegex.test(trimmed)) {
    throw new TaskError('Invalid task payload', 'validation_error', [
      'dueDate must be a valid ISO 8601 timestamp',
    ]);
  }

  return trimmed;
}

function validatePriority(priority: unknown): TaskPriority {
  if (priority === undefined || priority === null) {
    return 'medium'; // default
  }

  if (typeof priority !== 'string') {
    throw new TaskError('Invalid task payload', 'validation_error', [
      'priority must be a string',
    ]);
  }

  const validPriorities: TaskPriority[] = ['low', 'medium', 'high'];
  if (!validPriorities.includes(priority as TaskPriority)) {
    throw new TaskError('Invalid task payload', 'validation_error', [
      'priority must be one of: low, medium, high',
    ]);
  }

  return priority as TaskPriority;
}

function validateTags(tags: unknown): string[] {
  if (tags === undefined || tags === null) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw new TaskError('Invalid task payload', 'validation_error', [
      'tags must be an array',
    ]);
  }

  const validatedTags: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== 'string') {
      throw new TaskError('Invalid task payload', 'validation_error', [
        'each tag must be a string',
      ]);
    }
    const trimmed = tag.trim();
    if (trimmed.length === 0) {
      throw new TaskError('Invalid task payload', 'validation_error', [
        'tags cannot contain empty strings',
      ]);
    }
    validatedTags.push(trimmed);
  }

  return validatedTags;
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
  const taskInput: Omit<TaskItem, 'id'> = {
    title: normalizeTaskTitle(input.title),
    completed: input.completed ?? false,
    archived: false,
    dueDate: validateDueDate(input.dueDate),
    priority: validatePriority(input.priority),
    tags: validateTags(input.tags),
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

  const updates: Partial<TaskItem> = {};

  if (input.title !== undefined) {
    updates.title = normalizeTaskTitle(input.title);
  }

  if (input.dueDate !== undefined) {
    updates.dueDate = validateDueDate(input.dueDate);
  }

  if (input.priority !== undefined) {
    updates.priority = validatePriority(input.priority);
  }

  if (input.tags !== undefined) {
    updates.tags = validateTags(input.tags);
  }

  const updated = await currentRepository.update(id, updates);

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

export async function searchTasks(input: SearchTasksInput): Promise<TaskItem[]> {
  const allTasks = await listTasks();
  
  return allTasks.filter((task) => {
    // Filter by query (title search)
    if (input.query) {
      const query = input.query.toLowerCase();
      const titleMatch = task.title.toLowerCase().includes(query);
      if (!titleMatch) {
        return false;
      }
    }
    
    // Filter by tags (must match all provided tags)
    if (input.tags && input.tags.length > 0) {
      const hasAllTags = input.tags.every((tag) => 
        task.tags.some((taskTag) => taskTag === tag)
      );
      if (!hasAllTags) {
        return false;
      }
    }
    
    return true;
  });
}

export async function batchComplete(input: BatchOperationInput): Promise<TaskItem[]> {
  const results: TaskItem[] = [];
  
  for (const taskId of input.taskIds) {
    try {
      const updated = await updateTaskCompletion(taskId, { completed: true });
      results.push(updated);
    } catch (error) {
      // Continue with other tasks even if one fails
      // In a production system, we might want to collect errors
    }
  }
  
  return results;
}

export async function batchArchive(input: BatchOperationInput): Promise<TaskItem[]> {
  const results: TaskItem[] = [];
  
  for (const taskId of input.taskIds) {
    try {
      const updated = await archiveTask(taskId, { archived: true });
      results.push(updated);
    } catch (error) {
      // Continue with other tasks even if one fails
    }
  }
  
  return results;
}
