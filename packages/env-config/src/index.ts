import { z } from 'zod';

export const calendarEnv = z.object({
  APP_NAME: z.literal('calendar'),
  API_BASE_URL: z.string().url(),
});

export const tasksEnv = z.object({
  APP_NAME: z.literal('tasks'),
  API_BASE_URL: z.string().url(),
});

export const driveEnv = z.object({
  APP_NAME: z.literal('drive'),
  API_BASE_URL: z.string().url(),
});

export function validateEnv<T extends z.ZodTypeAny>(schema: T, env: unknown): z.infer<T> {
  return schema.parse(env);
}
