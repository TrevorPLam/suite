import type { QueryRepository } from '@suite/db';
import { generateUUID } from '@suite/shared-kernel';
import { sealTask, unsealTask, unsealTasks, isEncryptionEnabled, type EncryptedTaskItem } from './tasks-crypto.js';

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskItem = {
  id: string;
  title: string;
  completed: boolean;
  archived: boolean;
  dueDate: string | null;
  priority: TaskPriority;
  tags: string[];
  blindIndex?: string;
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
  blindIndex?: string;
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
export class InMemoryTaskRepository implements TaskRepository {
  private tasks = new Map<string, TaskItem>();

  async findById(id: string): Promise<TaskItem | null> {
    return this.tasks.get(id) ?? null;
  }

  async findAll(): Promise<TaskItem[]> {
    return Array.from(this.tasks.values());
  }

  async create(entity: Omit<TaskItem, 'id'>): Promise<TaskItem> {
    const task: TaskItem = {
      id: generateUUID(),
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

// Factory function to create repository with dependencies
export function createTaskRepository(repository: TaskRepository): TaskRepository {
  return repository;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function snapshot(task: TaskItem): TaskItem {
  return {
    ...task,
  };
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

export function resetTasks(repository: TaskRepository = new InMemoryTaskRepository()): void {
  if (repository instanceof InMemoryTaskRepository) {
    (repository as InMemoryTaskRepository).clear();
  }
}

export async function resetTasksDB(repository: TaskRepository = new InMemoryTaskRepository()): Promise<void> {
  // For database repositories, delete all tasks
  const tasks = await repository.findAll();
  for (const task of tasks) {
    await repository.delete(task.id);
  }
}

export async function listTasks(repository: TaskRepository = new InMemoryTaskRepository()): Promise<TaskItem[]> {
  const tasks = await repository.findAll();
  const reversedTasks = tasks.reverse();

  // Decrypt if encryption is enabled
  if (isEncryptionEnabled()) {
    const decryptedTasks = await unsealTasks(reversedTasks as unknown as EncryptedTaskItem[]);
    return decryptedTasks.map(snapshot);
  }

  return reversedTasks.map(snapshot);
}

export async function getTask(id: string, repository: TaskRepository = new InMemoryTaskRepository()): Promise<TaskItem | null> {
  const task = await repository.findById(id);
  if (!task) return null;

  // Decrypt if encryption is enabled
  if (isEncryptionEnabled()) {
    const decryptedTask = await unsealTask(task as unknown as EncryptedTaskItem);
    return snapshot(decryptedTask);
  }

  return snapshot(task);
}

export async function createTask(input: CreateTaskInput, repository: TaskRepository = new InMemoryTaskRepository()): Promise<TaskItem> {
  const taskInput: Omit<TaskItem, 'id'> = {
    title: normalizeTaskTitle(input.title),
    completed: input.completed ?? false,
    archived: false,
    dueDate: validateDueDate(input.dueDate),
    priority: validatePriority(input.priority),
    tags: validateTags(input.tags),
  };

  // Encrypt before storage if encryption is enabled
  let taskToCreate = taskInput;
  if (isEncryptionEnabled()) {
    const taskWithId: TaskItem = {
      id: generateUUID(),
      ...taskInput,
    };
    const encryptedTask = await sealTask(taskWithId);
    // EncryptedTask has encryptedTitle/encryptedTags instead of title/tags, but repository expects title/tags
    // We need to pass the encrypted task as unknown to satisfy the type system
    taskToCreate = encryptedTask as unknown as Omit<TaskItem, 'id'>;
  }

  const created = await repository.create(taskToCreate);

  // Decrypt if encryption is enabled
  if (isEncryptionEnabled()) {
    const decryptedTask = await unsealTask(created as unknown as EncryptedTaskItem);
    return snapshot(decryptedTask);
  }

  return snapshot(created);
}

export async function updateTaskCompletion(id: string, input: UpdateTaskCompletionInput, repository: TaskRepository = new InMemoryTaskRepository()): Promise<TaskItem> {
  if (!isNonEmptyString(id)) {
    throw new TaskError('Invalid task id', 'validation_error', ['id must be a non-empty string']);
  }

  const existingTask = await repository.findById(id);

  if (!existingTask) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  const updated = await repository.update(id, { completed: input.completed });

  if (!updated) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  // Decrypt if encryption is enabled
  if (isEncryptionEnabled()) {
    const decryptedTask = await unsealTask(updated as unknown as EncryptedTaskItem);
    return snapshot(decryptedTask);
  }

  return snapshot(updated);
}

export async function updateTask(id: string, input: UpdateTaskInput, repository: TaskRepository = new InMemoryTaskRepository()): Promise<TaskItem> {
  if (!isNonEmptyString(id)) {
    throw new TaskError('Invalid task id', 'validation_error', ['id must be a non-empty string']);
  }

  const existingTask = await repository.findById(id);

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

  // If encryption is enabled and we're updating title/tags, we need to re-encrypt
  if (isEncryptionEnabled() && (input.title !== undefined || input.tags !== undefined)) {
    // Get the existing task with decrypted values
    const decryptedExisting = await unsealTask(existingTask as unknown as EncryptedTaskItem);
    
    // Build the full task with updates
    const updatedTask: TaskItem = {
      ...decryptedExisting,
      ...updates,
    };

    // Re-encrypt the entire task
    const encryptedTask = await sealTask(updatedTask);
    
    // Update with encrypted data
    const updated = await repository.update(id, encryptedTask as unknown as Partial<TaskItem>);

    if (!updated) {
      throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
        `No task exists for id "${id}"`,
      ]);
    }

    // Decrypt the result
    const decryptedTask = await unsealTask(updated as unknown as EncryptedTaskItem);
    return snapshot(decryptedTask);
  }

  const updated = await repository.update(id, updates);

  if (!updated) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  // Decrypt if encryption is enabled
  if (isEncryptionEnabled()) {
    const decryptedTask = await unsealTask(updated as unknown as EncryptedTaskItem);
    return snapshot(decryptedTask);
  }

  return snapshot(updated);
}

export async function archiveTask(id: string, input: ArchiveTaskInput, repository: TaskRepository = new InMemoryTaskRepository()): Promise<TaskItem> {
  if (!isNonEmptyString(id)) {
    throw new TaskError('Invalid task id', 'validation_error', ['id must be a non-empty string']);
  }

  const existingTask = await repository.findById(id);

  if (!existingTask) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  const updated = await repository.update(id, { archived: input.archived });

  if (!updated) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  // Decrypt if encryption is enabled
  if (isEncryptionEnabled()) {
    const decryptedTask = await unsealTask(updated as unknown as EncryptedTaskItem);
    return snapshot(decryptedTask);
  }

  return snapshot(updated);
}

export async function deleteTask(id: string, repository: TaskRepository = new InMemoryTaskRepository()): Promise<void> {
  if (!isNonEmptyString(id)) {
    throw new TaskError('Invalid task id', 'validation_error', ['id must be a non-empty string']);
  }

  const existingTask = await repository.findById(id);

  if (!existingTask) {
    throw new TaskError(`Task "${id}" was not found`, 'not_found_error', [
      `No task exists for id "${id}"`,
    ]);
  }

  await repository.delete(id);
}

export type TaskFilter = 'all' | 'active' | 'completed' | 'archived';

export async function filterTasks(filter: TaskFilter, repository: TaskRepository = new InMemoryTaskRepository()): Promise<TaskItem[]> {
  let tasks: TaskItem[];

  // Use database-specific filtering if available
  if (repository.findWhere) {
    switch (filter) {
      case 'active':
        tasks = await repository.findWhere({ completed: false, archived: false });
        break;
      case 'completed':
        tasks = await repository.findWhere({ completed: true, archived: false });
        break;
      case 'archived':
        tasks = await repository.findWhere({ archived: true });
        break;
      case 'all':
      default:
        tasks = await repository.findWhere({ archived: false });
        break;
    }
  } else {
    // Fallback to in-memory filtering
    const allTasks = await repository.findAll();

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

  // Decrypt if encryption is enabled
  if (isEncryptionEnabled()) {
    const decryptedTasks = await unsealTasks(tasks as unknown as EncryptedTaskItem[]);
    return decryptedTasks.map(snapshot);
  }

  return tasks.map(snapshot);
}

export async function searchTasks(input: SearchTasksInput, repository: TaskRepository = new InMemoryTaskRepository()): Promise<TaskItem[]> {
  const allTasks = await listTasks(repository);
  
  return allTasks.filter((task) => {
    // Filter by blind index (exact match search for encrypted data)
    if (input.blindIndex) {
      const blindIndexMatch = task.blindIndex === input.blindIndex;
      if (!blindIndexMatch) {
        return false;
      }
    }
    
    // Fallback to plaintext query for non-encrypted data (legacy support)
    if (input.query && !input.blindIndex) {
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

export async function batchComplete(input: BatchOperationInput, repository: TaskRepository = new InMemoryTaskRepository()): Promise<TaskItem[]> {
  const results: TaskItem[] = [];
  
  for (const taskId of input.taskIds) {
    try {
      const updated = await updateTaskCompletion(taskId, { completed: true }, repository);
      results.push(updated);
    } catch (_error) {
      // Continue with other tasks even if one fails
      // In a production system, we might want to collect errors
    }
  }
  
  return results;
}

export async function batchArchive(input: BatchOperationInput, repository: TaskRepository = new InMemoryTaskRepository()): Promise<TaskItem[]> {
  const results: TaskItem[] = [];
  
  for (const taskId of input.taskIds) {
    try {
      const updated = await archiveTask(taskId, { archived: true }, repository);
      results.push(updated);
    } catch (_error) {
      // Continue with other tasks even if one fails
    }
  }
  
  return results;
}
