import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, twoFactor } from 'better-auth/plugins';
import { dash } from '@better-auth/infra';
import { users, sessions, accounts } from '@suite/db';
import { validateAuthEnv } from './env.js';

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface AuthEnv {
  AUTH_KV?: KVNamespace;
}

interface CreateAuthOptions {
  db: Parameters<typeof drizzleAdapter>[0] | null;
  env?: AuthEnv & Record<string, string | undefined>;
  waitUntil?: (promise: Promise<unknown>) => void;
  trustedOrigins?: string;
  betterAuthApiKey?: string;
}

export function createAuth({ db, env, waitUntil, trustedOrigins, betterAuthApiKey }: CreateAuthOptions) {
  // Validate environment variables
  const validatedEnv = validateAuthEnv(env || process.env);

  const auth = betterAuth({
    appName: 'Suite',
    secret: validatedEnv.BETTER_AUTH_SECRET,
    baseURL: validatedEnv.BETTER_AUTH_URL,
    database: db ? drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        users,
        sessions,
        accounts,
      },
    }) : undefined,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      onError: (_error) => {
        // Account enumeration protection: always return generic error message
        // This prevents attackers from determining if an email exists
        throw new Error('Invalid email or password');
      },
    },
    socialProviders: {
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      } : {}),
      ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      } : {}),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
      storeSessionInDatabase: true, // Disable cookieCache due to better-auth#4203
    },
    plugins: [
      organization(),
      twoFactor(),
      ...(betterAuthApiKey ? [dash({ apiKey: betterAuthApiKey })] : []),
    ],
    advanced: {
      cookiePrefix: 'suite',
      crossSubDomainCookies: {
        enabled: false,
      },
      trustedOrigins: trustedOrigins
        ? trustedOrigins.split(',').map((origin) => origin.trim())
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:5173'],
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip'],
      },
      trustedProxyHeaders: true,
      ...(env?.AUTH_KV ? (() => {
        const kv = env.AUTH_KV;
        return {
          secondaryStorage: {
            get: async (key: string) => {
              try {
                const value = await kv.get(key);
                return value ? JSON.parse(value) : null;
              } catch {
                return null;
              }
            },
            set: async (key: string, value: unknown, ttl: number) => {
              try {
                // KV requires minimum TTL of 60 seconds
                const effectiveTtl = Math.max(ttl, 60);
                await kv.put(key, JSON.stringify(value), {
                  expirationTtl: effectiveTtl,
                });
              } catch {
                // Silently fail if KV is unavailable
              }
            },
            delete: async (key: string) => {
              try {
                await kv.delete(key);
              } catch {
                // Silently fail if KV is unavailable
              }
            },
          },
          rateLimit: {
            customStorage: {
              get: async (key: string) => {
                try {
                  const value = await kv.get(key);
                  return value ? JSON.parse(value) : null;
                } catch {
                  return null;
                }
              },
              set: async (key: string, value: unknown, _ttl: number) => {
                try {
                  // Rate limit uses hardcoded 60-second TTL
                  await kv.put(key, JSON.stringify(value), {
                    expirationTtl: 60,
                  });
                } catch {
                  // Silently fail if KV is unavailable
                }
              },
              delete: async (key: string) => {
                try {
                  await kv.delete(key);
                } catch {
                  // Silently fail if KV is unavailable
                }
              },
            },
          },
        };
      })() : {}),
      ...(waitUntil ? (() => {
        const wu = waitUntil;
        return {
          backgroundTasks: {
            handler: (promise: Promise<unknown>) => {
              wu(promise);
            },
          },
        };
      })() : {}),
    },
  });

  return auth;
}

export async function getSession(authInstance: ReturnType<typeof createAuth>, headers: Headers) {
  return await authInstance.api.getSession({
    headers,
  });
}

export async function requireSession(authInstance: ReturnType<typeof createAuth>, headers: Headers) {
  const session = await getSession(authInstance, headers);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export type { Session, User } from 'better-auth/types';
