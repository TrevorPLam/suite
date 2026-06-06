import { z } from 'zod';

export const calendarEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export type CalendarEnv = z.infer<typeof calendarEnvSchema>;

export function validateCalendarEnv(): CalendarEnv {
  return calendarEnvSchema.parse(process.env);
}
