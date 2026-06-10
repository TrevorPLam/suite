# Database Observability Dashboard

This document describes the key metrics for database observability and provides a Grafana dashboard configuration for monitoring.

## Key Metrics

### Query Performance Metrics

| Metric Name | Type | Description | Alert Threshold |
|-------------|------|-------------|-----------------|
| `db_query_duration_p50` | Gauge | 50th percentile query duration | - |
| `db_query_duration_p95` | Gauge | 95th percentile query duration | >500ms for 5min |
| `db_query_duration_p99` | Gauge | 99th percentile query duration | >1s for 5min |
| `db_query_count` | Counter | Total number of queries | - |
| `db_query_count_SELECT` | Counter | SELECT query count | - |
| `db_query_count_INSERT` | Counter | INSERT query count | - |
| `db_query_count_UPDATE` | Counter | UPDATE query count | - |
| `db_query_count_DELETE` | Counter | DELETE query count | - |

### Error Metrics

| Metric Name | Type | Description | Alert Threshold |
|-------------|------|-------------|-----------------|
| `db_error_count` | Counter | Total number of errors | >10 per minute |
| `db_error_count_connection` | Counter | Connection errors | >5 per minute |
| `db_error_count_timeout` | Counter | Query timeout errors | >5 per minute |
| `db_error_count_constraint` | Counter | Constraint violation errors | >10 per minute |

### Transaction Metrics

| Metric Name | Type | Description | Alert Threshold |
|-------------|------|-------------|-----------------|
| `db_transaction_success` | Counter | Successful transactions | - |
| `db_transaction_failure` | Counter | Failed transactions | >5 per minute |

### Connection Pool Metrics

| Metric Name | Type | Description | Alert Threshold |
|-------------|------|-------------|-----------------|
| `db_pool_utilization_percent` | Gauge | Pool utilization percentage | >80% for 5min |
| `db_pool_active_connections` | Gauge | Number of active connections | - |
| `db_pool_max_connections` | Gauge | Maximum configured connections | - |

### Slow Query Metrics

| Metric Name | Type | Description | Alert Threshold |
|-------------|------|-------------|-----------------|
| `db_slow_query_count` | Counter | Number of slow queries | >10 per minute |
| `db_slow_query_threshold_ms` | Gauge | Configured slow query threshold | - |

## Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Database Observability",
    "panels": [
      {
        "title": "Query Duration (p95)",
        "targets": [
          {
            "expr": "db_query_duration_p95"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Query Duration (p99)",
        "targets": [
          {
            "expr": "db_query_duration_p99"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Query Count by Operation",
        "targets": [
          {
            "expr": "rate(db_query_count_SELECT[5m])"
          },
          {
            "expr": "rate(db_query_count_INSERT[5m])"
          },
          {
            "expr": "rate(db_query_count_UPDATE[5m])"
          },
          {
            "expr": "rate(db_query_count_DELETE[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(db_error_count[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Transaction Success Rate",
        "targets": [
          {
            "expr": "rate(db_transaction_success[5m]) / (rate(db_transaction_success[5m]) + rate(db_transaction_failure[5m]))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Connection Pool Utilization",
        "targets": [
          {
            "expr": "db_pool_utilization_percent"
          }
        ],
        "type": "gauge"
      },
      {
        "title": "Slow Query Count",
        "targets": [
          {
            "expr": "rate(db_slow_query_count[5m])"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

## Alert Thresholds

### Critical Alerts

- **p95 query duration > 500ms for 5 minutes**: Investigate slow queries, check indexes, review query plans
- **p99 query duration > 1s for 5 minutes**: Immediate investigation required, may indicate blocking or resource contention
- **Error rate > 10 per minute**: Check application logs, database logs, connection health
- **Transaction failure rate > 5 per minute**: Investigate transaction logic, deadlocks, constraint violations
- **Pool utilization > 80% for 5 minutes**: Scale pool size, investigate connection leaks, review query patterns

### Warning Alerts

- **Slow query count > 10 per minute**: Review slow query log, optimize queries, add indexes
- **Connection errors > 5 per minute**: Check network connectivity, database availability, credentials

## Metrics Export

Metrics are exported in Prometheus text format via the `exportMetrics()` function from `@suite/db/observability/metrics`.

### Example Export

```prometheus
# HELP db_query_duration_p95 95th percentile: db_query_duration
# TYPE db_query_duration_p95 gauge
db_query_duration_p95 150

# HELP db_query_duration_p99 99th percentile: db_query_duration
# TYPE db_query_duration_p99 gauge
db_query_duration_p99 450

# HELP db_query_count Count: db_query_duration
# TYPE db_query_count counter
db_query_count 1234

# HELP db_pool_utilization_percent Gauge metric: db_pool_utilization_percent
# TYPE db_pool_utilization_percent gauge
db_pool_utilization_percent 45
```

## Integration with Monitoring Systems

### Prometheus

Configure Prometheus to scrape the metrics endpoint:

```yaml
scrape_configs:
  - job_name: 'database'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Cloudflare Workers Analytics

For Cloudflare Workers deployment, consider using Workers Analytics Engine for metrics aggregation since in-memory metrics reset per invocation.

### Grafana

Import the dashboard configuration above into Grafana to visualize the metrics.

## Notes

- Metrics are stored in-memory and reset per Worker invocation. For production, consider using a metrics aggregation service.
- Query duration percentiles are calculated from samples collected during the Worker invocation.
- Connection pool active count is estimated based on configuration; postgres.js doesn't expose actual active connection count.
