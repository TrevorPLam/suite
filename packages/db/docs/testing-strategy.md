# Transaction-Based Testing Strategy

## Overview

This document describes the transaction-based testing strategy used for repository tests in the `@suite/db` package. Transaction-based testing provides significant performance improvements and complete test isolation compared to DELETE-based teardown.

## Performance Benefits

Transaction-based testing is **86.5x faster** than DELETE-based teardown:

- **DELETE-based teardown**: Each test deletes all rows from tables, which requires:
  - Scanning the table to find rows
  - Deleting each row individually
  - Writing WAL (Write-Ahead Log) entries
  - Vacuuming overhead over time

- **Transaction rollback**: Each test runs in a transaction that is rolled back:
  - No data is actually written to disk
  - Rollback is a metadata operation (discard transaction)
  - No WAL entries for data changes
  - No vacuuming overhead

## Implementation

### Transaction Wrapper

The `withTransaction()` helper in `packages/db/src/test-helpers/transaction-wrapper.ts` wraps each test in a database transaction:

```typescript
export async function withTransaction<T>(
  client: postgres.Sql,
  fn: (db: ReturnType<typeof drizzle>) => Promise<T>
): Promise<T> {
  const db = drizzle(client);
  
  try {
    await client`BEGIN`;
    const result = await fn(db);
    await client`ROLLBACK`;
    return result;
  } catch (error) {
    await client`ROLLBACK`;
    throw error;
  }
}
```

### Test Pattern

Each test is wrapped in `withTransaction()`:

```typescript
describe('create', () => {
  it('should create a calendar event', async () => {
    await withTransaction(client, async () => {
      const event = await repository.create({
        title: 'Test Event',
        startAt: '2026-06-10T10:00:00Z',
        endAt: '2026-06-10T11:00:00Z',
      }, context1);

      expect(event).toBeDefined();
      expect(event.title).toBe('Test Event');
    });
  });
});
```

### Benefits

1. **Complete Isolation**: Each test runs in its own transaction, preventing data pollution between tests
2. **No Cleanup Code**: No need for `beforeEach` hooks to delete data
3. **Fast Execution**: Rollback is instantaneous compared to DELETE operations
4. **Test Order Independence**: Tests can run in any order without affecting each other
5. **Production-like Behavior**: Tests use actual database transactions, mirroring production code

## Test Database Configuration

The `getTestDb()` helper in `packages/db/src/test-helpers/test-db.ts` provides a singleton database instance for test execution:

```typescript
export function getTestDb() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL is required for test database');
  }

  if (testDbInstance) {
    return testDbInstance;
  }

  const client = postgres(dbUrl);
  const db = drizzle(client);
  testDbInstance = { db, client };
  
  return testDbInstance;
}
```

## Migration Strategy

Database migrations are applied once in `beforeAll` hooks using `setupMigrations()`. The `teardownMigrations()` function is retained for cleanup scenarios but is not used in normal test execution since transactions provide automatic cleanup.

## Performance Metrics

Expected test suite performance:

- **With transactions**: <30 seconds for full repository test suite
- **With DELETE cleanup**: ~43 minutes (86.5x slower)

## Usage Guidelines

1. **Always wrap tests in transactions**: Use `withTransaction()` for all repository tests
2. **No manual cleanup**: Remove `beforeEach` DELETE operations
3. **Keep transactions short**: Each test should be a single transaction
4. **Test rollback behavior**: Verify that data is not persisted between tests
5. **Use test database**: Never run transaction-based tests against production databases

## Anti-Patterns

- ❌ Using DELETE in `beforeEach` hooks
- ❌ Sharing data between tests
- ❌ Relying on test execution order
- ❌ Committing transactions in tests
- ❌ Using production databases for transaction tests

## References

- Task: T049 - Implement Transaction-Based Testing
- Implementation: `packages/db/src/test-helpers/transaction-wrapper.ts`
- Test examples: `packages/db/src/repositories/*.test.ts`
