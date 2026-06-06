import { z } from 'zod';

export const calendarEnvSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  PORT: z.coerce.number().min(1).max(65535).default(3002),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type CalendarEnv = z.infer<typeof calendarEnvSchema>;

export function validateCalendarEnv(): CalendarEnv {
  return calendarEnvSchema.parse(process.env);
}
