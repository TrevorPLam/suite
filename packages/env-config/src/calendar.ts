import { z } from 'zod';

export const calendarEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().base64().optional(),
  BETTER_AUTH_SECRET: z.string().min(32).default('dev-secret-change-in-production-32chars'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3001'),
  PORT: z.coerce.number().min(1).max(65535).default(3002),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().optional(),
});

export type CalendarEnv = z.infer<typeof calendarEnvSchema>;

export function validateCalendarEnv(): CalendarEnv {
  return calendarEnvSchema.parse(process.env);
}
