import { z } from 'zod';

export const driveEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be a 32-byte hex string (64 characters)').optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3003'),
  BETTER_AUTH_API_KEY: z.string().optional(),
  PORT: z.coerce.number().min(1).max(65535).default(3003),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().optional(),
  TRUSTED_ORIGINS: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
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
}).refine((data) => {
  if (data.NODE_ENV === 'production') {
    if (!data.R2_BUCKET || !data.R2_ACCESS_KEY_ID || !data.R2_SECRET_ACCESS_KEY || !data.R2_ACCOUNT_ID) {
      return false;
    }
  }
  return true;
}, {
  message: 'R2 configuration (R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID) is required in production',
  path: ['R2_BUCKET'],
});

export type DriveEnv = z.infer<typeof driveEnvSchema>;

export function validateDriveEnv(): DriveEnv {
  return driveEnvSchema.parse(process.env);
}
