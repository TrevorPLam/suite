# Security Layers Documentation

This document describes the security layers implemented in the `@suite/db` package to protect against common attack vectors and ensure compliance with security best practices.

## Overview

The security layers provide defense-in-depth protection for database operations:

1. **Query Validation** - Prevents SQL injection attacks
2. **Audit Logging** - Tracks sensitive operations for compliance
3. **Rate Limiting** - Prevents abuse and ensures fair resource allocation

## Query Validation

### Purpose

Query validation prevents SQL injection attacks by detecting suspicious patterns in SQL queries and parameters before execution.

### Implementation

The query validator (`packages/db/src/security/query-validator.ts`) checks:

- **SQL injection patterns**: Comment-based injection, UNION-based injection, boolean-based injection, time-based injection, stacked queries, hex-encoded strings, conditional statements, EXEC commands
- **Query length**: Rejects queries exceeding 10,000 characters
- **Parameter validation**: Rejects object parameters, checks parameter count (max 100), validates string parameters for injection patterns

### Usage

```typescript
import { validateQueryWithParams } from '@suite/db/security/query-validator';

const validation = validateQueryWithParams(sql, params);
if (!validation.valid) {
  throw new Error(`Query validation failed: ${validation.error}`);
}
```

### Integration

Query validation is integrated into both `PostgresDatabase` and `WorkerDatabase` in the `query()` method. All database queries are validated before execution.

### Patterns Detected

The validator uses regex patterns to detect:

- Comments: `--`, `/* */`
- UNION-based injection: `UNION SELECT`
- Boolean-based injection: `OR 1=1`, `AND 1=1`
- Time-based injection: `WAITFOR DELAY`, `SLEEP(`
- Stacked queries: `; DROP`, `; DELETE`, etc.
- Hex-encoded strings: `0x[0-9a-fA-F]+`
- Conditional statements: `IF(`
- EXEC commands: `EXEC(`, `EXECUTE(`

### Anti-Patterns

- ❌ Bypassing validation for trusted queries
- ❌ Using raw SQL without validation
- ❌ Accepting user input directly in queries

## Audit Logging

### Purpose

Audit logging tracks sensitive operations for security monitoring and compliance (GDPR, SOC 2, HIPAA). All data modifications are logged with user context.

### Implementation

The audit logger (`packages/db/src/security/audit-logger.ts`) provides:

- **Event types**: USER_CREATED, USER_DELETED, PERMISSION_CHANGED, BULK_EXPORT, SCHEMA_MODIFIED, DATA_DELETED, DATA_CREATED, DATA_UPDATED
- **Event metadata**: userId, tenantId, timestamp, operation, entity, entityId, optional metadata
- **Query capabilities**: Filter by userId, tenantId, eventType, entity, date range
- **Memory management**: In-memory log with 10,000 event limit to prevent bloat

### Usage

```typescript
import { logDataCreated, logDataUpdated, logDataDeleted } from '@suite/db/security/audit-logger';

// Log data creation
logDataCreated(userId, tenantId, 'task', taskId);

// Log data update
logDataUpdated(userId, tenantId, 'task', taskId);

// Log data deletion
logDataDeleted(userId, tenantId, 'task', taskId);
```

### Integration

Audit logging is integrated into all repository create/update/delete methods:

- `PostgresCalendarEventRepository` - calendar events
- `PostgresTaskRepository` - tasks
- `PostgresDriveFileRepository` - drive files

### Event Types

| Event Type | Description | When Logged |
|------------|-------------|-------------|
| USER_CREATED | User account creation | When user is created |
| USER_DELETED | User account deletion | When user is deleted |
| PERMISSION_CHANGED | Permission modifications | When permissions change |
| BULK_EXPORT | Bulk data export | When large data exports occur |
| SCHEMA_MODIFIED | Database schema changes | When migrations run |
| DATA_DELETED | Data deletion | When entities are deleted |
| DATA_CREATED | Data creation | When entities are created |
| DATA_UPDATED | Data updates | When entities are updated |

### Production Considerations

The current implementation uses in-memory storage. For production, replace with:

- **Database table**: Store audit events in a dedicated table
- **External logging service**: Send to Datadog, Splunk, or similar
- **Cloudflare Analytics Engine**: For Workers deployments
- **SIEM integration**: For security monitoring

### Anti-Patterns

- ❌ Not logging sensitive operations
- ❌ Logging without user context
- ❌ Storing sensitive data in audit logs
- ❌ Not securing audit log access

## Rate Limiting

### Purpose

Rate limiting prevents abuse and ensures fair resource allocation across tenants using the token bucket algorithm.

### Implementation

The rate limiter (`packages/db/src/security/rate-limiter.ts`) provides:

- **Token bucket algorithm**: Configurable max requests per time window
- **Per-tenant limits**: Each tenant has independent rate limits
- **Default configuration**: 1000 requests per minute per tenant
- **Global instance**: Shared rate limiter for convenience

### Usage

```typescript
import { checkRateLimit } from '@suite/db/security/rate-limiter';

const result = checkRateLimit(tenantId);
if (!result.allowed) {
  throw new Error(`Rate limit exceeded. Reset at ${result.resetTime.toISOString()}`);
}
```

### Integration

Rate limiting is integrated into both `PostgresDatabase` and `WorkerDatabase` in the `query()` method. Rate limits are enforced per tenant when `tenantId` is provided in the query context.

### Configuration

Default configuration:
- `maxRequests`: 1000 requests
- `windowMs`: 60,000 ms (1 minute)

Custom configuration:
```typescript
import { RateLimiter } from '@suite/db/security/rate-limiter';

const limiter = new RateLimiter({
  maxRequests: 500,
  windowMs: 60_000, // 1 minute
});
```

### Token Bucket Algorithm

The token bucket algorithm works as follows:

1. Each tenant starts with `maxRequests` tokens
2. Each request consumes 1 token
3. Tokens refill based on elapsed time
4. Requests are rejected when tokens are exhausted
5. Tokens fully refill after the time window expires

### Production Considerations

The current implementation uses in-memory storage. For production, replace with:

- **Redis**: Distributed rate limiting across instances
- **Cloudflare KV**: For Workers deployments
- **Durable Objects**: For stateful rate limiting

### Anti-Patterns

- ❌ Not rate limiting per tenant
- ❌ Setting limits too low (false positives)
- ❌ Setting limits too high (no protection)
- ❌ Not providing reset time in error messages

## Security Best Practices

### 1. Defense in Depth

Use all three security layers together:
- Query validation prevents injection
- Audit logging provides accountability
- Rate limiting prevents abuse

### 2. Fail Securely

- Reject suspicious queries by default
- Log all validation failures
- Rate limit on errors to prevent enumeration

### 3. Monitor and Alert

- Monitor audit log for suspicious patterns
- Alert on rate limit violations
- Track validation failures

### 4. Regular Reviews

- Review audit logs periodically
- Update rate limits based on usage
- Add new injection patterns as discovered

## Testing

All security modules have comprehensive tests:

```bash
pnpm --filter @suite/db test:run -- security.test.ts
```

Tests cover:
- Query validation patterns
- Audit logging events and queries
- Rate limiting behavior per tenant

## Compliance

The security layers support compliance with:

- **GDPR**: Audit logging for data processing activities
- **SOC 2**: Access logging and monitoring
- **HIPAA**: Audit trails for protected health information
- **PCI DSS**: Access control and logging

## References

- [OWASP SQL Injection Prevention](https://owasp.org/www-community/attacks/SQL_Injection)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#rate-limiting)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
