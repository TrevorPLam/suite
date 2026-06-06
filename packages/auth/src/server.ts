import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, twoFactor } from 'better-auth/plugins';
import { sso } from '@better-auth/sso';
import { dash } from '@better-auth/infra';
import { users, sessions, accounts } from '@suite/db';
import { validateAuthEnv } from './env.js';
import { logAuthEvent, createAuthEvent } from './audit-log.js';
import { generateDeviceFingerprint, detectAnomalousDevice, logDeviceAnomaly } from './device-fingerprinting.js';
import { extractGeolocationFromCF, detectLocationAnomaly, logLocationAnomaly, type GeolocationData } from './geolocation.js';
import { extractClientIP } from './ip-binding.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendPasswordResetNotificationEmail, type SendPasswordResetNotificationEmailOptions } from './email-service.js';

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

  // Type alias for Better Auth hook context
  type HookContext = {
    context?: {
      user?: { id?: string; email?: string };
      request?: { headers: { get(name: string): string | null } };
      cf?: Partial<GeolocationData>;
    };
  };

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
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    databaseHooks: {
      user: {
        delete: {
          after: async (user) => {
            // Log user deletion event for GDPR compliance
            logAuthEvent(createAuthEvent('user_deleted', {
              userId: user.id,
              email: user.email,
              metadata: {
                deletedAt: new Date().toISOString(),
              },
            }));
          },
        },
      },
      session: {
        create: {
          after: async (_session) => {
            // Store IP address in session metadata
            // Note: Better Auth doesn't provide request context in session hooks
            // IP address is stored via the ipAddress field we added to the schema
            // The actual IP will be set by the application layer after session creation
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 900, // 15 minutes (OWASP recommendation)
      revokeSessionsOnPasswordReset: true, // Revoke all sessions on password reset for security
      sendVerificationEmail: async ({ user, url, token }: { user: { id: string; email: string; name?: string }; url: string; token: string }, request?: Request) => {
        // Use waitUntil for non-blocking email sending in Workers
        if (waitUntil) {
          waitUntil(sendVerificationEmail({ user, url, token }, request));
        } else {
          // In Node.js environments, send synchronously (but don't await to prevent timing attacks)
          void sendVerificationEmail({ user, url, token }, request);
        }
      },
      sendResetPasswordEmail: async ({ user, url, token }: { user: { id: string; email: string; name?: string }; url: string; token: string }, request?: Request) => {
        // Use waitUntil for non-blocking email sending in Workers
        if (waitUntil) {
          waitUntil(sendPasswordResetEmail({ user, url, token }, request));
        } else {
          // In Node.js environments, send synchronously (but don't await to prevent timing attacks)
          void sendPasswordResetEmail({ user, url, token }, request);
        }
      },
      onPasswordReset: async ({ user }: { user: { id: string; email: string; name?: string } }, request?: Request) => {
        // Send email notification on successful password reset
        const ip = request?.headers ? extractClientIP(request.headers) : undefined;
        const userAgent = request?.headers.get('user-agent') || undefined;

        // Send notification email
        const notificationOptions: SendPasswordResetNotificationEmailOptions = { user };
        if (ip !== undefined) notificationOptions.ip = ip;
        if (userAgent !== undefined) notificationOptions.userAgent = userAgent;

        if (waitUntil) {
          waitUntil(sendPasswordResetNotificationEmail(notificationOptions));
        } else {
          void sendPasswordResetNotificationEmail(notificationOptions);
        }

        // Log password reset event for audit trail
        const context: Parameters<typeof createAuthEvent>[1] = {};
        if (user.id) context.userId = user.id;
        if (user.email) context.email = user.email;
        if (ip) context.ip = ip;
        if (userAgent) context.userAgent = userAgent;
        context.metadata = { timestamp: new Date().toISOString() };
        logAuthEvent(createAuthEvent('password_reset', context));
      },
      onError: (error: unknown) => {
        // Log failed authentication attempt
        const err = error as { email?: string; ip?: string; userAgent?: string };
        const context: Parameters<typeof createAuthEvent>[1] = {};
        if (err.email !== undefined) context.email = err.email;
        if (err.ip !== undefined) context.ip = err.ip;
        if (err.userAgent !== undefined) context.userAgent = err.userAgent;
        logAuthEvent(createAuthEvent('failed_attempt', context));

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
      sso(),
      ...(betterAuthApiKey ? [dash({ apiKey: betterAuthApiKey })] : []),
    ],
    advanced: {
      // Use __Host- prefix for production to enforce browser-level security guarantees
      // Requires: Secure attribute, no Domain attribute, Path=/ (all met by current config)
      // Falls back to 'suite' prefix in development for HTTP compatibility
      cookiePrefix: process.env.NODE_ENV === 'production' ? '__Host-suite' : 'suite',
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
      hooks: {
        after: [
          {
            matcher(context: { path: string }) {
              return context.path === '/sign-in/email';
            },
            handler: async (ctx: HookContext) => {
              // Log successful sign-in
              const user = ctx.context?.user;
              const request = ctx.context?.request;
              const cf = ctx.context?.cf;
              const ip = request?.headers ? extractClientIP(request.headers) : undefined;
              const userAgent = request?.headers.get('user-agent') || undefined;
              
              if (user && ip && userAgent && user.id) {
                // Generate device fingerprint
                const deviceFingerprint = await generateDeviceFingerprint(userAgent, ip);

                // Detect anomalous device
                const isAnomalous = await detectAnomalousDevice(user.id, deviceFingerprint, auth);
                if (isAnomalous) {
                  logDeviceAnomaly(user.id, user.email || '', deviceFingerprint, ip, userAgent);
                }

                // Extract geolocation data
                const location = cf ? extractGeolocationFromCF(cf) : {};

                // Detect location anomaly
                const isLocationAnomalous = await detectLocationAnomaly(user.id, location, auth);
                if (isLocationAnomalous) {
                  logLocationAnomaly(user.id, user.email || '', location, ip, userAgent);
                }

                // Enforce concurrent session limit
                // Note: Session limit enforcement happens after session creation in Better Auth
                // We skip enforcement here since Better Auth doesn't provide the session token in the hook context
                // This is a limitation of the current Better Auth hook system

                const context: Parameters<typeof createAuthEvent>[1] = {};
                if (user.id) context.userId = user.id;
                if (user.email) context.email = user.email;
                if (ip) context.ip = ip;
                if (userAgent) context.userAgent = userAgent;
                context.metadata = { deviceFingerprint, isAnomalous, location, isLocationAnomalous, ipAddress: ip };
                logAuthEvent(createAuthEvent('sign_in', context));
              }
            },
          },
          {
            matcher(context: { path: string }) {
              return context.path === '/sign-up/email';
            },
            handler: async (ctx: HookContext) => {
              // Log successful sign-up
              const user = ctx.context?.user;
              const request = ctx.context?.request;
              const cf = ctx.context?.cf;
              const ip = request?.headers ? extractClientIP(request.headers) : undefined;
              const userAgent = request?.headers.get('user-agent') || undefined;
              
              if (user && ip && userAgent && user.id) {
                // Generate device fingerprint
                const deviceFingerprint = await generateDeviceFingerprint(userAgent, ip);

                // First device is never anomalous for new users
                const isAnomalous = false;

                // Extract geolocation data
                const location = cf ? extractGeolocationFromCF(cf) : {};

                // First location is never anomalous for new users
                const isLocationAnomalous = false;

                const context: Parameters<typeof createAuthEvent>[1] = {};
                if (user.id) context.userId = user.id;
                if (user.email) context.email = user.email;
                if (ip) context.ip = ip;
                if (userAgent) context.userAgent = userAgent;
                context.metadata = { deviceFingerprint, isAnomalous, location, isLocationAnomalous, ipAddress: ip };
                logAuthEvent(createAuthEvent('sign_up', context));
              }
            },
          },
          {
            matcher(context: { path: string }) {
              return context.path === '/sign-out';
            },
            handler: async (ctx: HookContext) => {
              // Log sign-out
              const user = ctx.context?.user;
              const request = ctx.context?.request;
              const ip = request?.headers ? extractClientIP(request.headers) : undefined;
              const userAgent = request?.headers.get('user-agent') || undefined;
              
              if (user) {
                const context: Parameters<typeof createAuthEvent>[1] = {};
                if (user.id) context.userId = user.id;
                if (user.email) context.email = user.email;
                if (ip) context.ip = ip;
                if (userAgent) context.userAgent = userAgent;
                logAuthEvent(createAuthEvent('sign_out', context));
              }
            },
          },
        ],
      },
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
            window: validatedEnv.RATE_LIMIT_WINDOW,
            max: validatedEnv.RATE_LIMIT_MAX,
            customRules: {
              '/reset-password/email': {
                window: 900, // 15 minutes
                max: 3, // Max 3 reset requests per 15 minutes per email
              },
              '/reset-password': {
                window: 900, // 15 minutes
                max: 5, // Max 5 reset attempts per 15 minutes
              },
            },
            customStorage: {
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
                  // Use the TTL from rate limit configuration
                  await kv.put(key, JSON.stringify(value), {
                    expirationTtl: ttl,
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
