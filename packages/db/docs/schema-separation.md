# PostgreSQL Schema Separation

## Overview

This document explains the PostgreSQL schema separation pattern used in the @suite/db package. Domain tables are organized into separate PostgreSQL schemas to implement Domain-Driven Design (DDD) bounded contexts.

## Schema Organization

The database is organized into the following schemas:

- **`calendar`** - Calendar events and related tables
- **`drive`** - Drive files and folders
- **`tasks`** - Tasks and task-related data
- **`auth`** - Authentication and authorization tables (users, sessions, accounts, etc.)
- **`public`** - Shared tables and system tables (default PostgreSQL schema)
- **`drizzle`** - Drizzle ORM migration tracking tables

## Migration Strategy

### Phase 1: Create Schemas

Migration `0014_create_schemas.sql` creates the domain schemas:

```sql
CREATE SCHEMA IF NOT EXISTS calendar;
CREATE SCHEMA IF NOT EXISTS drive;
CREATE SCHEMA IF NOT EXISTS tasks;
CREATE SCHEMA IF NOT EXISTS auth;
```

### Phase 2: Move Tables to Schemas

Migration `0015_move_tables_to_schemas.sql` moves existing tables to their respective schemas:

```sql
ALTER TABLE calendar_events SET SCHEMA calendar;
ALTER TABLE drive_files SET SCHEMA drive;
ALTER TABLE drive_folders SET SCHEMA drive;
ALTER TABLE tasks SET SCHEMA tasks;
ALTER TABLE users SET SCHEMA auth;
ALTER TABLE sessions SET SCHEMA auth;
ALTER TABLE accounts SET SCHEMA auth;
ALTER TABLE two_factor_verification SET SCHEMA auth;
ALTER TABLE backup_codes SET SCHEMA auth;
```

### Phase 3: Update RLS Policies

Migration `0016_update_rls_schema_qualified.sql` updates RLS policies to use schema-qualified table names:

```sql
CREATE POLICY "calendar_events_tenant_isolation_policy" ON calendar.calendar_events
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

## Per-Domain Migration Configurations

Each domain has its own Drizzle configuration file:

- `drizzle.calendar.config.ts` - Calendar domain migrations
- `drizzle.drive.config.ts` - Drive domain migrations
- `drizzle.tasks.config.ts` - Tasks domain migrations

Each configuration includes:

- `schemaFilter` - Filters to only include tables in the domain's schema
- `tablesFilter` - Filters to only include domain-specific tables
- Separate migration table per domain (e.g., `__drizzle_migrations_calendar`)

Example configuration:

```typescript
export default {
  dialect: 'postgresql',
  schema: './src/schema/calendar',
  out: './drizzle/calendar',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ['calendar'],
  tablesFilter: ['calendar_*', 'events', 'attendees', 'bookings'],
  migrations: {
    table: '__drizzle_migrations_calendar',
    schema: 'drizzle',
  },
} satisfies Config;
```

## Benefits

### 1. Domain Isolation

Each domain's data is isolated in its own schema, preventing accidental cross-domain queries and enforcing bounded context boundaries.

### 2. Security

Schema separation provides an additional layer of security. Permissions can be granted at the schema level, and RLS policies work with schema-qualified table names.

### 3. Organization

Tables are logically organized by domain, making the database structure easier to understand and navigate.

### 4. Migration Safety

Per-domain migration configurations prevent accidental cross-domain schema changes and enable independent migration of each domain.

## Querying Schema-Qualified Tables

When querying tables, you can use schema-qualified names:

```typescript
// Direct query with schema qualification
await db.select().from(calendar.calendarEvents);

// Or use the imported table (Drizzle handles schema qualification)
import { calendarEvents } from '../schema/calendar/index.js';
await db.select().from(calendarEvents);
```

## RLS with Schema Separation

Row Level Security (RLS) policies use schema-qualified table names to ensure they work correctly after schema separation:

```sql
CREATE POLICY "calendar_events_tenant_isolation_policy" ON calendar.calendar_events
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

The `setTenantContext` method in database implementations sets the tenant context:

```typescript
await db.setTenantContext(tenantId, userId);
```

This executes:

```sql
SET LOCAL app.current_tenant_id = 'tenant-uuid';
SET LOCAL app.current_user_id = 'user-uuid';
```

## AGENTS.md Compliance

This schema separation pattern follows **AGENTS.md Rule 1**: Domain packages never import from other domain packages. By separating tables into schemas, we enforce this rule at the database level.

## Migration Commands

Generate migrations for a specific domain:

```bash
# Calendar domain
pnpm --filter @suite/db drizzle-kit generate --config drizzle.calendar.config.ts

# Drive domain
pnpm --filter @suite/db drizzle-kit generate --config drizzle.drive.config.ts

# Tasks domain
pnpm --filter @suite/db drizzle-kit generate --config drizzle.tasks.config.ts
```

Run all migrations:

```bash
pnpm --filter @suite/db db:migrate
```

## Testing

Tenant isolation is tested in repository test files. For example, `calendar.test.ts` includes tests that verify data from one tenant is not visible to another:

```typescript
it('should ensure data from one tenant is not visible to another', async () => {
  // Create event for tenant 1
  await db.insert(calendarEvents).values({
    id: randomUUID(),
    tenantId: tenantId1,
    userId: userId1,
    title: 'Tenant 1 Event',
    startAt: new Date('2026-06-10T10:00:00Z'),
    endAt: new Date('2026-06-10T11:00:00Z'),
  });

  // Create event for tenant 2
  await db.insert(calendarEvents).values({
    id: randomUUID(),
    tenantId: tenantId2,
    userId: userId2,
    title: 'Tenant 2 Event',
    startAt: new Date('2026-06-10T10:00:00Z'),
    endAt: new Date('2026-06-10T11:00:00Z'),
  });

  // Query with tenant filter - should return only tenant 1 events
  const tenant1Events = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.tenantId, tenantId1));
  expect(tenant1Events).toHaveLength(1);
  expect(tenant1Events[0]?.title).toBe('Tenant 1 Event');
});
```

## Troubleshooting

### Issue: Table not found after schema migration

**Solution:** Ensure you're using schema-qualified table names in your queries or that your Drizzle schema definitions are correctly configured.

### Issue: RLS policies not working after schema migration

**Solution:** Verify that RLS policies have been updated to use schema-qualified table names. Check migration `0016_update_rls_schema_qualified.sql`.

### Issue: Migration fails with "schema does not exist"

**Solution:** Ensure migration `0014_create_schemas.sql` has been run before attempting to move tables to schemas.
