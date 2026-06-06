import { z } from 'zod';

export const tasksEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be a 32-byte hex string (64 characters)').optional(),
  BETTER_AUTH_SECRET: z.string().min(32).default('dev-secret-change-in-production-32chars'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3002'),
  PORT: z.coerce.number().min(1).max(65535).default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().optional(),
}).refine((data) => {
  if (data.NODE_ENV === 'production' && !data.ENCRYPTION_KEY) {
    return false;
  }
  return true;
}, {
  message: 'ENCRYPTION_KEY is required in production',
  path: ['ENCRYPTION_KEY'],
});

export type TasksEnv = z.infer<typeof tasksEnvSchema>;

export function validateTasksEnv(): TasksEnv {
  return tasksEnvSchema.parse(process.env);
}
