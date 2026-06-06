import { eq, and, lt, gt } from 'drizzle-orm';
import { calendarEvents, type CalendarEventSchema, type NewCalendarEventSchema } from '../schema/calendar.js';
import type { Repository, Database, TransactionScope } from '../index.js';
import { generateUUID } from '@suite/shared-kernel';

// Domain type (from @suite/domain-calendar)
export type CalendarEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
};

export interface CalendarEventRepository extends Repository<CalendarEvent> {
  findOverlapping?(startAt: Date, endAt: Date, excludeId?: string): Promise<CalendarEvent[]>;
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
  private userId: string;
  private tenantId: string;

  constructor(db: Database, userId: string, tenantId: string) {
    this.db = db.getDrizzleDb();
    this.userId = userId;
    this.tenantId = tenantId;
  }

  async findById(id: string, tx?: TransactionScope): Promise<CalendarEvent | null> {
    const db = tx ?? this.db;
    const results = await db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, this.userId)))
      .limit(1);
    return results[0] ? mapToDomain(results[0]) : null;
  }

  async findAll(tx?: TransactionScope): Promise<CalendarEvent[]> {
    const db = tx ?? this.db;
    const results = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, this.userId));
    return results.map(mapToDomain);
  }

  async create(entity: Omit<CalendarEvent, 'id'>, tx?: TransactionScope): Promise<CalendarEvent> {
    const db = tx ?? this.db;
    const schemaEntity = mapToSchema(entity, this.tenantId);
    const newEntity: NewCalendarEventSchema = {
      id: generateUUID(),
      tenantId: this.tenantId,
      userId: this.userId,
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

  async update(id: string, entity: Partial<CalendarEvent>, tx?: TransactionScope): Promise<CalendarEvent | null> {
    const db = tx ?? this.db;
    const schemaEntity: Partial<CalendarEventSchema> = {};
    if (entity.title !== undefined) schemaEntity.title = entity.title;
    if (entity.startAt !== undefined) schemaEntity.startAt = new Date(entity.startAt);
    if (entity.endAt !== undefined) schemaEntity.endAt = new Date(entity.endAt);

    const results = await db
      .update(calendarEvents)
      .set(schemaEntity)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, this.userId)))
      .returning();
    return results[0] ? mapToDomain(results[0]) : null;
  }

  async delete(id: string, tx?: TransactionScope): Promise<boolean> {
    const db = tx ?? this.db;
    const results = await db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, this.userId)))
      .returning();
    return results.length > 0;
  }

  async findOverlapping(startAt: Date, endAt: Date, excludeId?: string, tx?: TransactionScope): Promise<CalendarEvent[]> {
    const db = tx ?? this.db;
    // Find events that overlap with the given range
    // Overlap condition: (event.start < candidate.end) AND (event.end > candidate.start)
    const conditions = [
      eq(calendarEvents.userId, this.userId),
      lt(calendarEvents.startAt, endAt),
      gt(calendarEvents.endAt, startAt),
    ];

    if (excludeId) {
      conditions.push(eq(calendarEvents.id, excludeId));
    }

    const results = await db
      .select()
      .from(calendarEvents)
      .where(and(...conditions));
    return results.map(mapToDomain);
  }
}
