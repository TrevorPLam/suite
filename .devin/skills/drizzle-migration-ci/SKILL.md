---
name: drizzle-migration-ci
description: Guides Drizzle ORM migration setup for CI/CD pipelines, ensuring migrations run with APP_DOMAIN and never inside Workers
---

## Drizzle Migration CI/CD Guide

This skill guides Drizzle ORM migration setup for CI/CD pipelines, ensuring migrations run in CI and never inside Cloudflare Workers.

## Critical Rule

**NEVER call `migrate()` inside a Worker.** Workers cannot run migrations due to:
- No filesystem access
- Ephemeral nature
- Security concerns

**Migrations MUST run in CI/CD before Worker deployment.**

## Migration Strategy

### Codebase-First Approach

For this monorepo, use **codebase-first** approach:
- TypeScript Drizzle schema is the source of truth
- Generate SQL migration files with `drizzle-kit generate`
- Apply migrations in CI with `drizzle-kit migrate`

## Drizzle Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './packages/db/src/schema/index.ts',
  out: './packages/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## Package.json Scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## Development Workflow

### Local Development (Push)

For rapid prototyping, use `drizzle-kit push`:

```bash
pnpm db:push
```

This pushes schema changes directly to the database without migration files. **Only use for local development.**

### Production (Generate + Migrate)

For production, generate migration files and apply them:

```bash
# 1. Generate migration file
pnpm db:generate

# 2. Review the generated SQL
# 3. Commit migration file
# 4. CI will apply it
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/migrate.yml
name: Database Migrations

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          APP_DOMAIN: ${{ secrets.APP_DOMAIN }}
        run: pnpm db:migrate

      - name: Deploy Workers
        if: github.ref == 'refs/heads/main'
        run: pnpm deploy
```

### Migration Command

```bash
APP_DOMAIN=your-domain.com pnpm db:migrate
```

The `APP_DOMAIN` environment variable is required for proper tenant context in multi-tenant setups.

## Migration File Structure

```
packages/db/migrations/
├── 0001_initial_schema.sql
├── 0002_add_users_table.sql
├── 0003_add_sessions_table.sql
└── meta/
    └── journal.json
```

## Schema Example

```typescript
// packages/db/src/schema/index.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
});
```

## Generating Migrations

When you modify the schema:

```bash
pnpm db:generate
```

This creates a new migration file with SQL like:

```sql
-- packages/db/migrations/0004_add_organization_id.sql
ALTER TABLE "users" ADD COLUMN "organization_id" uuid;
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;
```

## Applying Migrations

### In CI/CD

```bash
APP_DOMAIN=your-domain.com pnpm db:migrate
```

### Manually (if needed)

```bash
APP_DOMAIN=your-domain.com pnpm db:migrate
```

## Multi-Tenant Considerations

For multi-tenant applications with Row-Level Security:

```typescript
// packages/db/src/schema/rls.ts
import { sql } from 'drizzle-orm';

// Enable RLS in migration
export const enableRLS = sql`
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON users
    FOR ALL
    USING (organization_id = current_setting('app.tenant_id')::uuid);
`;
```

## Migration Best Practices

### 1. Review Generated SQL

Always review the generated SQL before committing:

```bash
pnpm db:generate
cat packages/db/migrations/0004_latest.sql
```

### 2. Use Descriptive Names

Name migrations descriptively by editing the file name:

```bash
# Before
0004_random_name.sql

# After
0004_add_organization_id_to_users.sql
```

### 3. Backward Compatibility

Ensure migrations are backward compatible:
- Add columns as nullable first, then make non-nullable in separate migration
- Rename tables by creating new table, migrating data, then dropping old table
- Use transactions for complex migrations

### 4. Rollback Strategy

Always have a rollback plan:

```sql
-- packages/db/migrations/0004_add_organization_id_to_users.sql
-- Up
ALTER TABLE "users" ADD COLUMN "organization_id" uuid;

-- Down
ALTER TABLE "users" DROP COLUMN "organization_id";
```

## Anti-Patterns to Avoid

### ❌ Migrations in Worker

```typescript
// BAD: Running migrations in Worker
export default {
  async fetch(request: Request, env: Env) {
    // NEVER DO THIS
    await migrate(env.DB);
    // ...
  },
};
```

### ❌ Push in Production

```bash
# BAD: Using push in production
pnpm db:push
```

Only use `push` for local development. Use `generate` + `migrate` for production.

### ❌ Manual SQL in Production

```bash
# BAD: Running SQL manually
psql -f manual_changes.sql
```

Always use Drizzle migrations for schema changes.

### ❌ Skipping Migration Review

```bash
# BAD: Generating and committing without review
pnpm db:generate
git add .
git commit -m "Update schema"
```

Always review the generated SQL.

## Testing Migrations

```typescript
// packages/db/src/__tests__/migrations.test.ts
import { describe, it, expect } from 'vitest';
import { migrate } from 'drizzle-orm/postgres/migrator';
import { db } from '../client';

describe('Migrations', () => {
  it('should apply all migrations', async () => {
    await migrate(db, { migrationsFolder: './migrations' });
    // Verify schema
    const result = await db.execute(sql`SELECT * FROM users LIMIT 1`);
    expect(result).toBeDefined();
  });
});
```

## Drizzle Studio

For local development, use Drizzle Studio to inspect the database:

```bash
pnpm db:studio
```

This opens a web UI at `http://localhost:4983` to browse tables and run queries.

## Environment Variables

```bash
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/suite
APP_DOMAIN=localhost
```

For production, use secrets in CI/CD:

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  APP_DOMAIN: ${{ secrets.APP_DOMAIN }}
```

## Checklist

- [ ] Drizzle config configured with schema path
- [ ] Migration scripts added to package.json
- [ ] CI/CD pipeline runs migrations before deployment
- [ ] APP_DOMAIN environment variable set
- [ ] Migrations never run inside Workers
- [ ] Migration files reviewed before committing
- [ ] Backward compatibility considered
- [ ] Rollback strategy documented
- [ ] Local development uses push, production uses generate + migrate
- [ ] Migration tests verify schema changes

## Related Skills

- **multi-tenant-postgres-patterns**: Configure RLS policies in migrations
- **domain-package-implementation**: Update domain code after schema changes
- **spec-first-development**: Document schema changes in feature specs
