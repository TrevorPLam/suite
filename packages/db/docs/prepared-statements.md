# Prepared Statements Strategy

## Overview

Prepared statements are enabled in both `PostgresDatabase` and `WorkerDatabase` to improve query performance for repeated queries. This document explains the implementation, benefits, and monitoring strategy.

## Implementation

### PostgresDatabase (Node.js)

```typescript
const config = {
  max: poolConfig?.max ?? 20,
  idle_timeout: poolConfig?.idle ?? 10,
  connect_timeout: poolConfig?.connectionTimeoutMillis ?? 10000,
  prepare: true,  // Enabled by default
};
```

### WorkerDatabase (Cloudflare Workers)

```typescript
this.pool = postgres(hyperdriveBinding.connectionString, {
  max: 1,
  prepare: true,  // Enabled by default
});
```

## Benefits

1. **Performance**: Prepared statements reduce parsing overhead for repeated queries
2. **Security**: Automatic parameter escaping prevents SQL injection
3. **Plan Caching**: PostgreSQL caches query execution plans for prepared statements
4. **Network Efficiency**: Query plan is sent once, parameters sent separately

## Monitoring

### Prepared Statement Count

Both database implementations track the number of queries executed and log when thresholds are reached:

```typescript
this.preparedStatementCount++;
setPreparedStatementCount(this.preparedStatementCount);
if (this.preparedStatementCount % PREPARED_STATEMENT_THRESHOLD === 0) {
  logQuery(`Prepared statement count: ${this.preparedStatementCount}`, 0, queryContext);
}
```

### Metrics Export

The prepared statement count is exported as a Prometheus gauge metric:

```
db_prepared_statement_count gauge
```

### Threshold

Current threshold: 1000 queries. After every 1000 queries, a log entry is created to track usage.

## Memory Considerations

### Plan Cache

PostgreSQL maintains a plan cache for prepared statements. Each cached plan consumes memory. Key considerations:

- **Cache Size**: PostgreSQL's `plan_cache_mode` controls plan caching behavior
- **Memory Bloat**: Too many unique prepared statements can cause memory bloat
- **Cache Eviction**: PostgreSQL evicts old plans when cache is full

### Monitoring Memory Usage

Monitor the following to detect memory issues:

1. `db_prepared_statement_count` metric
2. PostgreSQL `pg_prepared_statements` view
3. Connection pool memory usage

### Recommendations

- **Hot Queries**: Prepared statements work best for repeated queries with the same structure
- **Dynamic Queries**: Avoid prepared statements for highly dynamic queries (e.g., ad-hoc reporting)
- **Cache Mode**: Consider `plan_cache_mode = force_custom_plan` for queries with varying data distributions

## Plan Cache Mode

PostgreSQL supports three plan cache modes:

1. **auto** (default): PostgreSQL decides between generic and custom plans
2. **force_custom_plan**: Always use custom plans (better for varying data distributions)
3. **force_generic_plan**: Always use generic plans (better for uniform data)

### When to Use Each Mode

- **auto**: Default for most workloads
- **force_custom_plan**: When query performance varies significantly based on parameter values
- **force_generic_plan**: When data distribution is uniform and plan reuse is beneficial

## Configuration

### Disabling Prepared Statements

If needed, prepared statements can be disabled by setting `prepare: false` in the postgres.js config:

```typescript
const config = {
  prepare: false,  // Disable prepared statements
};
```

**Note**: This is not recommended for production use unless there's a specific reason (e.g., compatibility issues).

### Connection Pool Size

Prepared statements are connection-specific. Ensure connection pool size is appropriate:

- **PostgresDatabase**: Default 20 connections
- **WorkerDatabase**: Fixed at 1 connection (managed by Hyperdrive)

## Testing

Performance benchmarks are available in `postgres-database.test.ts`:

```typescript
describe('prepared statements performance', () => {
  it('should execute repeated queries efficiently', async () => {
    // Benchmark test for 100 repeated queries
  });
});
```

## Troubleshooting

### High Memory Usage

If memory usage is high:

1. Check `db_prepared_statement_count` metric
2. Query `pg_prepared_statements` view for unique statements
3. Consider reducing connection pool size
4. Enable `force_custom_plan` for problematic queries

### Performance Degradation

If performance degrades:

1. Check if plan cache is evicting frequently
2. Review query patterns for excessive dynamic SQL
3. Consider using `force_generic_plan` for uniform data
4. Monitor `db_query_duration` metrics

### Connection Errors

If connection errors occur with prepared statements:

1. Ensure connection pool is properly sized
2. Check for connection leaks (unclosed connections)
3. Verify PostgreSQL server configuration
4. Review `pg_stat_activity` for stuck connections

## Production Checklist

- [ ] Prepared statements enabled in both PostgresDatabase and WorkerDatabase
- [ ] Monitoring configured for `db_prepared_statement_count` metric
- [ ] Alert configured for high prepared statement count (>10,000)
- [ ] PostgreSQL `plan_cache_mode` configured appropriately
- [ ] Connection pool size optimized for workload
- [ ] Memory usage monitored for plan cache bloat
- [ ] Performance benchmarks run and documented
- [ ] Documentation reviewed by DBA

## References

- [PostgreSQL Prepared Statements](https://www.postgresql.org/docs/current/sql-prepare.html)
- [postgres.js Documentation](https://github.com/porsager/postgres#prepared-statements)
- [PostgreSQL Plan Cache](https://www.postgresql.org/docs/current/planner-stats.html)
