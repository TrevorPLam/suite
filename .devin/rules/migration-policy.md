---
trigger: manual
description: Database migration policy for Cloudflare Workers and Drizzle ORM
---

# Database Migration Policy

Database migrations must run in CI, never inside Cloudflare Workers. This is critical because Workers have no filesystem access and cannot safely execute migrations.

## Migration Execution

### Correct Approach: CI-Based Migrations

Run migrations in CI/CD pipeline before Worker deployment:

```bash
# Set the domain and run migrations
APP_DOMAIN=calendar.suite.com pnpm db:migrate
```

This command:
- Connects to the database directly (not through Worker)
- Applies pending migrations using Drizzle Kit
- Runs in a controlled environment with filesystem access
- Can be rolled back if needed

### Forbidden: In-Worker Migrations

**NEVER call `migrate()` inside a Worker:**

```typescript
// ❌ FORBIDDEN - This will fail
export default {
  async fetch(request, env) {
    await migrate(env.DB); // NO! Workers have no filesystem
    return new Response('OK');
  }
};
```

## Migration Workflow

### 1. Generate Migration

```bash
# Generate migration from schema changes
pnpm db:generate
```

This creates a new SQL migration file in the migrations directory.

### 2. Review Migration

- Review the generated SQL for correctness
- Ensure it's reversible (include down migration)
- Check for data loss risks
- Test against staging database

### 3. Apply in CI

```yaml
# .github/workflows/deploy.yml
- name: Run Migrations
  run: APP_DOMAIN=${{ env.DOMAIN }} pnpm db:migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### 4. Deploy Worker

Only after migrations succeed, deploy the Worker:
```bash
pnpm deploy:workers
```

## Per-Domain Migrations

Each app/domain has its own migration set:

```bash
# Calendar migrations
APP_DOMAIN=calendar.suite.com pnpm db:migrate

# Tasks migrations
APP_DOMAIN=tasks.suite.com pnpm db:migrate

# Drive migrations
APP_DOMAIN=drive.suite.com pnpm db:migrate
```

## Drizzle Configuration

Use `drizzle.config.ts` for migration configuration:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## Migration Best Practices

Based on 2026 Drizzle ORM and Cloudflare best practices:

1. **Version control all migrations** - Never delete applied migrations
2. **Make migrations reversible** - Always include down migration
3. **Test on staging first** - Never run untested migrations on production
4. **Use transactions** - Ensure migrations are atomic
5. **Back up before major changes** - Database backup before schema changes
6. **Document breaking changes** - Add comments for non-obvious changes

## Why CI-Only Migrations?

Cloudflare Workers limitations:
- No filesystem access (required for migration files)
- Ephemeral execution environment
- Cannot guarantee single execution
- No rollback mechanism if migration fails

CI/CD advantages:
- Controlled environment with full filesystem access
- Can run before deployment (fail fast)
- Easy rollback capability
- Audit trail of migration execution
- Can run against staging/production separately

## Enforcement

- CI pipeline blocks deployment if migrations fail
- Code reviews check for `migrate()` calls in Workers
- Static analysis flags migration-related imports in Worker code
- Pre-commit hooks prevent committing migration calls to Worker files
