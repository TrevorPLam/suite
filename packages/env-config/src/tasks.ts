import { z } from 'zod';

export const tasksEnvSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  ENCRYPTION_KEY: z.string().base64().optional(),
  PORT: z.coerce.number().min(1).max(65535).default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type TasksEnv = z.infer<typeof tasksEnvSchema>;

export function validateTasksEnv(): TasksEnv {
  return tasksEnvSchema.parse(process.env);
}
