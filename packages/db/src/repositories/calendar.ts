import { eq, and, or, lt, gt } from 'drizzle-orm';
import { getDb } from '../connection.js';
import { calendarEvents, type CalendarEventSchema, type NewCalendarEventSchema } from '../schema/calendar.js';
import type { Repository, QueryRepository } from '../index.js';

export type CalendarEventRepository = QueryRepository<CalendarEventSchema>;

export class PostgresCalendarEventRepository implements CalendarEventRepository {
  private db: ReturnType<typeof getDb>;

  constructor(db?: ReturnType<typeof getDb>) {
    this.db = db ?? getDb();
  }

  async findById(id: string): Promise<CalendarEventSchema | null> {
    const results = await this.db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, id))
      .limit(1);
    return results[0] ?? null;
  }

  async findAll(): Promise<CalendarEventSchema[]> {
    return this.db.select().from(calendarEvents);
  }

  async create(entity: Omit<CalendarEventSchema, 'id'>): Promise<CalendarEventSchema> {
    const newEntity: NewCalendarEventSchema = {
      id: crypto.randomUUID(),
      ...entity,
    };
    const results = await this.db.insert(calendarEvents).values(newEntity).returning();
    if (!results[0]) {
      throw new Error('Failed to create calendar event');
    }
    return results[0];
  }

  async update(id: string, entity: Partial<CalendarEventSchema>): Promise<CalendarEventSchema | null> {
    const results = await this.db
      .update(calendarEvents)
      .set(entity)
      .where(eq(calendarEvents.id, id))
      .returning();
    return results[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const results = await this.db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, id))
      .returning();
    return results.length > 0;
  }

  async findWhere(criteria: Partial<CalendarEventSchema>): Promise<CalendarEventSchema[]> {
    const conditions = Object.entries(criteria).map(([key, value]) => 
      eq(calendarEvents[key as keyof CalendarEventSchema] as any, value as any)
    );
    
    if (conditions.length === 0) {
      return this.findAll();
    }

    // For now, simple implementation - in production would use and() for multiple conditions
    return this.db.select().from(calendarEvents).where(conditions[0]!);
  }

  async count(criteria?: Partial<CalendarEventSchema>): Promise<number> {
    if (!criteria || Object.keys(criteria).length === 0) {
      const result = await this.db.select({ count: calendarEvents.id }).from(calendarEvents);
      return result.length;
    }
    const results = await this.findWhere(criteria);
    return results.length;
  }

  async findOverlapping(startAt: Date, endAt: Date, excludeId?: string): Promise<CalendarEventSchema[]> {
    // Find events that overlap with the given range
    // Overlap condition: (event.start < candidate.end) AND (event.end > candidate.start)
    const conditions = [
      lt(calendarEvents.startAt, endAt),
      gt(calendarEvents.endAt, startAt),
    ];

    if (excludeId) {
      conditions.push(eq(calendarEvents.id, excludeId));
    }

    return this.db
      .select()
      .from(calendarEvents)
      .where(and(...conditions));
  }
}
