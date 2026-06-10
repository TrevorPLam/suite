# PgBouncer Integration Guide

This guide covers PgBouncer setup, configuration, and best practices for the Suite monorepo's PostgreSQL connection pooling needs.

## Overview

PgBouncer is a lightweight connection pooler for PostgreSQL that sits between applications and the database server. It multiplexes thousands of application connections onto a small pool of real PostgreSQL server connections, reducing connection overhead without application code changes.

### Why PgBouncer?

- **Connection overhead reduction**: Each PostgreSQL connection consumes ~10MB of RAM and spawns a dedicated process. At 500 connections, that's 5GB of RAM just on connection overhead.
- **Scalability**: PgBouncer can handle thousands of client connections while maintaining a small pool of server connections.
- **Performance**: Reduces connection establishment time and database server load.
- **Multi-tenancy support**: Works well with tenant-isolated database schemas.

## Installation

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install pgbouncer
```

### RHEL/CentOS/Rocky Linux

```bash
sudo yum install pgbouncer
# or
sudo dnf install pgbouncer
```

### Docker

```bash
docker run -d \
  --name pgbouncer \
  -p 6432:6432 \
  -v /path/to/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini:ro \
  -v /path/to/userlist.txt:/etc/pgbouncer/userlist.txt:ro \
  edoburu/pgbouncer:latest
```

## Pool Modes

PgBouncer supports three pool modes, each with different trade-offs:

### Session Pooling (Default)

Server connection is assigned to a client for the entire duration of the client connection. When the client disconnects, the server connection is returned to the pool.

**Pros:**
- Supports all PostgreSQL features
- No compatibility issues
- Best for applications with long-lived connections

**Cons:**
- Less efficient connection reuse
- Higher memory usage per client

**Use when:**
- Application uses session-specific features (LISTEN/NOTIFY, prepared statements with transaction pooling limitations)
- Compatibility is critical

### Transaction Pooling (Recommended for Suite)

Server connection is assigned to a client only during a transaction. When the transaction ends, the server connection is returned to the pool.

**Pros:**
- Maximum connection reuse
- Best for stateless applications
- Ideal for multi-tenant workloads

**Cons:**
- Does not support all PostgreSQL features:
  - LISTEN/NOTIFY
  - Prepared statements with names
  - Advisory locks
  - Temporary tables
  - Some transaction-level operations

**Use when:**
- Application is stateless (HTTP APIs, Workers)
- High concurrency needed
- Suite's Cloudflare Workers architecture

### Statement Pooling

Server connection is returned to the pool immediately after each query completes.

**Pros:**
- Maximum connection efficiency
- Lowest memory footprint

**Cons:**
- Most restrictive mode
- Multi-statement transactions not supported
- Not recommended for most applications

**Use when:**
- Very specific read-only workloads
- When transaction pooling has compatibility issues

## Configuration

### Basic pgbouncer.ini Structure

```ini
[databases]
# Database connections
suite = host=db.example.com port=5432 dbname=suite pool_size=20 pool_mode=transaction

[pgbouncer]
# Listen address and port
listen_addr = 0.0.0.0
listen_port = 6432

# Pool mode (can be overridden per database)
pool_mode = transaction

# Connection limits
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

# Timeouts
server_idle_timeout = 600
client_idle_timeout = 0
query_wait_timeout = 120
server_lifetime = 3600

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
log_stats = 1

# Admin console
admin_users = postgres
stats_users = stats_user
```

### Connection Pool Sizing

#### Formula

The maximum number of effective server connections PostgreSQL can service concurrently is constrained by CPU and I/O capacity, not RAM.

```bash
# Effective server connections formula
# num_cores: physical CPU cores on the PostgreSQL server
# effective_spindle_count: number of independent I/O spindles (1 for SSD/NVMe, disk count for HDD RAID)
max_server_connections = (num_cores * 2) + effective_spindle_count

# Example: 4-core server with NVMe SSD
# max_server_connections = (4 * 2) + 1 = 9
# Round up to 10; add reserve_pool_size of 2 → default_pool_size = 10

# Example: 8-core server with NVMe SSD
# max_server_connections = (8 * 2) + 1 = 17
# Round up to 20; reserve_pool_size = 5 → default_pool_size = 20
```

#### Validation

Monitor `cl_waiting` in PgBouncer stats:

```sql
SHOW POOLS;
```

If `cl_waiting` is consistently above zero, increase `default_pool_size` incrementally.

#### Reserve Pool

The `reserve_pool_size` setting creates a buffer of additional connections above `default_pool_size` that PgBouncer can draw on when the main pool is exhausted. This absorbs short traffic bursts without forcing clients to queue.

Set it to roughly 25% of `default_pool_size`:
- `default_pool_size=20` with `reserve_pool_size=5` gives you 25 total connections available during spikes

### Timeout Settings

```ini
[pgbouncer]
# How long (seconds) PgBouncer keeps an idle server connection open before closing it
# Prevents stale connections after PostgreSQL restarts or firewall drops
server_idle_timeout = 600

# How long (seconds) to allow a client connection to sit idle (no queries sent)
# Helps reclaim connections from application threads that opened a connection and stalled
# Set to 0 to disable (recommended for stateless APIs)
client_idle_timeout = 0

# How long (seconds) to wait for a server connection to become available
# If a client waits longer than this for a pool connection, it receives an error
query_wait_timeout = 120

# Maximum lifetime of a server connection — recycles connections to prevent memory bloat
server_lifetime = 3600
```

### Authentication

PgBouncer supports multiple authentication methods:

#### MD5 Authentication (Simple)

```ini
[pgbouncer]
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
```

Create `userlist.txt`:
```
"username" "md5hashedpassword"
```

Generate MD5 hash:
```bash
echo -n "usernamepassword" | md5sum
```

#### Dynamic Authentication with auth_query

Recommended for production with user management:

```ini
[pgbouncer]
auth_type = any
auth_user = pgbouncer_auth
auth_query = SELECT usename, passwd FROM pg_shadow WHERE usename = $1
auth_dbname = postgres
```

Create the auth user in PostgreSQL:
```sql
CREATE USER pgbouncer_auth WITH PASSWORD 'secure_password';
GRANT pg_read_all_settings TO pgbouncer_auth;
```

### TLS/SSL Configuration

#### Client-Side TLS (Applications to PgBouncer)

```ini
[pgbouncer]
client_tls_sslmode = require
client_tls_key_file = /etc/pgbouncer/server.key
client_tls_cert_file = /etc/pgbouncer/server.crt
client_tls_ca_file = /etc/pgbouncer/ca.crt
client_tls_protocols = secure
client_tls_ciphers = HIGH:!aNULL
```

#### Server-Side TLS (PgBouncer to PostgreSQL)

```ini
[databases]
suite = host=db.example.com port=5432 dbname=suite sslmode=require

[pgbouncer]
server_tls_sslmode = require
server_tls_ca_file = /etc/pgbouncer/ca.crt
```

## Suite-Specific Configuration

### For Node.js Applications (PostgresDatabase)

The Suite's `PostgresDatabase` class uses `postgres.js` with connection pooling. When using PgBouncer:

1. **Set application pool size to 1**: PgBouncer handles pooling, so the application pool should be minimal.

```typescript
// In database-factory.ts or application config
const config = {
  max: 1, // PgBouncer handles pooling
  idle_timeout: 10,
  connect_timeout: 10000,
};
```

2. **Connect to PgBouncer instead of PostgreSQL directly**:

```typescript
const connectionString = 'postgres://user:password@pgbouncer:6432/suite';
```

3. **Use transaction pooling mode**: Suite's stateless API architecture is ideal for transaction pooling.

### For Cloudflare Workers (WorkerDatabase)

The Suite's `WorkerDatabase` uses Hyperdrive for connection pooling. Hyperdrive already provides connection pooling for Workers, so PgBouncer is **not needed** for the Workers API layer.

However, PgBouncer is still recommended for:
- Direct database access from Node.js services
- Migration scripts
- Admin tools
- Background jobs

## Monitoring

### Admin Console

Connect to PgBouncer admin console:
```bash
psql -h localhost -p 6432 -U postgres pgbouncer
```

### Key Commands

```sql
-- Show pool statistics
SHOW POOLS;

-- Show database statistics
SHOW STATS;

-- Show client connections
SHOW CLIENTS;

-- Show server connections
SHOW SERVERS;

-- Show list of databases
SHOW DATABASES;

-- Show list of users
SHOW USERS;

-- Reload configuration
RELOAD;

-- Pause new client connections
PAUSE;

-- Resume accepting connections
RESUME;
```

### Key Metrics to Monitor

- **cl_waiting**: Number of clients waiting for a server connection. Consistently >0 indicates pool exhaustion.
- **sv_active**: Number of active server connections.
- **sv_idle**: Number of idle server connections.
- **sv_used**: Number of server connections used.
- **sv_tested**: Number of server connections currently being tested.
- **maxwait**: How long the oldest client has been waiting for a connection.

### Prometheus Exporter

Use the [pgbouncer_exporter](https://github.com/prometheus-community/pgbouncer_exporter) for Prometheus monitoring:

```bash
docker run -d \
  --name pgbouncer_exporter \
  -p 9127:9127 \
  -e PGBOUNCER_URI="postgres://postgres:password@pgbouncer:6432/pgbouncer" \
  prometheuscommunity/pgbouncer-exporter
```

### Alerting Rules

```yaml
groups:
  - name: pgbouncer
    rules:
      - alert: PgBouncerPoolExhaustion
        expr: pgbouncer_pools_cl_waiting > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PgBouncer pool exhaustion on {{ $labels.database }}"
          description: "Clients are waiting for connections for 5 minutes. Consider increasing pool_size."

      - alert: PgBouncerHighLatency
        expr: pgbouncer_pools_maxwait_seconds > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PgBouncer high connection wait time"
          description: "Clients waiting {{ $value }}s for connections on {{ $labels.database }}."
```

## High Availability

### HAProxy Configuration for PgBouncer

```haproxy
frontend pgbouncer-in
  bind *:6432
  mode tcp
  default_backend pgbouncer-backend

backend pgbouncer-backend
  mode tcp
  balance roundrobin
  option tcp-check
  tcp-check connect
  tcp-check send PING\r\n
  tcp-check expect string PONG
  server pgbouncer1 pgbouncer1:6432 check
  server pgbouncer2 pgbouncer2:6432 check
  server pgbouncer3 pgbouncer3:6432 check
```

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

PGBOUNCER_HOST="localhost"
PGBOUNCER_PORT="6432"
PGBOUNCER_USER="postgres"

# Check if PgBouncer is responding
if ! psql -h "$PGBOUNCER_HOST" -p "$PGBOUNCER_PORT" -U "$PGBOUNCER_USER" pgbouncer -c "SHOW POOLS;" > /dev/null 2>&1; then
  echo "PgBouncer health check failed"
  exit 1
fi

# Check if any clients are waiting
WAITING=$(psql -h "$PGBOUNCER_HOST" -p "$PGBOUNCER_PORT" -U "$PGBOUNCER_USER" pgbouncer -t -c "SELECT SUM(cl_waiting) FROM SHOW POOLS;" | tr -d ' ')

if [ "$WAITING" -gt 10 ]; then
  echo "PgBouncer pool exhaustion: $WAITING clients waiting"
  exit 1
fi

echo "PgBouncer health check passed"
exit 0
```

## Troubleshooting

### Connection Refused Errors

**Symptoms**: Application cannot connect to PgBouncer.

**Solutions**:
1. Check PgBouncer is running: `systemctl status pgbouncer`
2. Check firewall rules allow port 6432
3. Verify `listen_addr` and `listen_port` in `pgbouncer.ini`
4. Check PgBouncer logs: `tail -f /var/log/pgbouncer/pgbouncer.log`

### Authentication Failures

**Symptoms**: "authentication failed" errors in logs.

**Solutions**:
1. Verify `auth_file` path is correct
2. Check userlist.txt format: `"username" "md5hash"`
3. Ensure PostgreSQL user exists and password matches
4. For `auth_query`, verify the query returns correct results

### Pool Exhaustion

**Symptoms**: High `cl_waiting` values, connection timeouts.

**Solutions**:
1. Increase `default_pool_size` based on the formula
2. Add `reserve_pool_size` for burst traffic
3. Check for connection leaks in application code
4. Reduce `client_idle_timeout` to reclaim idle connections faster

### Memory Issues

**Symptoms**: PgBouncer consuming excessive memory.

**Solutions**:
1. Reduce `max_client_conn`
2. Reduce `default_pool_size`
3. Enable `server_lifetime` to recycle connections
4. Check for connection leaks

## Multi-Tenant Configuration

### Database Routing Pattern

For multi-tenant setups with separate databases per tenant:

```ini
[databases]
tenant1 = host=db.example.com port=5432 dbname=tenant1 pool_size=10 pool_mode=transaction
tenant2 = host=db.example.com port=5432 dbname=tenant2 pool_size=10 pool_mode=transaction
tenant3 = host=db.example.com port=5432 dbname=tenant3 pool_size=10 pool_mode=transaction
```

### Schema-Based Multi-Tenancy

For schema-based multi-tenancy (Suite's approach):

```ini
[databases]
suite = host=db.example.com port=5432 dbname=suite pool_size=20 pool_mode=transaction
```

The application handles tenant isolation via RLS policies and schema prefixes, not via separate databases.

## Production Checklist

Before deploying PgBouncer to production:

- [ ] Pool mode selected based on application needs (transaction pooling recommended for Suite)
- [ ] Pool size calculated using the formula: `(num_cores * 2) + effective_spindle_count`
- [ ] Reserve pool configured to 25% of default pool size
- [ ] Timeouts configured appropriately for workload
- [ ] Authentication method selected and configured
- [ ] TLS/SSL enabled for both client and server connections
- [ ] Logging enabled for connections, disconnections, and errors
- [ ] Admin console secured with admin_users
- [ ] Monitoring configured (Prometheus exporter or custom)
- [ ] Alerting rules configured for pool exhaustion and high latency
- [ ] High availability setup (HAProxy or similar) if needed
- [ ] Health check script configured
- [ ] Backup of pgbouncer.ini and userlist.txt
- [ ] Test with production-like load
- [ ] Document configuration and runbook

## References

- [PgBouncer Official Documentation](https://www.pgbouncer.org/)
- [PgBouncer Configuration Reference](https://www.pgbouncer.org/config.html)
- [PostgreSQL Connection Pooling in 2026](https://postgresqlhtx.com/postgresql-connection-pooling-in-2026-when-to-use-pgbouncer-vs-built-in-pooling/)
- [HikariCP Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
