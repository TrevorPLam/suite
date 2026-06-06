import { z } from 'zod';

export const driveEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export type DriveEnv = z.infer<typeof driveEnvSchema>;

export function validateDriveEnv(): DriveEnv {
  return driveEnvSchema.parse(process.env);
}
