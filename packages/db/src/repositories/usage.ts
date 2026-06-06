import { usage } from '../schema/usage.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import type { UsageRepository, UsageRecord } from '@suite/shared-kernel';
import type { Database } from '../database.interface.js';

export class PostgresUsageRepository implements UsageRepository {
  constructor(private db: Database) {}

  async findOrCreateUsage(userId: string, periodStart: Date, periodEnd: Date): Promise<UsageRecord> {
    const drizzleDb = this.db.getDrizzleDb();
    const now = new Date();

    // Try to find existing usage record for this period
    const existingUsage = await drizzleDb
      .select()
      .from(usage)
      .where(
        and(
          eq(usage.userId, userId),
          gte(usage.periodStart, periodStart),
          lte(usage.periodEnd, now)
        )
      )
      .limit(1);

    if (existingUsage.length > 0) {
      const record = existingUsage[0];
      if (!record) {
        throw new Error('Failed to retrieve usage record');
      }
      return {
        id: record.id,
        userId: record.userId,
        requestCount: record.requestCount,
        periodStart: record.periodStart,
        periodEnd: record.periodEnd,
      };
    }

    // Create new usage record
    const inserted = await drizzleDb
      .insert(usage)
      .values({
        userId,
        requestCount: 0,
        periodStart,
        periodEnd,
      })
      .returning();

    const record = inserted[0];
    if (!record) {
      throw new Error('Failed to create usage record');
    }
    return {
      id: record.id,
      userId: record.userId,
      requestCount: record.requestCount,
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
    };
  }

  async incrementUsage(id: string): Promise<void> {
    const drizzleDb = this.db.getDrizzleDb();
    await drizzleDb
      .update(usage)
      .set({
        requestCount: sql`${usage.requestCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(usage.id, id));
  }
}
