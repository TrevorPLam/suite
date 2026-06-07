# Composite Index Strategy for RLS Efficiency

## Overview

This document explains the composite index strategy implemented for multi-tenant PostgreSQL databases with Row-Level Security (RLS). Composite indexes optimize query performance for tenant-scoped operations while maintaining data isolation.

## Background

In a multi-tenant system, every query must filter by `tenant_id` to ensure data isolation. PostgreSQL RLS policies automatically add `tenant_id` filters, but without proper indexes, these filters result in full table scans. Composite indexes with `tenant_id` as the first column enable efficient index scans for all tenant-scoped queries.

## Index Design Principles

### 1. tenant_id as First Column

All composite indexes place `tenant_id` as the first column. This is critical because:

- PostgreSQL indexes are leftmost-prefix
- RLS policies always filter by `tenant_id` first
- Enables index-only scans for tenant-scoped queries
- Supports multi-tenant query planner optimization

### 2. Query Pattern Alignment

Indexes match common query patterns:

- **User-scoped queries**: `(tenant_id, user_id)` - queries filtering by tenant and user
- **Time-series queries**: `(tenant_id, created_at)` or `(tenant_id, start_at)` - date range queries within tenant
- **Encrypted search**: `(tenant_id, blind_index)` - blind index searches for encrypted data
- **Tenant lookup**: `(tenant_id)` - user enumeration within tenant

### 3. Avoiding Redundant Indexes

Single-column `tenant_id` indexes are retained for queries that only filter by tenant (e.g., user enumeration). Composite indexes do not replace these because:

- PostgreSQL cannot use a composite index for queries that only filter on the first column if the index is not declared as covering
- Single-column indexes are smaller and faster for simple tenant lookups
- Composite indexes are larger due to additional columns

## Implemented Indexes

### Calendar Schema

```sql
-- User-scoped queries: find events for a specific user within tenant
CREATE INDEX calendar_events_tenant_user_idx 
ON calendar.calendar_events (tenant_id, user_id);

-- Time-series queries: find events within date range for tenant
CREATE INDEX calendar_events_tenant_start_at_idx 
ON calendar.calendar_events (tenant_id, start_at);
```

**Query Examples:**
```sql
-- Uses calendar_events_tenant_user_idx
SELECT * FROM calendar.calendar_events 
WHERE tenant_id = 'xxx' AND user_id = 'yyy';

-- Uses calendar_events_tenant_start_at_idx
SELECT * FROM calendar.calendar_events 
WHERE tenant_id = 'xxx' 
  AND start_at >= '2026-06-01' 
  AND start_at < '2026-07-01';
```

### Drive Schema

```sql
-- User-scoped file queries
CREATE INDEX drive_files_tenant_user_idx 
ON drive.drive_files (tenant_id, user_id);

-- Encrypted search within tenant
CREATE INDEX drive_files_tenant_blind_index_idx 
ON drive.drive_files (tenant_id, blind_index);

-- User-scoped folder queries
CREATE INDEX drive_folders_tenant_user_idx 
ON drive.drive_folders (tenant_id, user_id);
```

**Query Examples:**
```sql
-- Uses drive_files_tenant_user_idx
SELECT * FROM drive.drive_files 
WHERE tenant_id = 'xxx' AND user_id = 'yyy';

-- Uses drive_files_tenant_blind_index_idx
SELECT * FROM drive.drive_files 
WHERE tenant_id = 'xxx' AND blind_index = 'hashed_search_term';
```

### Tasks Schema

```sql
-- User-scoped task queries
CREATE INDEX tasks_tenant_user_idx 
ON tasks.tasks (tenant_id, user_id);

-- Encrypted search within tenant
CREATE INDEX tasks_tenant_blind_index_idx 
ON tasks.tasks (tenant_id, blind_index);
```

**Query Examples:**
```sql
-- Uses tasks_tenant_user_idx
SELECT * FROM tasks.tasks 
WHERE tenant_id = 'xxx' AND user_id = 'yyy';

-- Uses tasks_tenant_blind_index_idx
SELECT * FROM tasks.tasks 
WHERE tenant_id = 'xxx' AND blind_index = 'hashed_search_term';
```

### Users Schema

```sql
-- Tenant user enumeration
CREATE INDEX users_tenant_id_idx 
ON auth.users (tenant_id);
```

**Query Examples:**
```sql
-- Uses users_tenant_id_idx
SELECT * FROM auth.users 
WHERE tenant_id = 'xxx';
```

## Performance Verification

### EXPLAIN ANALYZE Testing

The calendar repository test suite includes EXPLAIN ANALYZE tests to verify index usage:

```typescript
describe('composite index performance', () => {
  it('should use composite index for tenant+user queries', async () => {
    const explainResult = await client`
      EXPLAIN ANALYZE
      SELECT * FROM calendar.calendar_events
      WHERE tenant_id = ${tenantId1} AND user_id = ${userId1}
    `;
    
    // Verify index is used
    expect(explainText).toContain('Index Scan');
    expect(explainText).toContain('calendar_events_tenant_user_idx');
    
    // Verify query is fast (<100ms)
    expect(executionTime).toBeLessThan(100);
  });
});
```

### Expected Query Plan

With composite indexes, queries should show:

```
Index Scan using calendar_events_tenant_user_idx on calendar.calendar_events
  Index Cond: (tenant_id = 'xxx'::uuid)
  Filter: (user_id = 'yyy'::uuid)
```

Without composite indexes, queries would show:

```
Seq Scan on calendar.calendar_events
  Filter: ((tenant_id = 'xxx'::uuid) AND (user_id = 'yyy'::uuid))
```

## RLS Efficiency

### How RLS Uses Indexes

PostgreSQL RLS policies automatically add `tenant_id` filters:

```sql
CREATE POLICY tenant_isolation ON calendar.calendar_events
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

When a user queries without explicit tenant filter:

```sql
SELECT * FROM calendar.calendar_events WHERE user_id = 'yyy';
```

PostgreSQL rewrites it to:

```sql
SELECT * FROM calendar.calendar_events 
WHERE user_id = 'yyy' 
  AND tenant_id = current_setting('app.current_tenant_id')::uuid;
```

With `(tenant_id, user_id)` composite index, this query uses an index scan. Without it, PostgreSQL must scan all rows or use a less efficient index.

### Multi-Tenant Query Planner

PostgreSQL's query planner recognizes that `tenant_id` is highly selective (low cardinality per query, high cardinality overall). Composite indexes enable:

- **Index-only scans**: When all query columns are in the index
- **Bitmap index scans**: For complex queries with multiple conditions
- **Partial index usage**: When RLS predicates match index conditions

## Maintenance Considerations

### Index Size

Composite indexes increase storage requirements:

- Each composite index adds ~10-20 bytes per row per additional column
- Monitor index size with `pg_relation_size()`
- Consider index-only scans to reduce table access

### Write Performance

Indexes slow down INSERT/UPDATE/DELETE operations:

- Each indexed column requires index maintenance
- Composite indexes require more maintenance than single-column indexes
- Measure write performance impact with `pg_stat_statements`

### Reindexing

PostgreSQL indexes can become fragmented over time:

- Run `REINDEX CONCURRENTLY` during maintenance windows
- Monitor index bloat with `pgstatindex`
- Schedule reindexing based on usage patterns

## Future Optimizations

### Covering Indexes

For frequently queried columns, consider covering indexes (INCLUDE clause):

```sql
CREATE INDEX calendar_events_tenant_user_covering_idx 
ON calendar.calendar_events (tenant_id, user_id) 
INCLUDE (title, start_at, end_at);
```

This enables index-only scans for queries that only need these columns.

### Partial Indexes

For queries with additional filters, consider partial indexes:

```sql
CREATE INDEX calendar_events_active_tenant_user_idx 
ON calendar.calendar_events (tenant_id, user_id) 
WHERE end_at > NOW();
```

This reduces index size for common query patterns.

### BRIN Indexes

For time-series data with natural ordering, consider BRIN indexes:

```sql
CREATE INDEX calendar_events_tenant_start_at_brin_idx 
ON calendar.calendar_events USING BRIN (tenant_id, start_at);
```

BRIN indexes are smaller but less selective, suitable for large time-series tables.

## References

- PostgreSQL Index Design: https://www.postgresql.org/docs/current/indexes.html
- Multi-Tenant Patterns: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Drizzle ORM Indexes: https://orm.drizzle.team/docs/postgresql/indexes
