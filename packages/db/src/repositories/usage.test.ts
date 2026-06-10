import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgresUsageRepository } from './usage.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { usage } from '../schema/usage.js';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import type { RepositoryContext } from '../index.js';
import { withTransaction } from '../test-helpers/transaction-wrapper.js';

// Skip tests if DATABASE_URL is not set
const dbUrl = process.env.DATABASE_URL;
const tenantId = randomUUID();
const userId = randomUUID();

describe.skipIf(!dbUrl)('PostgresUsageRepository', () => {
  let client: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let repository: PostgresUsageRepository;
  let context: RepositoryContext;

  beforeAll(async () => {
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required for integration tests');
    }
    client = postgres(dbUrl);
    db = drizzle(client);
    // Create a mock Database interface for testing
    const mockDb = {
      getDrizzleDb: () => db,
      query: async () => [],
      transaction: async () => {},
      close: async () => {},
      setTenantContext: async () => {},
    };
    repository = new PostgresUsageRepository(mockDb as never);
    context = {
      userId,
      tenantId,
      requestId: randomUUID(),
    };
  });

  afterAll(async () => {
    await client.end();
  });

  describe('findOrCreateUsage', () => {
    it('should return the same record on repeated calls within the same period window', async () => {
      await withTransaction(client, async () => {
        const periodStart = new Date('2026-06-10T00:00:00Z');
        const periodEnd = new Date('2026-06-10T23:59:59Z');

        // First call creates the record
        const record1 = await repository.findOrCreateUsage(userId, periodStart, periodEnd, context);
        expect(record1).toBeDefined();
        expect(record1.id).toBeDefined();
        expect(record1.requestCount).toBe(0);

        // Second call should return the same record, not create a new one
        const record2 = await repository.findOrCreateUsage(userId, periodStart, periodEnd, context);
        expect(record2.id).toBe(record1.id);
        expect(record2.requestCount).toBe(0);

        // Verify only one record exists in the database
        const allRecords = await db.select().from(usage).where(eq(usage.userId, userId));
        expect(allRecords.length).toBe(1);
      });
    });

    it('should return incremented requestCount after incrementUsage between findOrCreateUsage calls', async () => {
      await withTransaction(client, async () => {
        const periodStart = new Date('2026-06-10T00:00:00Z');
        const periodEnd = new Date('2026-06-10T23:59:59Z');

        // First call creates the record
        const record1 = await repository.findOrCreateUsage(userId, periodStart, periodEnd, context);
        expect(record1.requestCount).toBe(0);

        // Increment the usage
        await repository.incrementUsage(record1.id, context);

        // Second call should return the same record with incremented count
        const record2 = await repository.findOrCreateUsage(userId, periodStart, periodEnd, context);
        expect(record2.id).toBe(record1.id);
        expect(record2.requestCount).toBe(1);
      });
    });

    it('should create a new record when no existing record matches the period window', async () => {
      await withTransaction(client, async () => {
        const periodStart1 = new Date('2026-06-10T00:00:00Z');
        const periodEnd1 = new Date('2026-06-10T23:59:59Z');

        // Create first record
        const record1 = await repository.findOrCreateUsage(userId, periodStart1, periodEnd1, context);
        expect(record1.id).toBeDefined();

        // Create a record for a different period (next day)
        const periodStart2 = new Date('2026-06-11T00:00:00Z');
        const periodEnd2 = new Date('2026-06-11T23:59:59Z');
        const record2 = await repository.findOrCreateUsage(userId, periodStart2, periodEnd2, context);

        // Should be a different record
        expect(record2.id).not.toBe(record1.id);
        expect(record2.requestCount).toBe(0);
      });
    });
  });

  describe('incrementUsage', () => {
    it('should increment requestCount', async () => {
      await withTransaction(client, async () => {
        const periodStart = new Date('2026-06-10T00:00:00Z');
        const periodEnd = new Date('2026-06-10T23:59:59Z');

        const record = await repository.findOrCreateUsage(userId, periodStart, periodEnd, context);
        expect(record.requestCount).toBe(0);

        await repository.incrementUsage(record.id, context);

        const updated = await repository.findOrCreateUsage(userId, periodStart, periodEnd, context);
        expect(updated.requestCount).toBe(1);
      });
    });
  });
});
