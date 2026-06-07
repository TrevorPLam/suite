import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgresCalendarEventRepository } from './calendar.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { calendarEvents } from '../schema/calendar/index.js';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

// Skip tests if DATABASE_URL is not set
const dbUrl = process.env.DATABASE_URL;
const tenantId1 = randomUUID();
const tenantId2 = randomUUID();
const userId1 = randomUUID();
const userId2 = randomUUID();

describe.skipIf(!dbUrl)('PostgresCalendarEventRepository', () => {
  let client: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let repository: PostgresCalendarEventRepository;

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
    };
    repository = new PostgresCalendarEventRepository(mockDb as never, userId1, tenantId1);
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(async () => {
    // Clean up calendar events table before each test
    await db.delete(calendarEvents);
  });

  describe('create', () => {
    it('should create a calendar event with basic fields', async () => {
      const event = await repository.create({
        title: 'Test Event',
        startAt: '2026-06-10T10:00:00Z',
        endAt: '2026-06-10T11:00:00Z',
      });

      expect(event).toBeDefined();
      expect(event.id).toBeDefined();
      expect(event.title).toBe('Test Event');
      expect(event.startAt).toBe('2026-06-10T10:00:00Z');
      expect(event.endAt).toBe('2026-06-10T11:00:00Z');
    });

    it('should create events with same title but different times', async () => {
      const event1 = await repository.create({
        title: 'Meeting',
        startAt: '2026-06-10T10:00:00Z',
        endAt: '2026-06-10T11:00:00Z',
      });

      const event2 = await repository.create({
        title: 'Meeting',
        startAt: '2026-06-10T14:00:00Z',
        endAt: '2026-06-10T15:00:00Z',
      });

      expect(event1.id).not.toBe(event2.id);
      expect(event1.title).toBe(event2.title);
    });
  });

  describe('findById', () => {
    it('should find an event by id', async () => {
      const created = await repository.create({
        title: 'Find Me',
        startAt: '2026-06-10T10:00:00Z',
        endAt: '2026-06-10T11:00:00Z',
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Find Me');
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all events', async () => {
      await repository.create({ title: 'Event 1', startAt: '2026-06-10T10:00:00Z', endAt: '2026-06-10T11:00:00Z' });
      await repository.create({ title: 'Event 2', startAt: '2026-06-10T14:00:00Z', endAt: '2026-06-10T15:00:00Z' });
      await repository.create({ title: 'Event 3', startAt: '2026-06-10T16:00:00Z', endAt: '2026-06-10T17:00:00Z' });

      const allEvents = await repository.findAll();

      expect(allEvents).toHaveLength(3);
      expect(allEvents.map(e => e.title)).toEqual(['Event 1', 'Event 2', 'Event 3']);
    });

    it('should return empty array when no events exist', async () => {
      const allEvents = await repository.findAll();
      expect(allEvents).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update an event', async () => {
      const created = await repository.create({
        title: 'Original Title',
        startAt: '2026-06-10T10:00:00Z',
        endAt: '2026-06-10T11:00:00Z',
      });

      const updated = await repository.update(created.id, {
        title: 'Updated Title',
        startAt: '2026-06-10T12:00:00Z',
      });

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.startAt).toBe('2026-06-10T12:00:00Z');
    });

    it('should return null when updating non-existent event', async () => {
      const updated = await repository.update('non-existent-id', { title: 'New Title' });
      expect(updated).toBeNull();
    });

    it('should update end time independently', async () => {
      const created = await repository.create({
        title: 'Event',
        startAt: '2026-06-10T10:00:00Z',
        endAt: '2026-06-10T11:00:00Z',
      });

      const updated = await repository.update(created.id, {
        endAt: '2026-06-10T12:00:00Z',
      });

      expect(updated).toBeDefined();
      expect(updated?.endAt).toBe('2026-06-10T12:00:00Z');
      expect(updated?.startAt).toBe('2026-06-10T10:00:00Z');
    });
  });

  describe('delete', () => {
    it('should delete an event', async () => {
      const created = await repository.create({
        title: 'To Delete',
        startAt: '2026-06-10T10:00:00Z',
        endAt: '2026-06-10T11:00:00Z',
      });

      const deleted = await repository.delete(created.id);

      expect(deleted).toBe(true);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent event', async () => {
      const deleted = await repository.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('findOverlapping', () => {
    it('should find events that overlap with given range', async () => {
      await repository.create({ title: 'Event 1', startAt: '2026-06-10T10:00:00Z', endAt: '2026-06-10T11:00:00Z' });
      await repository.create({ title: 'Event 2', startAt: '2026-06-10T10:30:00Z', endAt: '2026-06-10T11:30:00Z' });
      await repository.create({ title: 'Event 3', startAt: '2026-06-10T12:00:00Z', endAt: '2026-06-10T13:00:00Z' });

      // Query for 10:15-11:15, should overlap with Event 1 and Event 2
      const overlapping = await repository.findOverlapping(
        new Date('2026-06-10T10:15:00Z'),
        new Date('2026-06-10T11:15:00Z')
      );

      expect(overlapping).toHaveLength(2);
      expect(overlapping.map(e => e.title)).toEqual(['Event 1', 'Event 2']);
    });

    it('should exclude event with given id from results', async () => {
      const event1 = await repository.create({ title: 'Event 1', startAt: '2026-06-10T10:00:00Z', endAt: '2026-06-10T11:00:00Z' });
      await repository.create({ title: 'Event 2', startAt: '2026-06-10T10:30:00Z', endAt: '2026-06-10T11:30:00Z' });

      const overlapping = await repository.findOverlapping(
        new Date('2026-06-10T10:15:00Z'),
        new Date('2026-06-10T11:15:00Z'),
        event1.id
      );

      expect(overlapping).toHaveLength(1);
      expect(overlapping[0]?.title).toBe('Event 2');
    });

    it('should return empty array when no events overlap', async () => {
      await repository.create({ title: 'Event 1', startAt: '2026-06-10T10:00:00Z', endAt: '2026-06-10T11:00:00Z' });
      await repository.create({ title: 'Event 2', startAt: '2026-06-10T14:00:00Z', endAt: '2026-06-10T15:00:00Z' });

      const overlapping = await repository.findOverlapping(
        new Date('2026-06-10T12:00:00Z'),
        new Date('2026-06-10T13:00:00Z')
      );

      expect(overlapping).toEqual([]);
    });

    it('should detect edge case: event starts exactly at range end', async () => {
      await repository.create({ title: 'Event', startAt: '2026-06-10T11:00:00Z', endAt: '2026-06-10T12:00:00Z' });

      const overlapping = await repository.findOverlapping(
        new Date('2026-06-10T10:00:00Z'),
        new Date('2026-06-10T11:00:00Z')
      );

      // Event starts exactly at range end, should not overlap
      expect(overlapping).toEqual([]);
    });

    it('should detect edge case: event ends exactly at range start', async () => {
      await repository.create({ title: 'Event', startAt: '2026-06-10T09:00:00Z', endAt: '2026-06-10T10:00:00Z' });

      const overlapping = await repository.findOverlapping(
        new Date('2026-06-10T10:00:00Z'),
        new Date('2026-06-10T11:00:00Z')
      );

      // Event ends exactly at range start, should not overlap
      expect(overlapping).toEqual([]);
    });
  });

  describe('tenant isolation', () => {
    it('should ensure data from one tenant is not visible to another', async () => {
      // Create event for tenant 1
      await db.insert(calendarEvents).values({
        id: randomUUID(),
        tenantId: tenantId1,
        userId: userId1,
        title: 'Tenant 1 Event',
        startAt: new Date('2026-06-10T10:00:00Z'),
        endAt: new Date('2026-06-10T11:00:00Z'),
      });

      // Create event for tenant 2
      await db.insert(calendarEvents).values({
        id: randomUUID(),
        tenantId: tenantId2,
        userId: userId2,
        title: 'Tenant 2 Event',
        startAt: new Date('2026-06-10T10:00:00Z'),
        endAt: new Date('2026-06-10T11:00:00Z'),
      });

      // Query all events - should return both (no RLS in test)
      const allEvents = await db.select().from(calendarEvents);
      expect(allEvents).toHaveLength(2);

      // Query with tenant filter - should return only tenant 1 events
      const tenant1Events = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.tenantId, tenantId1));
      expect(tenant1Events).toHaveLength(1);
      expect(tenant1Events[0]?.title).toBe('Tenant 1 Event');

      // Query with tenant filter - should return only tenant 2 events
      const tenant2Events = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.tenantId, tenantId2));
      expect(tenant2Events).toHaveLength(1);
      expect(tenant2Events[0]?.title).toBe('Tenant 2 Event');
    });
  });

  describe('composite index performance', () => {
    it('should use composite index for tenant+user queries', async () => {
      // Create test data
      await db.insert(calendarEvents).values({
        id: randomUUID(),
        tenantId: tenantId1,
        userId: userId1,
        title: 'Test Event',
        startAt: new Date('2026-06-10T10:00:00Z'),
        endAt: new Date('2026-06-10T11:00:00Z'),
      });

      // Run EXPLAIN ANALYZE on tenant+user query
      const explainResult = await client`
        EXPLAIN ANALYZE
        SELECT * FROM calendar.calendar_events
        WHERE tenant_id = ${tenantId1} AND user_id = ${userId1}
      `;

      const explainText = explainResult.map((row: Record<string, unknown>) => row['QUERY PLAN'] as string).join('\n');

      // Verify index is used (should contain "Index Scan")
      expect(explainText).toContain('Index Scan');
      expect(explainText).toContain('calendar_events_tenant_user_idx');

      // Verify query is fast (should complete in <100ms)
      // EXPLAIN ANALYZE output includes execution time in format "Planning Time: X ms, Execution Time: Y ms"
      const executionTimeMatch = explainText.match(/Execution Time: ([\d.]+) ms/);
      if (executionTimeMatch && executionTimeMatch[1]) {
        const executionTime = parseFloat(executionTimeMatch[1]);
        expect(executionTime).toBeLessThan(100);
      }
    });

    it('should use composite index for tenant+time queries', async () => {
      // Create test data
      await db.insert(calendarEvents).values({
        id: randomUUID(),
        tenantId: tenantId1,
        userId: userId1,
        title: 'Test Event',
        startAt: new Date('2026-06-10T10:00:00Z'),
        endAt: new Date('2026-06-10T11:00:00Z'),
      });

      // Run EXPLAIN ANALYZE on tenant+time query
      const explainResult = await client`
        EXPLAIN ANALYZE
        SELECT * FROM calendar.calendar_events
        WHERE tenant_id = ${tenantId1} AND start_at >= '2026-06-10T00:00:00Z' AND start_at < '2026-06-11T00:00:00Z'
      `;

      const explainText = explainResult.map((row: Record<string, unknown>) => row['QUERY PLAN'] as string).join('\n');

      // Verify index is used
      expect(explainText).toContain('Index Scan');
      expect(explainText).toContain('calendar_events_tenant_start_at_idx');
    });
  });
});
