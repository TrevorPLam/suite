# Repository Context Pattern

## Overview

The Repository Context Pattern is a DDD (Domain-Driven Design) pattern for propagating request-scoped data through repository layers. This pattern ensures that repositories remain stateless and only depend on the Database instance, while receiving request-specific context (userId, tenantId, requestId) as parameters to each method.

## Motivation

### Problems Solved

1. **Cloudflare Workers Request-Scoped State**: Cloudflare Workers cannot store request-scoped state in global variables or repository constructors. Each request must pass its context explicitly.

2. **Dependency Injection**: Repositories should only depend on the Database instance, not on request-specific data. This enables proper DI and testability.

3. **Multi-Tenancy**: Tenant isolation requires that tenantId be passed to each repository operation to ensure proper data isolation.

4. **Transaction Support**: Context can be extended to include transaction context for operations that need to run within a transaction.

5. **Audit Tracing**: RequestId enables tracing of operations across the system for debugging and auditing.

## RepositoryContext Interface

```typescript
export interface RepositoryContext {
  /** The authenticated user ID for the current request */
  userId: string;
  
  /** The tenant/organization ID for multi-tenancy */
  tenantId: string;
  
  /** Unique request ID for tracing and logging */
  requestId: string;
}
```

## Pattern Implementation

### 1. Repository Constructor

Repositories accept only the Database instance in their constructor:

```typescript
export class PostgresCalendarEventRepository implements CalendarEventRepository {
  private db: ReturnType<Database['getDrizzleDb']>;
  private database: Database;

  constructor(db: Database) {
    this.database = db;
    this.db = db.getDrizzleDb();
  }
}
```

### 2. Context Parameter in Methods

All repository methods accept a `context: RepositoryContext` parameter:

```typescript
async findById(id: string, context: RepositoryContext): Promise<CalendarEvent | null> {
  await this.setContext(context);
  const db = this.db;
  const results = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, context.userId)))
    .limit(1);
  return results[0] ? mapToDomain(results[0]) : null;
}
```

### 3. Context Setting

Repositories use a private `setContext` method to set tenant context before each operation:

```typescript
private async setContext(context: RepositoryContext): Promise<void> {
  await this.database.setTenantContext(context.tenantId, context.userId);
}
```

### 4. Bootstrap/Middleware Integration

API middleware creates the RepositoryContext per-request and passes it to repository methods:

```typescript
// Middleware to create repositories per-request and attach to context
app.use('/api/*', async (c, next) => {
  const userId = c.get('userId') as string | undefined;
  
  if (userId) {
    const organizationId = (c.get('auth') as any)?.session?.organizationId || 'default';
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

    const repositoryContext: RepositoryContext = {
      userId,
      tenantId: organizationId,
      requestId,
    };
    c.set('repositoryContext', repositoryContext);
    
    const db = createDbClient(dbEnv);
    const repo = new PostgresCalendarEventRepository(db);
    c.set('calendarRepo', repo);
  }
  await next();
});
```

### 5. Context Validation

The `validateRepositoryContext` function ensures context values are valid:

```typescript
export function validateRepositoryContext(context: RepositoryContext): void {
  if (!context.userId || typeof context.userId !== 'string') {
    throw new Error('RepositoryContext.userId must be a non-empty string');
  }
  
  if (!context.tenantId || typeof context.tenantId !== 'string') {
    throw new Error('RepositoryContext.tenantId must be a non-empty string');
  }
  
  if (!context.requestId || typeof context.requestId !== 'string') {
    throw new Error('RepositoryContext.requestId must be a non-empty string');
  }
  
  // Validate UUID format for userId and tenantId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(context.userId)) {
    throw new Error(`RepositoryContext.userId must be a valid UUID: ${context.userId}`);
  }
  
  if (!uuidRegex.test(context.tenantId)) {
    throw new Error(`RepositoryContext.tenantId must be a valid UUID: ${context.tenantId}`);
  }
}
```

## Usage Examples

### In Domain Logic

Domain functions accept the repository and context as parameters:

```typescript
export async function listCalendarEvents(
  repository: CalendarEventRepository = new InMemoryCalendarEventRepository(), 
  context: RepositoryContext
): Promise<CalendarEvent[]> {
  const events = await repository.findAll(context);
  return sortEvents(events);
}
```

### In API Routes

API routes retrieve the repository and context from Hono context:

```typescript
app.get('/api/v1/events', async (c) => {
  const repo = c.get('calendarRepo');
  const repositoryContext = c.get('repositoryContext');

  if (!repositoryContext) {
    return c.json({ error: 'Repository context not found' }, 500);
  }

  const events = await listCalendarEvents(repo, repositoryContext);
  return c.json({ events });
});
```

### In Tests

Tests create a RepositoryContext with test values:

```typescript
const context1: RepositoryContext = {
  userId: userId1,
  tenantId: tenantId1,
  requestId: randomUUID(),
};

const event = await repository.create({
  title: 'Test Event',
  startAt: '2026-06-10T10:00:00Z',
  endAt: '2026-06-10T11:00:00Z',
}, context1);
```

## Benefits

1. **Stateless Repositories**: Repositories have no request-scoped state, making them thread-safe and reusable.

2. **Testability**: Easy to test by passing different context values without mocking global state.

3. **Cloudflare Workers Compatible**: No reliance on request-scoped globals or constructor parameters.

4. **Explicit Dependencies**: Context dependencies are explicit in method signatures.

5. **Multi-Tenancy Support**: TenantId is always available for data isolation.

6. **Audit Tracing**: RequestId enables tracing operations across the system.

## Anti-Patterns to Avoid

### ❌ userId/tenantId in Repository Constructor

```typescript
// BAD - Request-scoped data in constructor
export class BadRepository {
  constructor(db: Database, userId: string, tenantId: string) {
    this.userId = userId;
    this.tenantId = tenantId;
  }
}
```

### ❌ Global Context

```typescript
// BAD - Global context variable
let globalContext: RepositoryContext;

export class BadRepository {
  async findById(id: string) {
    return this.db.select().where(eq(userId, globalContext.userId));
  }
}
```

### ❌ Context Stored in Repository Instance

```typescript
// BAD - Context stored as instance field
export class BadRepository {
  private context: RepositoryContext;
  
  setContext(context: RepositoryContext) {
    this.context = context;
  }
  
  async findById(id: string) {
    return this.db.select().where(eq(userId, this.context.userId));
  }
}
```

## Files Involved

- `packages/db/src/repository-context.ts` - RepositoryContext interface and validation
- `packages/db/src/index.ts` - Exports RepositoryContext
- `packages/db/src/repositories/calendar.ts` - Calendar repository with context pattern
- `packages/db/src/repositories/tasks.ts` - Tasks repository with context pattern
- `packages/db/src/repositories/drive.ts` - Drive repositories with context pattern
- `packages/db/src/repositories/usage.ts` - Usage repository with context pattern
- `apps/calendar/api/src/index.ts` - Calendar API middleware creating context
- `apps/tasks/api/src/index.ts` - Tasks API middleware creating context
- `apps/drive/api/src/index.ts` - Drive API middleware creating context
- `packages/domain-calendar/src/lib/calendar-events.ts` - Domain functions accepting context
- `packages/domain-tasks/src/lib/tasks.ts` - Domain functions accepting context
- `packages/domain-drive/src/index.ts` - Domain functions accepting context
- `packages/shared-kernel/src/usage-monitor.ts` - UsageMonitor with context support

## Related Patterns

- **Dependency Injection**: Repositories receive Database via constructor
- **Unit of Work**: Context can be extended with transaction context
- **Repository Pattern**: Repositories abstract data access
- **Domain-Driven Design**: Context propagation follows DDD principles

## References

- AGENTS.md Rule 1: Domain packages never import other domain packages
- AGENTS.md Rule 7: One Durable Object per "room" (for context in DOs)
- Cloudflare Workers best practices for request-scoped state
