---
trigger: glob
globs: apps/*/api/**/*.ts, apps/*/src/**/*.ts
---

# Shared Auth Package Usage

All authentication must use the shared `@suite/auth` package. Never implement custom sign-in logic.

## Required Imports

Always import from the shared auth package:

```typescript
// Server-side
import { auth } from '@suite/auth/server';

// Client-side
import { authClient } from '@suite/auth/client';
```

## Forbidden Patterns

**NEVER implement custom authentication:**

```typescript
// ❌ FORBIDDEN - Custom auth implementation
export async function signIn(email: string, password: string) {
  // Don't implement your own password hashing
  // Don't implement your own session management
  // Don't implement your own JWT signing
}
```

## Better Auth Implementation

The shared auth package uses Better Auth, which provides:

- Database-backed session storage (sessions live in your database)
- Immediate session invalidation (delete session row to revoke)
- No hosted infrastructure or vendor dependencies
- Full code-based configuration

## Server-Side Usage

```typescript
import { auth } from '@suite/auth/server';

// Get session in API routes
const session = await auth.api.getSession(req);
if (!session) {
  return new Response('Unauthorized', { status: 401 });
}

// Session object structure
{
  session: {
    expiresAt: string;
    token: string;
    userId: string;
    id: string;
  },
  user: {
    name: string;
    email: string;
    emailVerified: boolean;
    id: string;
  }
}
```

## Client-Side Usage

```typescript
import { authClient } from '@suite/auth/client';

// Social sign-in
await authClient.signIn.social({
  provider: 'github',
  callbackURL: '/dashboard',
});

// Sign out
await authClient.signOut();
```

## Environment Variables

Required environment variables for Better Auth:

```bash
BETTER_AUTH_SECRET="<openssl rand -base64 32>"
BETTER_AUTH_URL="http://localhost:3000"
```

## Session Validation

For middleware and route protection:

```typescript
import { getSessionCookie } from '@suite/auth/cookies';

// Optimistic redirect (UX convenience only)
const sessionCookie = getSessionCookie(request);
if (!sessionCookie && protectedRoute) {
  return NextResponse.redirect(new URL('/sign-in', request.url));
}

// Actual security boundary - database call
const session = await auth.api.getSession(request);
if (!session) {
  return new Response('Unauthorized', { status: 401 });
}
```

## Benefits of Shared Auth

Based on 2026 Better Auth evaluation:

- **Full data ownership**: Sessions live in your database, not vendor infrastructure
- **Immediate invalidation**: Delete session row to revoke, no JWT expiration waiting
- **No vendor lock-in**: Complete control over auth infrastructure
- **Cost-effective**: At 100K MAU, Better Auth costs ~$25-50/month vs Clerk's ~$2,025/month
- **Privacy-first**: Aligns with zero-knowledge architecture

## Enforcement

- Code reviews check for custom auth implementations
- Static analysis flags direct password hashing or JWT signing
- Dependency checks ensure `@suite/auth` is used instead of other auth libraries
