import { z } from 'zod';

export const calendarEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be a 32-byte hex string (64 characters)').optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3001'),
  BETTER_AUTH_API_KEY: z.string().optional(),
  PORT: z.coerce.number().min(1).max(65535).default(3001),
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

export type CalendarEnv = z.infer<typeof calendarEnvSchema>;

export function validateCalendarEnv(): CalendarEnv {
  return calendarEnvSchema.parse(process.env);
}
