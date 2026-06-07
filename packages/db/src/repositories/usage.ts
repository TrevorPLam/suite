import { usage } from '../schema/usage.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import type { UsageRepository, UsageRecord } from '@suite/shared-kernel';
import type { Database, RepositoryContext } from '../index.js';

export class PostgresUsageRepository implements UsageRepository {
  private db: ReturnType<Database['getDrizzleDb']>;
  private database: Database;

  constructor(db: Database) {
    this.database = db;
    this.db = db.getDrizzleDb();
  }

  private async setContext(context: RepositoryContext): Promise<void> {
    await this.database.setTenantContext(context.tenantId, context.userId);
  }

  async findOrCreateUsage(userId: string, periodStart: Date, periodEnd: Date, context: RepositoryContext): Promise<UsageRecord> {
    await this.setContext(context);
    const drizzleDb = this.db;
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

  async incrementUsage(id: string, context: RepositoryContext): Promise<void> {
    await this.setContext(context);
    const drizzleDb = this.db;
    await drizzleDb
      .update(usage)
      .set({
        requestCount: sql`${usage.requestCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(usage.id, id));
  }
}
