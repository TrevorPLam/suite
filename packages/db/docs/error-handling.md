# Database Error Handling Strategy

This document describes the error handling strategy for the database layer, including error classification, retry logic, and circuit breaker patterns.

## Overview

The database layer implements a comprehensive error handling strategy to ensure reliability and resilience:

- **Error Classification**: Distinguishes between transient (retryable) and permanent (non-retryable) errors
- **Retry Logic**: Exponential backoff with jitter for transient errors
- **Circuit Breaker**: Prevents cascading failures by blocking requests to failing services
- **Actionable Error Codes**: Provides clear, actionable error messages for debugging

## Error Classification

### Transient Errors

Transient errors are temporary failures that may resolve with retry. These include:

- **Connection failures**: Network issues, server unavailability
- **Timeouts**: Query timeouts, connection timeouts
- **Temporary unavailability**: Service overload, maintenance windows
- **Admin shutdown**: Database server shutdown for maintenance

**PostgreSQL SQLSTATE codes for transient errors:**
- `57P01` - admin_shutdown
- `08006` - connection_failure
- `08003` - connection_does_not_exist
- `08001` - sqlclient_unable_to_establish_sqlconnection
- `08004` - server_rejected_establishment_of_sqlconnection
- `08007` - transaction_resolution_unknown
- `40001` - serialization_failure (deadlock)
- `40P01` - deadlock_detected

### Permanent Errors

Permanent errors are failures that will not resolve with retry. These include:

- **Constraint violations**: Unique key, foreign key, not null, check constraints
- **Syntax errors**: Invalid SQL syntax
- **Invalid data**: Data type mismatches, value out of range
- **Authorization errors**: Invalid credentials, insufficient permissions

**PostgreSQL SQLSTATE codes for permanent errors:**
- `23505` - unique_violation
- `23503` - foreign_key_violation
- `23502` - not_null_violation
- `23514` - check_violation
- `22001` - string_data_right_truncation
- `22003` - numeric_value_out_of_range
- `42601` - syntax_error
- `42703` - undefined_column
- `42702` - ambiguous_column
- `42701` - duplicate_column
- `42P01` - undefined_table
- `42P02` - undefined_parameter
- `42P04` - duplicate_table
- `42P06` - duplicate_schema
- `42P07` - duplicate_object
- `42P16` - invalid_table_definition
- `28000` - invalid_authorization_specification
- `28P01` - invalid_password

## Error Codes

The database layer uses the following error codes for classification:

| Error Code | Description | Retryable |
|------------|-------------|-----------|
| `DB_CONNECTION_FAILED` | Database connection failed | Yes |
| `DB_QUERY_TIMEOUT` | Query execution timeout | Yes |
| `DB_TRANSIENT_ERROR` | Generic transient error | Yes |
| `DB_CONSTRAINT_VIOLATION` | Database constraint violation | No |
| `DB_DEADLOCK_DETECTED` | Deadlock detected | No (application should retry with backoff) |
| `DB_SYNTAX_ERROR` | SQL syntax error | No |
| `DB_INVALID_DATA` | Invalid data provided | No |

## Retry Logic

### Exponential Backoff with Jitter

Transient errors are retried using exponential backoff with jitter to prevent retry storms:

- **Initial delay**: 100ms (configurable)
- **Backoff multiplier**: 2x (100ms → 200ms → 400ms → 800ms)
- **Maximum delay**: 8000ms (configurable)
- **Maximum attempts**: 3 (configurable)
- **Jitter**: ±25% random variation to prevent synchronized retries

### Retry Configuration

```typescript
import { retryWithBackoff } from '@suite/db/error-handling/retry.js';

const result = await retryWithBackoff(
  async () => {
    return await database.query('SELECT * FROM users');
  },
  {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 8000,
    jitter: true,
    shouldRetry: (error) => isTransientError(error),
    onRetry: (attempt, error, delay) => {
      console.log(`Retry attempt ${attempt} after ${delay}ms`, error);
    },
  }
);
```

### Retry Behavior

1. **First attempt**: Execute immediately
2. **On failure**: Check if error is transient
3. **If transient**: Calculate backoff delay with jitter, wait, then retry
4. **If permanent**: Fail immediately with actionable error message
5. **After max attempts**: Fail with error indicating retry exhaustion

### When to Retry

**Retry for:**
- Connection failures
- Query timeouts
- Network errors
- Temporary service unavailability

**Do not retry for:**
- Constraint violations (fix the data)
- Syntax errors (fix the query)
- Authorization errors (fix the credentials)
- Invalid data (fix the input)

## Circuit Breaker Pattern

### Purpose

The circuit breaker pattern prevents cascading failures by:

- Blocking requests to failing services
- Allowing services to recover without load
- Providing fast failure when services are down
- Automatically detecting service recovery

### States

The circuit breaker has three states:

1. **CLOSED** (Normal operation)
   - Requests pass through
   - Failures increment failure count
   - On failure threshold, transition to OPEN

2. **OPEN** (Circuit is open)
   - Requests fail immediately
   - No requests reach the service
   - After reset timeout, transition to HALF_OPEN

3. **HALF_OPEN** (Testing recovery)
   - Limited requests allowed
   - On success, decrement success count
   - On success threshold, transition to CLOSED
   - On failure, transition back to OPEN

### Configuration

```typescript
import { CircuitBreaker } from '@suite/db/error-handling/circuit-breaker.js';

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,        // Open after 5 consecutive failures
  successThreshold: 2,        // Close after 2 consecutive successes
  resetTimeoutMs: 60000,      // Wait 60s before testing recovery
  timeoutMs: 10000,          // 10s sliding window for failures
  onStateChange: (from, to) => {
    console.log(`Circuit breaker: ${from} → ${to}`);
  },
});
```

### Usage

```typescript
try {
  const result = await circuitBreaker.execute(async () => {
    return await database.query('SELECT * FROM users');
  });
  return result;
} catch (error) {
  if (error.message.includes('Circuit breaker is OPEN')) {
    // Circuit is open, use fallback or cached data
    return getCachedData();
  }
  throw error;
}
```

### State Transitions

```
CLOSED → OPEN: failureCount >= failureThreshold
OPEN → HALF_OPEN: Date.now() >= nextAttemptTime
HALF_OPEN → CLOSED: successCount >= successThreshold
HALF_OPEN → OPEN: Any failure
CLOSED → CLOSED: Success resets failureCount
```

### Monitoring

Monitor circuit breaker metrics:

- **State changes**: Track transitions between states
- **Failure count**: Current failure count in CLOSED state
- **Success count**: Current success count in HALF_OPEN state
- **Last failure time**: When the last failure occurred
- **Next attempt time**: When the next recovery attempt will be made

## Integration with Database Classes

### PostgresDatabase

```typescript
import { retryWithBackoff } from '@suite/db/error-handling/retry.js';
import { CircuitBreaker } from '@suite/db/error-handling/circuit-breaker.js';

class PostgresDatabase {
  private circuitBreaker = new CircuitBreaker();

  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    return retryWithBackoff(
      async () => {
        return this.circuitBreaker.execute(async () => {
          return this.client.query(sql, params);
        });
      },
      {
        maxAttempts: 3,
        initialDelayMs: 100,
        maxDelayMs: 8000,
      }
    );
  }
}
```

### WorkerDatabase

Same pattern as PostgresDatabase, with circuit breaker per Worker instance.

## Best Practices

### 1. Always Classify Errors

Before retrying, classify the error to determine if it's retryable:

```typescript
if (isTransientError(error)) {
  // Retry with backoff
} else {
  // Fail fast with actionable error
  throw new Error(`Permanent error: ${getDatabaseErrorCode(error)}`);
}
```

### 2. Use Circuit Breakers for External Services

Wrap calls to external services (databases, APIs) with circuit breakers to prevent cascading failures.

### 3. Monitor Error Rates

Track error rates and circuit breaker state changes to detect issues early:

- Transient error rate > 5%: Investigate network/database issues
- Circuit breaker OPEN > 30s: Investigate service health
- Permanent error rate > 1%: Investigate application logic

### 4. Provide Actionable Error Messages

Include error codes and context in error messages:

```typescript
throw new Error(
  `Database operation failed with permanent error (${errorCode}): ${error.message}`
);
```

### 5. Configure Timeouts Appropriately

- Query timeout: 5-30s depending on query complexity
- Connection timeout: 5-10s
- Circuit breaker reset timeout: 30-120s
- Retry max attempts: 3-5

### 6. Test Error Handling

Test error handling scenarios:

- Simulate transient errors (connection failures, timeouts)
- Simulate permanent errors (constraint violations, syntax errors)
- Test circuit breaker state transitions
- Test retry exhaustion

## Troubleshooting

### High Transient Error Rate

**Symptoms**: Many retries, slow response times

**Causes**:
- Network issues
- Database overload
- Connection pool exhaustion

**Solutions**:
- Check network connectivity
- Increase connection pool size
- Add database capacity
- Optimize queries

### Circuit Breaker Frequently OPEN

**Symptoms**: Requests failing immediately with "Circuit breaker is OPEN"

**Causes**:
- Service is down or unhealthy
- High failure threshold too low
- Reset timeout too short

**Solutions**:
- Check service health
- Increase failure threshold
- Increase reset timeout
- Investigate root cause of failures

### Permanent Errors

**Symptoms**: Immediate failures without retry

**Causes**:
- Data validation issues
- Schema mismatches
- Authorization problems

**Solutions**:
- Fix data validation logic
- Update schema
- Fix credentials/permissions
- Review error messages for root cause

## References

- [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
