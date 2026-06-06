import { z } from 'zod';

/**
 * Environment variable validation schema for auth package
 */
export const AuthEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),
  RATE_LIMIT_WINDOW: z.string().default('60').transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX: z.string().default('30').transform((val) => parseInt(val, 10)),
  MAX_SESSIONS: z.string().default('5').transform((val) => parseInt(val, 10)),
});

export type AuthEnv = z.infer<typeof AuthEnvSchema>;

/**
 * Validate auth environment variables
 * @throws {z.ZodError} If validation fails
 */
export function validateAuthEnv(env: Record<string, string | undefined>): AuthEnv {
  return AuthEnvSchema.parse(env);
}
