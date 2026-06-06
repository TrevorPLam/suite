---
name: better-auth-integration
description: Guides integration of the shared auth package (@suite/auth/server and @suite/auth/client) for authentication, preventing custom sign-in logic implementations
---

## Better Auth Integration Guide

This skill guides integration of Better Auth for authentication across all applications, ensuring consistent auth implementation without custom sign-in logic.

## Shared Auth Package

The auth package is located at: `packages/auth/`

**Never implement custom sign-in logic.** Always import from:
- `@suite/auth/server` - Server-side auth utilities
- `@suite/auth/client` - Client-side auth utilities

## Package Structure

```
packages/auth/
├── src/
│   ├── server.ts
│   ├── client.ts
│   ├── config.ts
│   └── types.ts
├── package.json
└── tsconfig.json
```

## Server-Side Setup

### 1. Auth Configuration

```typescript
// packages/auth/src/config.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@suite/db';
import { users, sessions, accounts } from '@suite/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    schema: { users, sessions, accounts },
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
      enabled: true,
    },
  },
});
```

### 2. Server Utilities

```typescript
// packages/auth/src/server.ts
export { auth } from './config';
export type { Session, User } from 'better-auth/types';

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
```

### 3. Client Utilities

```typescript
// packages/auth/src/client.ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
```

## API Route Integration

### Create API Route Handler

```typescript
// apps/calendar/api/routes/auth.ts
import { Hono } from 'hono';
import { auth } from '@suite/auth/server';

const app = new Hono();

app.all('/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});

export default app;
```

### Mount Auth Handler

```typescript
// apps/calendar/api/index.ts
import { Hono } from 'hono';
import authRouter from './routes/auth';

const app = new Hono();

app.route('/', authRouter);

export default app;
```

## Client-Side Integration

### React Integration

```typescript
// apps/calendar/src/auth/auth-provider.tsx
import { authClient } from '@suite/auth/client';
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authClient.useSession().then(({ data }) => {
      setUser(data?.user || null);
      setLoading(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });
    if (error) throw error;
    setUser(data.user);
  };

  const signOut = async () => {
    await authClient.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### Protecting Routes

```typescript
// apps/calendar/src/components/protected-route.tsx
import { useAuth } from './auth-provider';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;

  return <>{children}</>;
}
```

## Server-Side Auth Checks

### Middleware for API Routes

```typescript
// apps/calendar/api/middleware/auth.ts
import { Hono } from 'hono';
import { requireSession } from '@suite/auth/server';

export const authMiddleware = async (c: any, next: any) => {
  try {
    const session = await requireSession(c.req.raw.headers);
    c.set('userId', session.user.id);
    c.set('organizationId', session.user.organizationId);
    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
};
```

### Apply to Routes

```typescript
// apps/calendar/api/routes/events.ts
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

const app = new Hono();

app.use('/api/events/*', authMiddleware);

app.post('/events', async (c) => {
  const userId = c.get('userId');
  // ... rest of route
});
```

## Database Schema

```typescript
// packages/db/src/schema/auth.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  organizationId: uuid('organization_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
});
```

## Environment Variables

```bash
# .env
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:8787
```

## Sign In Flow

### Client-Side

```typescript
// apps/calendar/src/pages/sign-in.tsx
import { useState } from 'react';
import { useAuth } from '../auth/auth-provider';

export function SignInPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
      // Redirect to dashboard
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Sign In</button>
    </form>
  );
}
```

## Sign Up Flow

```typescript
// apps/calendar/src/pages/sign-up.tsx
import { useState } from 'react';
import { authClient } from '@suite/auth/client';

export function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authClient.signUp.email({
        email,
        password,
        name,
      });
      // Redirect to sign in or auto sign in
    } catch (error) {
      console.error('Sign up failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Sign Up</button>
    </form>
  );
}
```

## Anti-Patterns to Avoid

### ❌ Custom Sign-In Logic

```typescript
// BAD: Custom authentication implementation
app.post('/sign-in', async (c) => {
  const { email, password } = await c.req.json();

  // Manual password comparison - DON'T DO THIS
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (user && await bcrypt.compare(password, user.passwordHash)) {
    // Manual session creation - DON'T DO THIS
    const token = jwt.sign({ userId: user.id }, SECRET);
    return c.json({ token });
  }

  return c.json({ error: 'Invalid credentials' }, 401);
});
```

### ❌ Direct Database Access for Auth

```typescript
// BAD: Direct user lookup bypasses auth package
const user = await db.query.users.findFirst({
  where: eq(users.email, email),
});
```

### ❌ Custom Session Management

```typescript
// BAD: Manual session handling
const session = await db.insert(sessions).values({
  userId: user.id,
  token: generateToken(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});
```

## Correct Pattern

```typescript
// GOOD: Use shared auth package
import { authClient } from '@suite/auth/client';

await authClient.signIn.email({
  email,
  password,
});
```

## Testing Auth

```typescript
// apps/calendar/api/routes/__tests__/auth.test.ts
import { describe, it, expect } from 'vitest';
import { testClient } from 'hono/testing';
import app from '../auth';

describe('Auth', () => {
  it('should sign up a new user', async () => {
    const client = testClient(app);

    const response = await client.auth.sign_up.email.$post({
      json: {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      },
    });

    expect(response.status).toBe(200);
  });

  it('should sign in existing user', async () => {
    const client = testClient(app);

    const response = await client.auth.sign_in.email.$post({
      json: {
        email: 'test@example.com',
        password: 'password123',
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('suite_session');
  });
});
```

## Checklist

- [ ] Auth package imported from @suite/auth/server and @suite/auth/client
- [ ] No custom sign-in logic implemented
- [ ] Auth handler mounted in API routes
- [ ] Auth middleware applied to protected routes
- [ ] Client-side auth provider configured
- [ ] Environment variables set for auth secret and URL
- [ ] Database schema includes users, sessions, accounts tables
- [ ] Sign in/sign up flows use auth client
- [ ] Session management handled by Better Auth
- [ ] Auth tests cover sign up, sign in, and protected routes

## Related Skills

- **thin-api-route-implementation**: Use auth middleware in API routes
- **spec-first-development**: Specify auth requirements in feature specs
- **domain-package-implementation**: Access user context in domain layer
