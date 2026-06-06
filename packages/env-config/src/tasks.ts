import { z } from 'zod';

export const tasksEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export type TasksEnv = z.infer<typeof tasksEnvSchema>;

export function validateTasksEnv(): TasksEnv {
  return tasksEnvSchema.parse(process.env);
}
