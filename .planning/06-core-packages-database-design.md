---
title: "Database Design & Multi‑Tenancy"
section: "core-packages"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "05-core-packages-shared-packages.md"
  - "11-domain-implementation-migrations.md"
tags:
  - "database"
  - "postgresql"
  - "multi-tenancy"
  - "rls"
---

## 7. Database Design & Multi‑Tenancy

The database is the single source of truth for every user action in the Sovereign Suite. Every calendar event, every file reference, every encrypted vault entry, every message, and every authentication record ultimately lands in your self‑hosted PostgreSQL database. Getting the database design right from day one is therefore not optional—it is the foundation upon which the zero‑knowledge guarantee, the multi‑tenant isolation, and the performance of all 53 applications are built.

This section covers the core decisions: how to structure the database for your 53 apps, how to isolate tenants, how to handle migrations, how to design indexes, how to manage connections, and how to scale when you outgrow a single instance.

---

### 7.1 Core Design Philosophy

Three principles govern every database decision in the Sovereign Suite:

1. **Isolation by default.** A tenant's data must never be visible to another tenant, even if an application query forgets a `WHERE` clause. Multi‑tenancy is a system‑wide design constraint, not a database‑only concern; every read and write must resolve a tenant identity at the API boundary.

2. **Single source of truth.** All user data (encrypted) lives in one PostgreSQL instance until scale forces distribution. This simplifies backups, migrations, and debugging.

3. **Evolvable schema.** The database structure must support continuous evolution without downtime. Zero‑downtime migrations are not optional—they are required for a product that cannot afford maintenance windows.

---

### 7.2 The Multi‑Tenancy Decision Matrix

You face the same decision every multi‑tenant SaaS founder faces: how to isolate tenants in the database. The trade‑offs are well understood in 2026.

| Pattern | Isolation | Operational Cost | Migration Cost | Best For |
|---------|-----------|------------------|----------------|----------|
| **Shared schema + `tenant_id`** | Medium (Row‑level) | Lowest | One migration, runs once | Most B2B SaaS, 1,000+ tenants |
| **Schema‑per‑tenant** | High | Medium | Must run migrations on every schema; becomes bottleneck beyond 200–300 tenants | Enterprise customers, strong isolation requirements |
| **Database‑per‑tenant** | Highest | Highest | Separate backups, separate connection pools | Regulated industries, white‑label deployments |
| **Hybrid tiering** | Variable | Medium | Most complex | Large tenants isolated, small tenants shared |

For a zero‑knowledge productivity suite that must eventually serve thousands of tenants, the **shared schema with `tenant_id`** is the correct default for the vast majority of tenants. It gives you the lowest operational cost, the simplest migrations (run once for all tenants), and the most efficient resource utilisation.

However, the architecture must also support **schema‑per‑tenant or database‑per‑tenant for specific enterprise customers** who require guaranteed performance isolation, custom retention policies, or compliance with data residency regulations. This hybrid pattern is what mature platforms settle on.

---

### 7.3 Row‑Level Security (RLS): The Non‑Negotiable Guardrail

In a shared‑schema model, you cannot rely on application‑layer filtering alone. PostgreSQL Row‑Level Security (RLS) enforces isolation **at the database layer**, meaning a tenant can never see another tenant's data regardless of bugs in the application.

#### 7.3.1 The RLS Implementation Pattern

```sql
-- 1. Add tenant_id to every tenant‑scoped table
CREATE TABLE calendar.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT,
  start_at TIMESTAMPTZ,
  encrypted_blob BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on the table
ALTER TABLE calendar.events ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy that uses a session variable
CREATE POLICY tenant_isolation ON calendar.events
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- 4. Force RLS for table owners (critical!)
ALTER TABLE calendar.events FORCE ROW LEVEL SECURITY;
```

The `FORCE ROW LEVEL SECURITY` directive is **non‑negotiable**. Without it, the table owner bypasses RLS policies silently, creating a security hole that is invisible in normal operation.

#### 7.3.2 Setting the Tenant Context in Hono

At the API boundary, you extract the tenant ID from the session and set it as a PostgreSQL session variable **for the duration of the transaction**.

```typescript
// apps/calendar/api/src/middleware/tenant.ts
import { createMiddleware } from 'hono/factory';
import { getTenantIdFromSession } from '@suite/auth';

export const tenantMiddleware = createMiddleware(async (c, next) => {
  const session = c.get('session');
  const tenantId = getTenantIdFromSession(session);

  // Get a database client from the pool
  const db = c.get('db');
  const dbClient = await db.getClient();

  // CRITICAL: Set the tenant context for this transaction
  await dbClient.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);

  // Attach the scoped client to the request context
  c.set('dbClient', dbClient);

  await next();

  // Release the client back to the pool (context resets automatically)
  dbClient.release();
});
```

The use of `SET LOCAL` (not `SET`) is critical: the setting applies only to the current transaction and is automatically cleared when the client returns to the connection pool. This prevents tenant context leaking between requests—a subtle but dangerous failure mode with transaction‑mode connection poolers.

#### 7.3.3 The Performance and Debugging Trade‑Offs

RLS is not free. Production benchmarks show RLS adds **5–15% overhead on simple queries**, and the overhead increases on complex queries with joins, subqueries, and aggregations. On tables with 10 million rows across 200 tenants, some queries see **20–30% degradation** compared to tenant‑specific databases.

More significant is the debugging cognitive overhead. When a query returns no rows, you can never be sure whether the data does not exist or the RLS policy filtered it out. Every engineer on the team learns to suspect the RLS policy whenever data appears to be missing.

**Mitigations**:
- Test RLS policies with a non‑superuser role. PostgreSQL superusers bypass RLS by default, so your staging environment running as a superuser will never catch a broken policy.
- Use `FORCE ROW LEVEL SECURITY` to prevent the table owner from bypassing policies.
- Implement tenant‑specific composite indexes (see Section 7.4) to minimise the performance impact.

---

### 7.4 Indexing Strategy for Multi‑Tenant Workloads

Multi‑tenant workloads have uneven traffic distribution. Some tenants are read‑heavy, some write‑heavy, some are bursty, and others are idle. Indexing blindly will cause write performance to collapse.

**The default indexing rule for every tenant‑scoped table:**

```sql
CREATE INDEX idx_events_tenant_time ON calendar.events (tenant_id, created_at);
```

The composite index `(tenant_id, ...)` is essential because every RLS‑filtered query first filters by `tenant_id`. Without this, PostgreSQL must scan every row in the table before applying the tenant filter.

**Additional rules:**
- Periodically review unused indexes and remove them.
- Index based on actual per‑tenant query patterns, not theoretical usage.
- Consider partial indexes for tenant‑specific query patterns.
- For high‑write tenants, consider partitioning (see Section 7.8).

---

### 7.5 Connection Pooling: Your Operational Lifeline

The moment you add more tenants, your biggest enemy becomes connection count, not CPU or disk. Without a connection pooler, each API request would open a new database connection, quickly exhausting PostgreSQL's `max_connections` (default 100).

**PgBouncer in transaction‑pooling mode** is the standard solution. The critical nuance: you must use **transaction pooling**, not session pooling, to handle the tenant context switching efficiently.

**PgBouncer configuration (`/etc/pgbouncer/pgbouncer.ini`):**

```ini
[databases]
suite = host=localhost port=5432 dbname=suite

[pgbouncer]
pool_mode = transaction
default_pool_size = 20
max_client_conn = 1000
```

**Why transaction pooling?** In transaction pooling, the connection is reassigned to a different client after each transaction. Because you use `SET LOCAL` to set the tenant context **inside the transaction**, each new transaction starts with a clean session state—no risk of tenant context leaking between requests.

---

### 7.6 The `tenant_id` Lifecycle

Every tenant‑scoped table must have a `tenant_id` column. The lifecycle of this column is:

1. **Insertion:** The tenant ID is set by the application (from the authenticated session).
2. **Querying:** RLS policies automatically filter by `tenant_id`.
3. **Never updated:** The tenant ID of a row never changes. If a row must be moved to another tenant, that is a delete + insert operation.
4. **Never nullable:** `tenant_id` must be `NOT NULL` to prevent accidental cross‑tenant exposure.

**Special case: the `users` table.** Unlike other tables, `users` may have a nullable `tenant_id` because a user might belong to multiple tenants. In this case, the access pattern is different: a user has access to all rows in `users` where the user is a member, and RLS policies must handle membership via a join table (`user_tenants`).

---

### 7.7 Tooling: `@usebetterdev/tenant` Integration

To avoid reinventing the wheel, the Sovereign Suite uses `@usebetterdev/tenant`, an RLS‑based multi‑tenancy library with first‑class Hono support and Drizzle ORM integration.

**Setup in `packages/db`:**

```typescript
// packages/db/src/tenant.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { betterTenant } from '@usebetterdev/tenant';
import { drizzleDatabase } from '@usebetterdev/tenant/drizzle';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const database = drizzle(pool);

export const tenant = betterTenant({
  database: drizzleDatabase(database),
  tenantResolver: { header: 'x-tenant-id' }, // or extract from JWT
});

// Hono middleware
import { createHonoMiddleware } from '@usebetterdev/tenant/hono';
// Used in your API: app.use('*', createHonoMiddleware(tenant));
```

**Usage in route handlers:**

```typescript
// Tenant‑scoped database client (all queries automatically filtered)
const db = tenant.getDatabase();
const events = await db.select().from(eventsTable);
// ^ returns only current tenant's events — no WHERE clause needed
```

This library also provides a CLI to generate RLS policies and migrations automatically, reducing the risk of manual configuration errors.

---

### 7.8 Partitioning: Plan for It from Day One

Even if you don't use partitioning immediately, design for partitionability from the start. For the Sovereign Suite, two types of partitioning are relevant:

**Range partitioning on `created_at`** for time‑series data like events, messages, and logs. This improves query performance for time‑range queries and makes it easy to archive old data.

**List partitioning on `tenant_id`** for extremely large tenants. When a tenant grows beyond a threshold (e.g., 1 million events), you can move that tenant's data to a separate partition or even a separate database without breaking the application.

**Partitioning‑ready table definition:**

```sql
CREATE TABLE calendar.events (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- other columns
) PARTITION BY RANGE (created_at);
```

PostgreSQL's native partitioning, combined with composite indexes that include `tenant_id`, enables efficient pruning even on partitioned tables.

---

### 7.9 The Scaling Path: From One Node to Many

The Sovereign Suite starts on a single VPS with a single PostgreSQL instance. As usage grows, follow this proven scaling progression:

| Step | Trigger | Action |
|------|---------|--------|
| **1** | CPU > 70% during peak | Add read replicas for reporting queries. Writes still go to primary. |
| **2** | Table > 100 GB | Partition large tables (events, messages, logs). |
| **3** | Specific tenant consumes >30% resources | Isolate that tenant to a dedicated schema or dedicated database (hybrid tiering). |
| **4** | Tens of thousands of tenants | Shard by `tenant_id` using Citus (the last resort). |

**Citus** extends PostgreSQL with distributed tables across worker nodes while maintaining full SQL semantics. It supports over 100,000 tenants and provides tenant isolation guarantees for large tenants. However, adding Citus is a major architectural shift—PostgreSQL 17 on a well‑provisioned single node can handle thousands of tenants before you need to consider sharding.

**The key insight:** The first three steps (read replicas, partitioning, hybrid tiering) cover the overwhelming majority of platforms. Sharding is a last resort, not a first step.

---

### 7.10 Backup & Restore Must Be Tenant‑Aware

One of the hardest lessons learned from production multi‑tenant systems is that restoring "just one tenant" is surprisingly difficult. If your customers expect tenant‑level restore capabilities, design your schema to support it from day one.

**For the Sovereign Suite, this means:**
- Logical backups (`pg_dump`) are insufficient for tenant‑level restore.
- Physical backups (WAL‑G with R2) combined with point‑in‑time recovery allow restoring the entire database to a specific time, but extracting a single tenant requires manual effort.
- If tenant‑level restore becomes a customer requirement, consider moving that tenant to a dedicated schema or database (hybrid tiering) to simplify backup and restore.

For the vast majority of tenants, the answer is "we restore the entire system; individual tenant restore is not supported." This must be documented in your SLA.

---

### 7.11 Monitoring Must Be Tenant‑Centric

Without tenant‑aware monitoring, debugging performance issues is guesswork. You must be able to answer:
- "Which tenant is causing this CPU spike?"
- "Which tenant is responsible for slow queries?"
- "Which tenant exceeded storage?"

**Implementations:**
- Add tenant ID tags to all logs and metrics.
- Use `pg_stat_statements` with query‑level tracking of tenant ID via the `application_name` parameter.
- Set up per‑tenant statement timeouts to prevent noisy neighbours from degrading the entire platform.
- Use role‑based query weighting so critical writes (e.g., saving a document) take precedence over heavy reads (e.g., analytics exports).

---

### 7.12 Summary: Database Decisions for the Sovereign Suite

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Isolation model** | Shared schema + `tenant_id` + RLS | Lowest operational cost, simplest migrations, scales to thousands of tenants |
| **Hybrid tiering** | Enterprise tenants can move to dedicated schema/database | Provides performance isolation for large tenants without over‑engineering for all |
| **RLS enforcement** | `FORCE ROW LEVEL SECURITY` + `SET LOCAL` | Prevents bypass, scoped to transaction, safe with connection poolers |
| **Connection pooler** | PgBouncer in transaction mode | Handles tenant context switching efficiently, prevents connection exhaustion |
| **Indexing** | Composite `(tenant_id, …)` on every tenant‑scoped table | Makes RLS‑filtered queries efficient |
| **Partitioning** | Design for partitionability from day one; implement when tables exceed 100 GB | Enables future scaling without schema changes |
| **Scaling** | Read replicas → partitioning → hybrid tiering → Citus sharding | Follows proven progression; sharding is last resort |
| **Monitoring** | Tenant‑tagged metrics + `pg_stat_statements` | Essential for debugging noisy neighbours |

This design gives you the operational simplicity of a shared schema with the security of database‑enforced isolation. It scales from your first tenant to your thousandth without requiring a rewrite. And most importantly, it enforces the zero‑knowledge guarantee at the database layer: all user content is stored as ciphertext, and even if the database is compromised, an attacker cannot decrypt a single row without the user's keys.

---

**[End of Section 7 — Next: Section 8: Drizzle Migrations in Monorepo]**
