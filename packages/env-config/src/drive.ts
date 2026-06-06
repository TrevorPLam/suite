import { z } from 'zod';

export const driveEnvSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  ENCRYPTION_KEY: z.string().base64().optional(),
  PORT: z.coerce.number().min(1).max(65535).default(3003),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type DriveEnv = z.infer<typeof driveEnvSchema>;

export function validateDriveEnv(): DriveEnv {
  return driveEnvSchema.parse(process.env);
}
