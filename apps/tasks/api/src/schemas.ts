import { z } from 'zod';
import type { CreateTaskInput, UpdateTaskInput, UpdateTaskCompletionInput, ArchiveTaskInput, BatchOperationInput } from '@suite/domain-tasks';

// Schema for creating a task
export const createTaskBodySchema = z.object({
  title: z.string().min(1).transform((val: string) => val.trim()),
  completed: z.boolean().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.array(z.string().min(1)).optional(),
}).transform((data): CreateTaskInput => {
  const result: CreateTaskInput = { title: data.title };
  if (data.completed !== undefined) result.completed = data.completed;
  if (data.dueDate !== undefined) result.dueDate = data.dueDate;
  if (data.priority !== undefined) result.priority = data.priority;
  if (data.tags !== undefined) result.tags = data.tags;
  return result;
});

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;

// Schema for updating task completion
export const taskCompletionBodySchema = z.object({
  completed: z.boolean(),
}).transform((data): UpdateTaskCompletionInput => ({ completed: data.completed }));

export type TaskCompletionBody = z.infer<typeof taskCompletionBodySchema>;

// Schema for updating a task
export const updateTaskBodySchema = z.object({
  title: z.string().min(1).transform((val: string) => val.trim()).optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.array(z.string().min(1)).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
}).transform((data): UpdateTaskInput => {
  const result: UpdateTaskInput = {};
  if (data.title !== undefined) result.title = data.title;
  if (data.dueDate !== undefined) result.dueDate = data.dueDate;
  if (data.priority !== undefined) result.priority = data.priority;
  if (data.tags !== undefined) result.tags = data.tags;
  return result;
});

export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;

// Schema for archiving a task
export const archiveTaskBodySchema = z.object({
  archived: z.boolean(),
}).transform((data): ArchiveTaskInput => ({ archived: data.archived }));

export type ArchiveTaskBody = z.infer<typeof archiveTaskBodySchema>;

// Schema for batch operations
export const batchOperationBodySchema = z.object({
  taskIds: z.array(z.string().min(1)),
}).transform((data): BatchOperationInput => ({ taskIds: data.taskIds }));

export type BatchOperationBody = z.infer<typeof batchOperationBodySchema>;
