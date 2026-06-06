---
name: multi-tenant-postgres-patterns
description: Guides PostgreSQL multi-tenancy patterns with Drizzle ORM, including tenant isolation, row-level security, and migration strategies
---

## Multi-Tenant PostgreSQL Patterns Guide

This skill guides PostgreSQL multi-tenancy implementation with Drizzle ORM, including Row-Level Security (RLS) for tenant isolation.

## Why Row-Level Security?

Most multi-tenant apps filter manually:

```typescript
// ❌ BAD: Manual filtering - error-prone
const orders = await db.select().from(ordersTable)
  .where(eq(ordersTable.organizationId, currentUser.organizationId));
```

This fails when someone:
- Forgets the where clause on a new query
- Writes raw SQL escape hatch and forgets to filter
- Adds a JOIN that fans out to data from another tenant
- Implements a sub-query that bypasses the filter

**RLS makes this structurally impossible.** The database enforces tenant isolation at the lowest level.

## How Postgres RLS Works

1. Enable RLS on a table
2. Define policies that filter rows based on session variables
3. Set the session variable on every connection
4. All queries automatically respect the policy

## Database Schema

### Tenant-Aware Tables

```typescript
// packages/db/src/schema/multi-tenant.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  customerEmail: text('customer_email').notNull(),
  totalAmount: text('total_amount').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

Every tenant-scoped table has an `organization_id` column.

## RLS Migration

### Enable RLS and Create Policies

```sql
-- packages/db/migrations/0005_enable_rls.sql

-- Enable RLS on tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policies
CREATE POLICY tenant_isolation_users ON users
  FOR ALL
  USING (organization_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation_orders ON orders
  FOR ALL
  USING (organization_id = current_setting('app.tenant_id')::uuid);

-- Allow users to see their own records (optional)
CREATE POLICY user_self_view ON users
  FOR SELECT
  USING (id = current_setting('app.user_id')::uuid);
```

## Setting Tenant Context

### Connection Pool Gotcha

With connection pooling, you must reset the session variable when a connection is returned to the pool. Otherwise, the next request might see the wrong tenant's data.

### Option A: Set Tenant Inside Transaction

```typescript
// packages/db/src/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);
export const db = drizzle(sql);

export async function withTenant<T>(
  organizationId: string,
  callback: (db: DrizzleDB) => Promise<T>
): Promise<T> {
  const client = await sql.reserve();
  try {
    // Set tenant context
    await client`SET LOCAL app.tenant_id = ${organizationId}`;
    const result = await callback(db);
    return result;
  } finally {
    // Release connection (resets session variables)
    client.release();
  }
}
```

### Option B: Reset on Release

```typescript
// packages/db/src/client.ts
const sql = postgres(process.env.DATABASE_URL!, {
  onnotice: () => {}, // Ignore notices
  idle_timeout: 20,
  max: 10,
});

sql.on('release', (client) => {
  // Reset session variables when connection is released
  client`RESET ALL`;
});
```

### Option C: PgBouncer with DISCARD ALL

If using PgBouncer, configure it to reset sessions:

```ini
# pgbouncer.ini
[databases]
suite = host=localhost port=5432 dbname=suite

[pgbouncer]
pool_mode = transaction
server_reset_query = DISCARD ALL
```

## Usage in Application

### Setting Tenant Context

```typescript
// apps/calendar/api/middleware/tenant.ts
import { withTenant } from '@suite/db/client';

export const tenantMiddleware = async (c: any, next: any) => {
  const organizationId = c.get('organizationId');

  // Set tenant context for this request
  c.set('db', (callback: any) => withTenant(organizationId, callback));

  await next();
};
```

### Using in Domain Layer

```typescript
// packages/domain-calendar/src/use-cases/create-event.ts
import { db } from '@suite/db/client';

export async function createEvent(input: CreateEventInput) {
  // Tenant context is already set by middleware
  const events = await db.insert(eventsTable).values({
    id: generateId(),
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    // organizationId is NOT needed - RLS handles it
  });

  return events;
}
```

### API Route Example

```typescript
// apps/calendar/api/routes/events.ts
import { Hono } from 'hono';
import { tenantMiddleware } from '../middleware/tenant';

const app = new Hono();

app.use('/api/*', tenantMiddleware);

app.post('/events', async (c) => {
  const db = c.get('db');
  const input = c.req.valid('json');

  // db callback automatically has tenant context
  const event = await db((db) => createEvent(input, db));

  return c.json(event);
});
```

## Bypassing RLS for Admin/System Queries

### Option 1: Separate Role with BYPASSRLS

```sql
-- Create admin role that bypasses RLS
CREATE ROLE admin_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_role;
ALTER ROLE admin_role BYPASSRLS;

-- Use admin role for system operations
SET ROLE admin_role;
-- Run queries that need to see all tenants
RESET ROLE;
```

### Option 2: Set a "Bypass" Tenant ID

```sql
-- Modify policy to allow bypass
CREATE POLICY tenant_isolation_orders ON orders
  FOR ALL
  USING (
    organization_id = current_setting('app.tenant_id')::uuid
    OR current_setting('app.tenant_id') = '00000000-0000-0000-0000-000000000000'
  );
```

## Performance Impact

RLS has minimal performance impact when:
- Policies are simple (equality checks on indexed columns)
- Session variables are set efficiently
- Connection pooling is configured correctly

**Optimizations:**
- Index `organization_id` columns
- Use `SET LOCAL` instead of `SET` for transaction-level scope
- Keep policies simple (avoid complex subqueries)

## Schema Design Rules with RLS

### 1. Every Tenant-Scoped Table Has organization_id

```typescript
// ✅ GOOD
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  // ...
});

// ❌ BAD: No organization_id
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey(),
  // ...
});
```

### 2. Foreign Keys Reference organization_id

```typescript
// ✅ GOOD
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey(),
  orderId: uuid('order_id').references(() => orders.id),
  organizationId: uuid('organization_id').notNull(),
});

// ❌ BAD: No organization_id on child table
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey(),
  orderId: uuid('order_id').references(() => orders.id),
  // Missing organization_id
});
```

### 3. Global Tables Don't Need RLS

```typescript
// ✅ GOOD: Global table (no RLS needed)
export const systemConfig = pgTable('system_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
```

## Rolling Out RLS to Existing Database

### Step 1: Add organization_id Columns

```sql
ALTER TABLE orders ADD COLUMN organization_id uuid;
ALTER TABLE orders ADD CONSTRAINT fk_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id);
```

### Step 2: Backfill Data

```sql
UPDATE orders SET organization_id = (
  SELECT organization_id FROM users WHERE users.id = orders.user_id
);
```

### Step 3: Make organization_id NOT NULL

```sql
ALTER TABLE orders ALTER COLUMN organization_id SET NOT NULL;
```

### Step 4: Enable RLS

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_orders ON orders
  FOR ALL
  USING (organization_id = current_setting('app.tenant_id')::uuid);
```

### Step 5: Update Application Code

Remove manual `organization_id` filters - RLS handles it now.

## Testing RLS

```typescript
// packages/db/src/__tests__/rls.test.ts
import { describe, it, expect } from 'vitest';
import { withTenant } from '../client';

describe('Row-Level Security', () => {
  it('should isolate data by tenant', async () => {
    // Create data for org1
    await withTenant('org-1', async (db) => {
      await db.insert(ordersTable).values({
        id: 'order-1',
        organizationId: 'org-1',
        customerEmail: 'test@example.com',
        totalAmount: '100',
      });
    });

    // Create data for org2
    await withTenant('org-2', async (db) => {
      await db.insert(ordersTable).values({
        id: 'order-2',
        organizationId: 'org-2',
        customerEmail: 'test@example.com',
        totalAmount: '200',
      });
    });

    // Query as org1 - should only see org1's data
    const org1Orders = await withTenant('org-1', async (db) => {
      return db.select().from(ordersTable);
    });

    expect(org1Orders).toHaveLength(1);
    expect(org1Orders[0].id).toBe('order-1');

    // Query as org2 - should only see org2's data
    const org2Orders = await withTenant('org-2', async (db) => {
      return db.select().from(ordersTable);
    });

    expect(org2Orders).toHaveLength(1);
    expect(org2Orders[0].id).toBe('order-2');
  });
});
```

## Drizzle Integration Helper

```typescript
// packages/db/src/rls.ts
import { sql } from 'drizzle-orm';

export function setTenantContext(organizationId: string) {
  return sql`SET LOCAL app.tenant_id = ${organizationId}`;
}

export function setUserContext(userId: string) {
  return sql`SET LOCAL app.user_id = ${userId}`;
}
```

## FAQ

### Does RLS work with prepared statements and connection pooling?

Yes, but you must reset session variables when connections are returned to the pool. Use `SET LOCAL` for transaction-level scope or configure connection pool to reset sessions.

### Can I use RLS with read replicas?

RLS works with read replicas, but you must ensure the session variable is set on the replica connection. Some read replicas don't support session variables.

### How does RLS interact with VIEWs?

Views inherit RLS policies from their base tables. You don't need to create separate policies for views.

### What about Drizzle's relational queries (db.query.users.findMany)?

Drizzle's relational queries work with RLS. The generated SQL includes the WHERE clause, and RLS adds additional filtering.

### Should I keep manual WHERE organizationId = ? clauses too?

No, once RLS is enabled, you can remove manual filters. RLS handles it at the database level, which is more secure.

## Checklist

- [ ] All tenant-scoped tables have organization_id column
- [ ] Foreign keys reference organization_id
- [ ] RLS enabled on tenant-scoped tables
- [ ] Tenant isolation policies created
- [ ] Session variable reset configured for connection pooling
- [ ] Tenant middleware sets context per request
- [ ] Manual organization_id filters removed from queries
- [ ] Admin bypass mechanism implemented
- [ ] Tests verify tenant isolation
- [ ] Performance impact measured

## Related Skills

- **drizzle-migration-ci**: Create RLS migrations in CI
- **domain-package-implementation**: Domain code doesn't need organization_id filtering
- **spec-first-development**: Specify multi-tenant requirements in feature specs
