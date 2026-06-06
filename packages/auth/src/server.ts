import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '@suite/db';
import { users, sessions, accounts } from '@suite/db';

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: {
      users,
      sessions,
      accounts,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    cookiePrefix: 'suite',
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

export async function getSession(headers: Headers) {
  return await auth.api.getSession({
    headers,
  });
}

export async function requireSession(headers: Headers) {
  const session = await getSession(headers);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export type { Session, User } from 'better-auth/types';
