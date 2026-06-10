import { eq, and, lt, gt, ne } from 'drizzle-orm';
import { calendarEvents, type CalendarEventSchema, type NewCalendarEventSchema } from '../schema/calendar/index.js';
import type { Repository, Database, RepositoryContext } from '../index.js';
import { generateUUID } from '@suite/shared-kernel';

// Domain type (from @suite/domain-calendar)
export type CalendarEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
};

export interface CalendarEventRepository extends Repository<CalendarEvent> {
  findOverlapping?(startAt: Date, endAt: Date, context: RepositoryContext, excludeId?: string): Promise<CalendarEvent[]>;
}

// Map DB schema to domain type
function mapToDomain(schema: CalendarEventSchema): CalendarEvent {
  return {
    id: schema.id,
    title: schema.title,
    startAt: schema.startAt.toISOString(),
    endAt: schema.endAt.toISOString(),
  };
}

// Map domain type to DB schema (for create/update)
function mapToSchema(domain: Omit<CalendarEvent, 'id'>, tenantId: string): Omit<CalendarEventSchema, 'id' | 'userId'> {
  return {
    tenantId,
    title: domain.title,
    startAt: new Date(domain.startAt),
    endAt: new Date(domain.endAt),
  };
}

export class PostgresCalendarEventRepository implements CalendarEventRepository {
  private db: ReturnType<Database['getDrizzleDb']>;
  private database: Database;

  constructor(db: Database) {
    this.database = db;
    this.db = db.getDrizzleDb();
  }

  private async setContext(context: RepositoryContext): Promise<void> {
    await this.database.setTenantContext(context.tenantId, context.userId);
  }

  async findById(id: string, context: RepositoryContext): Promise<CalendarEvent | null> {
    await this.setContext(context);
    const db = this.db;
    const results = await db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, context.userId)))
      .limit(1);
    return results[0] ? mapToDomain(results[0]) : null;
  }

  async findAll(context: RepositoryContext): Promise<CalendarEvent[]> {
    await this.setContext(context);
    const db = this.db;
    const results = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, context.userId));
    return results.map(mapToDomain);
  }

  async create(entity: Omit<CalendarEvent, 'id'>, context: RepositoryContext): Promise<CalendarEvent> {
    await this.setContext(context);
    const db = this.db;
    const schemaEntity = mapToSchema(entity, context.tenantId);
    const newEntity: NewCalendarEventSchema = {
      id: generateUUID(),
      tenantId: context.tenantId,
      userId: context.userId,
      title: schemaEntity.title,
      startAt: schemaEntity.startAt,
      endAt: schemaEntity.endAt,
    };
    const results = await db.insert(calendarEvents).values(newEntity).returning();
    if (!results[0]) {
      throw new Error('Failed to create calendar event');
    }
    return mapToDomain(results[0]);
  }

  async update(id: string, entity: Partial<CalendarEvent>, context: RepositoryContext): Promise<CalendarEvent | null> {
    await this.setContext(context);
    const db = this.db;
    const schemaEntity: Partial<CalendarEventSchema> = {};
    if (entity.title !== undefined) schemaEntity.title = entity.title;
    if (entity.startAt !== undefined) schemaEntity.startAt = new Date(entity.startAt);
    if (entity.endAt !== undefined) schemaEntity.endAt = new Date(entity.endAt);

    const results = await db
      .update(calendarEvents)
      .set(schemaEntity)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, context.userId)))
      .returning();
    return results[0] ? mapToDomain(results[0]) : null;
  }

  async delete(id: string, context: RepositoryContext): Promise<boolean> {
    await this.setContext(context);
    const db = this.db;
    const results = await db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, context.userId)))
      .returning();
    return results.length > 0;
  }

  async findOverlapping(startAt: Date, endAt: Date, context: RepositoryContext, excludeId?: string): Promise<CalendarEvent[]> {
    await this.setContext(context);
    const db = this.db;
    // Find events that overlap with the given range
    // Overlap condition: (event.start < candidate.end) AND (event.end > candidate.start)
    const conditions = [
      eq(calendarEvents.userId, context.userId),
      lt(calendarEvents.startAt, endAt),
      gt(calendarEvents.endAt, startAt),
    ];

    if (excludeId) {
      conditions.push(ne(calendarEvents.id, excludeId));
    }

    const results = await db
      .select()
      .from(calendarEvents)
      .where(and(...conditions));
    return results.map(mapToDomain);
  }
}
