## 9. API Design with Hono

The Sovereign Suite’s API layer is the critical boundary between the edge and your encrypted data. Every external request—whether from your React frontend, a mobile Capacitor app, or an external webhook—first lands in a Cloudflare Worker running a Hono application. The Worker performs authentication, extracts the tenant identity, validates the request, calls the appropriate domain package, transforms the encrypted result back to the client, and emits structured logs. Hono’s unparalleled performance on the Workers platform, combined with its native support for service bindings, RPC, and Better Auth integration, makes it the natural choice for all 53 APIs in your stack.

---

### 9.1 Why Hono: Performance, Compatibility, and Type Safety

Hono is a fast, lightweight web framework that targets multiple runtimes, including Cloudflare Workers, Deno, Bun, Node.js, and edge environments. It has Express‑style routing, typed middleware, and first‑class support for the Web Fetch API.

For the Sovereign Suite, Hono’s key advantages are:

- **Pervasive TypeScript support.** Hono infers path parameters, query strings, and response types directly from your route definitions, giving you end‑to‑end type safety without code generation.
- **Identical API on Workers and Node.js.** The same Hono application can run as a Worker or as a Node.js server on your VPS with zero code changes. If you ever decide to leave Cloudflare, your API logic stays exactly the same.
- **Ultra‑low overhead.** Hono is 3–5× faster than Express in Worker environments, adding negligible latency to every request.
- **Native Cloudflare integration.** Hono works seamlessly with Workers Bindings, the `c.req.raw` API for accessing the underlying `Request`, and the `c.env` object for accessing environment variables and service bindings.

**Critical version requirement:** Hono versions prior to 4.11.7 contain a vulnerability (CVE‑2026‑24473) in the Serve Static Middleware for Cloudflare Workers that could allow attackers to read arbitrary keys from the Workers environment. **The Sovereign Suite requires Hono ≥4.11.7** for all Workers.

---

### 9.2 A Standard API Worker: The Skeleton

Every API Worker in the Sovereign Suite follows the same pattern, defined in a shared base package that all API entry points extend.

**File: `apps/calendar/api/src/index.ts`**

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { createTenantMiddleware } from '@suite/db/tenant';
import { auth } from '@suite/auth/server';
import { calendarEnv, validateEnv } from '@suite/env-config';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  DRIVE_API: Fetcher; // Service binding to Drive Worker
};

const app = new Hono<{ Bindings: Bindings }>();

// 1. Validate environment variables (fail fast at deploy time)
validateEnv(calendarEnv);

// 2. Global middleware (CORS, security headers, logging)
app.use('*', cors({ origin: (origin) => origin.endsWith('.yourdomain.com') }));
app.use('*', secureHeaders());
app.use('*', logger());

// 3. Mount Better Auth routes
app.route('/api/auth', auth.handler);

// 4. Tenant middleware (sets PostgreSQL tenant context)
app.use('/api/*', createTenantMiddleware());

// 5. Domain routes (thin, call domain-calendar package)
app.get('/api/events', async (c) => {
  const tenantId = c.get('tenantId');
  const events = await import('@suite/domain-calendar').then(m => m.getEvents(tenantId));
  return c.json(events);
});

// 6. Example: cross‑domain call to Drive via service binding
app.get('/api/events/:id/attachment', async (c) => {
  const eventId = c.req.param('id');
  const tenantId = c.get('tenantId');
  const event = await import('@suite/domain-calendar').then(m => m.getEvent(eventId, tenantId));
  // Call Drive Worker via service binding (RPC)
  const fileMetadata = await c.env.DRIVE_API.fetch(
    `http://internal/file/${event.fileId}`,
    { headers: { 'X-Tenant-Id': tenantId } }
  ).then(res => res.json());
  return c.json(fileMetadata);
});

// 7. Error handling (catch and log)
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
```

**Key observations:**

- **No business logic.** The API does nothing more than validation, authentication, tenant extraction, and orchestration. Business rules, encryption, and data access live in `packages/domain-calendar`.
- **Environment validation happens at the top.** The Worker fails at the CI stage, not at runtime, if a required environment variable is missing.
- **Service bindings are typed.** The `Bindings` type includes `DRIVE_API: Fetcher`, giving you type safety when calling the Drive Worker. The `.fetch()` method is used for HTTP‑style calls; but for true RPC (direct method calls without HTTP), you use `WorkerEntrypoint`, as described below.

---

### 9.3 RPC with Service Bindings: Type‑Safe Cross‑Worker Communication

Cloudflare Workers support a built‑in, JavaScript‑native RPC system that allows one Worker to call public methods on another Worker directly, without going through an HTTP endpoint. The RPC system is designed to feel as similar as possible to calling a JavaScript function in the same Worker.

In the Sovereign Suite, the Calendar, Drive, and Vault Workers communicate with each other exclusively via RPC service bindings. This eliminates network overhead, reduces latency, and provides type‑safe, framework‑native integration across domain boundaries.

#### 9.3.1 Exposing an RPC Service (Drive Worker Example)

**File: `apps/drive/api/src/index.ts`**

```typescript
import { WorkerEntrypoint } from 'cloudflare:workers';
import { getFile, listFiles, deleteFile } from '@suite/domain-drive';

export interface DriveRPC {
  getFile(id: string, tenantId: string): Promise<{ id: string; name: string; size: number }>;
  listFiles(tenantId: string): Promise<Array<{ id: string; name: string }>>;
  deleteFile(id: string, tenantId: string): Promise<void>;
}

export default class DriveWorker extends WorkerEntrypoint<Env> implements DriveRPC {
  async getFile(id: string, tenantId: string) {
    // Tenant middleware is automatically applied by the entrypoint
    return getFile(id, tenantId);
  }

  async listFiles(tenantId: string) {
    return listFiles(tenantId);
  }

  async deleteFile(id: string, tenantId: string) {
    return deleteFile(id, tenantId);
  }
}
```

**Configuration in `wrangler.jsonc` (Drive Worker):**

```json
{
  "name": "drive-worker",
  "main": "./src/index.ts",
  "services": [
    {
      "binding": "DRIVE_API",
      "service": "drive-worker"
    }
  ]
}
```

#### 9.3.2 Calling the RPC Service (Calendar Worker Example)

```typescript
// apps/calendar/api/src/index.ts
import { Hono } from 'hono';
import type { DriveRPC } from '@suite/drive-worker';

type Bindings = {
  DRIVE_API: DriveRPC;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/api/events/:id/attachment', async (c) => {
  const eventId = c.req.param('id');
  const tenantId = c.get('tenantId');

  const event = await import('@suite/domain-calendar').then(m => m.getEvent(eventId, tenantId));

  // Directly call the RPC method on the Drive Worker
  const fileMetadata = await c.env.DRIVE_API.getFile(event.fileId, tenantId);
  return c.json(fileMetadata);
});
```

**How the RPC system works:**

- The Drive Worker extends `WorkerEntrypoint` and implements a public interface (`DriveRPC`).
- The Calendar Worker declares a service binding to `drive-worker` in its `wrangler.jsonc`.
- The Calendar Worker calls `c.env.DRIVE_API.getFile()` as if it were a local function. The Workers runtime automatically serialises the arguments, sends them to the Drive Worker, executes the method there, and returns the result.
- The RPC system supports rich parameter and return types, including structured cloneable objects, functions, streams, and even Requests/Responses.

**Performance benefit:** RPC calls between Workers on the same Cloudflare account do not traverse the public internet. They use the internal Cloudflare network, incurring near‑zero latency and no additional request counting against your free tier quotas.

---

### 9.4 Better Auth Integration

Better Auth integrates seamlessly with Hono on Cloudflare Workers. The official Hono documentation provides a complete example: creating a Better Auth instance, wrapping it with the Drizzle adapter (for PostgreSQL), and mounting the auth handler on a Hono route.

**The pattern used in the Sovereign Suite `@suite/auth` package:**

```typescript
// packages/auth/src/server.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createDbClient } from '@suite/db';

export const auth = betterAuth({
  database: drizzleAdapter(createDbClient(process.env.DATABASE_URL!), { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! },
  },
  trustedOrigins: [(origin) => origin.endsWith('.yourdomain.com')],
});
```

**Mounting the Better Auth routes in the Hono app:**

```typescript
// apps/calendar/api/src/index.ts
import { auth } from '@suite/auth/server';

// All Better Auth routes (sign‑in, sign‑up, callback, etc.) are served under /api/auth
app.route('/api/auth', auth.handler);
```

**Client‑side usage:**

```typescript
// apps/calendar/web/src/lib/auth.ts
import { authClient } from '@suite/auth/client';
export const { signIn, signOut, useSession } = authClient;
```

The `@suite/auth/client` package exports a pre‑configured `createAuthClient` instance that points to your suite’s shared auth base URL (e.g., `https://auth.yourdomain.com`), which is the same for all 53 apps. This ensures that a user signed into Calendar is automatically signed into Drive without any additional redirects.

**CORS and `trustedOrigins`.** Better Auth uses the `trustedOrigins` configuration to determine which origins are allowed to call its endpoints. The Sovereign Suite uses a wildcard callback (`origin.endsWith('.yourdomain.com')`) to allow all subdomains, eliminating the need to list all 53 app origins individually. This is a **critical configuration** for cross‑app SSO.

---

### 9.5 API Structure Conventions

All 53 APIs in the Sovereign Suite adhere to the same conventions, making them predictable for both developers and AI agents.

| Convention | Rule | Example |
|------------|------|---------|
| **Versioning** | No version prefix in URL; changes are additive only | `/api/events` |
| **HTTP methods** | GET (read), POST (create), PUT (full update), PATCH (partial update), DELETE | `POST /api/events` |
| **Resource naming** | Plural nouns | `/api/events`, not `/api/event` |
| **Status codes** | 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthenticated), 403 (Forbidden), 404 (Not Found), 429 (Too Many Requests), 500 (Internal Server Error) | — |
| **Error responses** | `{ "error": "error_code", "message": "human‑readable description" }` | `{ "error": "event_not_found", "message": "The requested event could not be found" }` |
| **Request IDs** | Every response includes `X-Request-Id` header for tracing | Log correlation |
| **Pagination** | `?limit=20&cursor=next_token` (cursor‑based) | `GET /api/events?limit=20&cursor=abc123` |
| **Idempotency** | POST operations can accept `Idempotency-Key` header | Prevents duplicate event creation |

These conventions are not suggestions—they are enforced by ESLint rules and Nx generators that scaffold new API routes.

---

### 9.6 Middleware Stack for Every Worker

All Workers apply the same middleware chain, defined in a shared package and composed by each API entry point:

1. **CORS middleware** — `cors({ origin: (origin) => origin.endsWith('.yourdomain.com') })`. Allows only subdomains of your primary domain.
2. **Secure headers middleware** — `secureHeaders()`. Adds `X‑Content‑Type‑Options: nosniff`, `X‑Frame‑Options: DENY`, and other security headers.
3. **Logger middleware** — `logger()`. Logs method, path, status, and duration for every request.
4. **Tenant middleware** — `createTenantMiddleware()`. Extracts tenant ID from the session and sets PostgreSQL’s `app.current_tenant_id` session variable (Section 7).
5. **Auth middleware** — `authMiddleware()`. Validates the session and attaches user/tenant objects to the Hono context.

**The tenant middleware in `@suite/db/tenant`:**

```typescript
import { createMiddleware } from 'hono/factory';
import { setTenantContext } from '@suite/db';

export const createTenantMiddleware = () => createMiddleware(async (c, next) => {
  const tenantId = c.get('tenantId'); // set by auth middleware
  if (tenantId) {
    await setTenantContext(c.get('db'), tenantId);
  }
  await next();
});
```

All subsequent database queries automatically filter by `tenant_id` via RLS, eliminating the risk of cross‑tenant data leakage.

---

### 9.7 Environment Variables and Configuration

Every API Worker validates its environment variables at startup using `@suite/env-config`. The schema for each app is defined in its own Zod schema, ensuring that a Worker fails to start (and fails CI) if a required variable is missing.

**Schema for Calendar API (`packages/env-config/src/calendar.ts`):**

```typescript
import { z } from 'zod';

export const calendarEnv = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});
```

**Usage in the API entry point:**

```typescript
import { calendarEnv, validateEnv } from '@suite/env-config';
validateEnv(calendarEnv);
```

If any variable is missing or malformed, `validateEnv` throws a Zod error, the Worker fails to start, and the CI deployment is aborted.

---

### 9.8 AI Agent Rules for API Development

Add the following to your root `AGENTS.md` to ensure AI agents generate API code that conforms to the Sovereign Suite conventions:

```markdown
## API Design Rules (AI Agents Must Follow)

1. **API routes are thin.** No business logic. Call domain packages and transform results.
2. **Mount Better Auth routes at `/api/auth`.** Use `@suite/auth` for all authentication.
3. **Cross‑domain calls use RPC service bindings.** Never call another domain package directly.
4. **All routes are prefixed with `/api`.** Public endpoints must be under `/api`.
5. **Environment validation must be the first call** in the API entry point.
6. **Always include the tenant middleware** for routes that access tenant‑scoped data.
7. **Return structured errors** with `error` and `message` fields.
8. **Use the shared logger middleware** for all Workers.
9. **Every API change must update the OpenAPI spec** and regenerate API clients.
10. **Never hardcode `trustedOrigins`.** Use the wildcard callback: `(origin) => origin.endsWith('.yourdomain.com')`.
```

---

### 9.9 Summary: Why Hono Wins for the Sovereign Suite

| Requirement | Hono Feature |
|-------------|--------------|
| **Runs on Cloudflare Workers** | First‑class support, native `Fetch API`, service bindings, RPC |
| **Can fall back to Node.js** | Identical API on Workers and Node.js |
| **Type‑safe cross‑Worker calls** | `WorkerEntrypoint` + service bindings + RPC |
| **Better Auth integration** | `auth.handler` mounts all Better Auth routes |
| **Ultra‑low latency** | 3–5× faster than Express in Worker environments |
| **Structured logging, security headers** | Built‑in middleware: `logger()`, `secureHeaders()`, `cors()` |
| **Environment validation** | Hono `Bindings` type + `@suite/env-config` |
| **AI‑friendly** | Simple, declarative routing; no magic |

The API layer is the entry point to your zero‑knowledge system. Every request that reaches your Worker has already been authenticated, tenant‑scoped, and validated before it touches a domain package or database query. Hono, combined with service bindings and Better Auth, delivers this with minimal overhead, maximum type safety, and a clear path from development to production.

---

**[End of Section 9 — Next: Section 10: Real‑Time with Durable Objects]**