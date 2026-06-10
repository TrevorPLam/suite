import { z } from 'zod';

export const tasksEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().regex(/^[A-Za-z0-9+/]{43}=?$/, 'ENCRYPTION_KEY must be a base64-encoded 32-byte AES-256 key (output of: openssl rand -base64 32)').optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3002'),
  BETTER_AUTH_API_KEY: z.string().optional(),
  PORT: z.coerce.number().min(1).max(65535).default(3002),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().optional(),
  TRUSTED_ORIGINS: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
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

export function validateTasksEnv(env: Record<string, string | undefined> = process.env): TasksEnv {
  return tasksEnvSchema.parse(env);
}
