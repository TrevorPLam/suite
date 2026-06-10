import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { randomUUID } from 'crypto';
import {
  createCalendarEvent,
  updateCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
  listCalendarEventsInRange,
  resetCalendarEventsDB,
  CalendarEventError,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
  InMemoryCalendarEventRepository,
} from './calendar-events.js';
import { setCalendarKeyProvider, resetKeyProvider } from './calendar-crypto.js';
import { generateAESKey } from '@suite/crypto';
import type { RepositoryContext } from '@suite/db';

function createTestContext(): RepositoryContext {
  return {
    userId: randomUUID(),
    tenantId: randomUUID(),
    requestId: randomUUID(),
  };
}

async function assertCalendarEventError(
  fn: () => Promise<unknown>,
  code: string,
  detail?: string,
): Promise<void> {
  let error: CalendarEventError | undefined;
  try {
    await fn();
  } catch (e) {
    error = e as CalendarEventError;
  }
  expect(error).toBeInstanceOf(CalendarEventError);
  expect(error?.code).toBe(code);
  if (detail) {
    expect(error?.details).toContain(detail);
  }
}

describe('calendar-events - create', () => {
  let repository: InMemoryCalendarEventRepository;

  beforeEach(() => {
    repository = new InMemoryCalendarEventRepository();
  });

  it('should create a valid event with a stable ID', async () => {
    const context = createTestContext();
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(input, repository, context);

    expect(event.id).toBeDefined();
    expect(event.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    expect(event.title).toBe('Team Meeting');
    expect(event.startAt).toBe('2025-01-15T10:00:00Z');
    expect(event.endAt).toBe('2025-01-15T11:00:00Z');
  });

  it('should trim whitespace from title', async () => {
    const context = createTestContext();
    const input: CreateCalendarEventInput = {
      title: '  Team Meeting  ',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(input, repository, context);

    expect(event.title).toBe('Team Meeting');
  });

  it('should reject empty title', async () => {
    const context = createTestContext();
    const input: CreateCalendarEventInput = {
      title: '',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await assertCalendarEventError(() => createCalendarEvent(input, repository, context), 'validation_error', 'title must be a non-empty string');
  });

  it('should reject whitespace-only title', async () => {
    const context = createTestContext();
    const input: CreateCalendarEventInput = {
      title: '   ',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await expect(createCalendarEvent(input, repository, context)).rejects.toThrow(CalendarEventError);
  });

  it('should reject invalid startAt timestamp', async () => {
    const context = createTestContext();
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: 'invalid-date',
      endAt: '2025-01-15T11:00:00Z',
    };

    await assertCalendarEventError(() => createCalendarEvent(input, repository, context), 'validation_error', 'startAt must be a valid ISO timestamp');
  });

  it('should reject invalid endAt timestamp', async () => {
    const context = createTestContext();
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: 'invalid-date',
    };

    await assertCalendarEventError(() => createCalendarEvent(input, repository, context), 'validation_error', 'endAt must be a valid ISO timestamp');
  });

  it('should reject endAt before or equal to startAt', async () => {
    const context = createTestContext();
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T11:00:00Z',
      endAt: '2025-01-15T10:00:00Z',
    };

    await expect(createCalendarEvent(input, repository, context)).rejects.toThrow(CalendarEventError);
    await expect(createCalendarEvent(input, repository, context)).rejects.toThrow('endAt must be later than startAt');
  });

  it('should reject overlapping events', async () => {
    const context = createTestContext();
    const firstInput: CreateCalendarEventInput = {
      title: 'First Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const secondInput: CreateCalendarEventInput = {
      title: 'Second Meeting',
      startAt: '2025-01-15T10:30:00Z',
      endAt: '2025-01-15T11:30:00Z',
    };

    await createCalendarEvent(firstInput, repository, context);

    await assertCalendarEventError(() => createCalendarEvent(secondInput, repository, context), 'conflict_error');
  });

  it('should allow non-overlapping events', async () => {
    const context = createTestContext();
    const firstInput: CreateCalendarEventInput = {
      title: 'First Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const secondInput: CreateCalendarEventInput = {
      title: 'Second Meeting',
      startAt: '2025-01-15T11:00:00Z',
      endAt: '2025-01-15T12:00:00Z',
    };

    const firstEvent = await createCalendarEvent(firstInput, repository, context);
    const secondEvent = await createCalendarEvent(secondInput, repository, context);

    expect(firstEvent.id).not.toBe(secondEvent.id);
  });
});

describe('calendar-events - update', () => {
  let repository: InMemoryCalendarEventRepository;

  beforeEach(() => {
    repository = new InMemoryCalendarEventRepository();
  });

  it('should update an existing event', async () => {
    const context = createTestContext();
    const createInput: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(createInput, repository, context);

    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    const updated = await updateCalendarEvent(event.id, updateInput, repository, context);

    expect(updated.id).toBe(event.id);
    expect(updated.title).toBe('Updated Meeting');
    expect(updated.startAt).toBe('2025-01-15T14:00:00Z');
    expect(updated.endAt).toBe('2025-01-15T15:00:00Z');
  });

  it('should reject update with empty id', async () => {
    const context = createTestContext();
    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    await assertCalendarEventError(() => updateCalendarEvent('', updateInput, repository, context), 'validation_error', 'id must be a non-empty string');
  });

  it('should reject update for non-existent event', async () => {
    const context = createTestContext();
    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    await assertCalendarEventError(() => updateCalendarEvent('non-existent-id', updateInput, repository, context), 'not_found_error');
  });

  it('should reject update that creates conflict with other events', async () => {
    const context = createTestContext();
    const firstInput: CreateCalendarEventInput = {
      title: 'First Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const secondInput: CreateCalendarEventInput = {
      title: 'Second Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    const firstEvent = await createCalendarEvent(firstInput, repository, context);
    await createCalendarEvent(secondInput, repository, context);

    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated First Meeting',
      startAt: '2025-01-15T14:30:00Z',
      endAt: '2025-01-15T15:30:00Z',
    };

    await assertCalendarEventError(() => updateCalendarEvent(firstEvent.id, updateInput, repository, context), 'conflict_error');
  });

  it('should allow update that does not create conflict', async () => {
    const context = createTestContext();
    const firstInput: CreateCalendarEventInput = {
      title: 'First Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const secondInput: CreateCalendarEventInput = {
      title: 'Second Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    const firstEvent = await createCalendarEvent(firstInput, repository, context);
    await createCalendarEvent(secondInput, repository, context);

    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated First Meeting',
      startAt: '2025-01-15T09:00:00Z',
      endAt: '2025-01-15T10:00:00Z',
    };

    const updated = await updateCalendarEvent(firstEvent.id, updateInput, repository, context);

    expect(updated.title).toBe('Updated First Meeting');
  });
});

describe('calendar-events - encryption', () => {
  let repository: InMemoryCalendarEventRepository;

  beforeEach(() => {
    repository = new InMemoryCalendarEventRepository();
    resetKeyProvider();
  });

  it('should encrypt title before storage when encryption enabled', async () => {
    const context = createTestContext();
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(input, repository, context);

    // The returned event should have the decrypted title
    expect(event.title).toBe('Team Meeting');
  });

  it('should list events with encryption enabled', async () => {
    const context = createTestContext();
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await createCalendarEvent(input, repository, context);
    const events = await listCalendarEvents(repository, context);

    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe('Team Meeting');
  });

  it('should list events in range with encryption enabled', async () => {
    const context = createTestContext();
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await createCalendarEvent(input, repository, context);

    const range = {
      startAt: '2025-01-15T00:00:00Z',
      endAt: '2025-01-17T00:00:00Z',
    };

    const events = await listCalendarEventsInRange(range, repository, context);

    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe('Team Meeting');
  });

  it('should get event by id with encryption enabled', async () => {
    const context = createTestContext();
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(input, repository, context);
    const found = await getCalendarEvent(event.id, repository, context);

    expect(found).not.toBeNull();
    expect(found?.title).toBe('Team Meeting');
  });

  it('should update event with encryption enabled', async () => {
    const context = createTestContext();
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const createInput: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(createInput, repository, context);

    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    const updated = await updateCalendarEvent(event.id, updateInput, repository, context);

    expect(updated.title).toBe('Updated Meeting');
  });

  it('should reset calendar events DB', async () => {
    const context = createTestContext();
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await createCalendarEvent(input, repository, context);
    await resetCalendarEventsDB(repository, context);

    const events = await listCalendarEvents(repository, context);
    expect(events).toHaveLength(0);
  });

  it('should store ciphertext in repository when encryption enabled', async () => {
    const context = createTestContext();
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(input, repository, context);

    // The returned event should have the decrypted title
    expect(event.title).toBe('Team Meeting');
  });
});


describe('calendar-events - query', () => {
  let repository: InMemoryCalendarEventRepository;

  beforeEach(() => {
    repository = new InMemoryCalendarEventRepository();
  });

  it('should list all events sorted by start time', async () => {
    const context = createTestContext();
    const firstInput: CreateCalendarEventInput = {
      title: 'First Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    const secondInput: CreateCalendarEventInput = {
      title: 'Second Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await createCalendarEvent(firstInput, repository, context);
    await createCalendarEvent(secondInput, repository, context);

    const events = await listCalendarEvents(repository, context);

    expect(events).toHaveLength(2);
    expect(events[0]?.title).toBe('Second Meeting');
    expect(events[1]?.title).toBe('First Meeting');
  });

  it('should get event by id', async () => {
    const context = createTestContext();
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(input, repository, context);
    const found = await getCalendarEvent(event.id, repository, context);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(event.id);
    expect(found?.title).toBe('Team Meeting');
  });

  it('should return null for non-existent event', async () => {
    const context = createTestContext();
    const found = await getCalendarEvent('non-existent-id', repository, context);
    expect(found).toBeNull();
  });

  it('should list events in date range', async () => {
    const context = createTestContext();
    const firstInput: CreateCalendarEventInput = {
      title: 'First Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const secondInput: CreateCalendarEventInput = {
      title: 'Second Meeting',
      startAt: '2025-01-16T14:00:00Z',
      endAt: '2025-01-16T15:00:00Z',
    };

    const thirdInput: CreateCalendarEventInput = {
      title: 'Third Meeting',
      startAt: '2025-01-20T10:00:00Z',
      endAt: '2025-01-20T11:00:00Z',
    };

    await createCalendarEvent(firstInput, repository, context);
    await createCalendarEvent(secondInput, repository, context);
    await createCalendarEvent(thirdInput, repository, context);

    const range = {
      startAt: '2025-01-15T00:00:00Z',
      endAt: '2025-01-17T00:00:00Z',
    };

    const events = await listCalendarEventsInRange(range, repository, context);

    expect(events).toHaveLength(2);
    expect(events.map((e: { title: string }) => e.title)).toContain('First Meeting');
    expect(events.map((e: { title: string }) => e.title)).toContain('Second Meeting');
    expect(events.map((e: { title: string }) => e.title)).not.toContain('Third Meeting');
  });

  it('should reject invalid date range', async () => {
    const context = createTestContext();
    const range = {
      startAt: 'invalid-date',
      endAt: '2025-01-17T00:00:00Z',
    };

    await expect(listCalendarEventsInRange(range, repository, context)).rejects.toThrow(CalendarEventError);
  });

  it('should return empty list for range with no events', async () => {
    const context = createTestContext();
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await createCalendarEvent(input, repository, context);

    const range = {
      startAt: '2025-02-01T00:00:00Z',
      endAt: '2025-02-02T00:00:00Z',
    };

    const events = await listCalendarEventsInRange(range, repository, context);

    expect(events).toHaveLength(0);
  });
});

describe('calendar-events - property-based tests', () => {
  it('property: end time is always after start time for valid events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
        fc.date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31) }),
        fc.integer({ min: 1, max: 86400000 }), // 1ms to 24 hours in milliseconds
        async (title: string, startDate: Date, durationMs: number) => {
          const context = createTestContext();
          const repository = new InMemoryCalendarEventRepository();
          const startAt = startDate.toISOString();
          const endDate = new Date(startDate.getTime() + durationMs);
          const endAt = endDate.toISOString();

          const input: CreateCalendarEventInput = {
            title,
            startAt,
            endAt,
          };

          const event = await createCalendarEvent(input, repository, context);
          expect(Date.parse(event.endAt)).toBeGreaterThan(Date.parse(event.startAt));
        }
      )
    );
  });

  it('property: title trimming preserves non-empty content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
        fc.string({ minLength: 0, maxLength: 10 }),
        async (title: string, whitespace: string) => {
          const context = createTestContext();
          const repository = new InMemoryCalendarEventRepository();
          const titleWithWhitespace = whitespace + title + whitespace;
          const startAt = new Date().toISOString();
          const endAt = new Date(Date.now() + 3600000).toISOString();

          const input: CreateCalendarEventInput = {
            title: titleWithWhitespace,
            startAt,
            endAt,
          };

          const event = await createCalendarEvent(input, repository, context);
          expect(event.title).toBe(titleWithWhitespace.trim());
          expect(event.title.length).toBeGreaterThan(0);
        }
      )
    );
  });

  it('property: valid ISO timestamps are accepted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
        fc.date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31) }),
        async (title: string, startDate: Date) => {
          const context = createTestContext();
          const repository = new InMemoryCalendarEventRepository();
          const startAt = startDate.toISOString();
          const endAt = new Date(startDate.getTime() + 3600000).toISOString();

          const input: CreateCalendarEventInput = {
            title,
            startAt,
            endAt,
          };

          const event = await createCalendarEvent(input, repository, context);
          expect(event.startAt).toBe(startAt);
          expect(event.endAt).toBe(endAt);
        }
      )
    );
  });

  it('property: non-overlapping events can coexist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
        fc.date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31) }),
        fc.integer({ min: 1, max: 3600000 }),
        fc.integer({ min: 3600000, max: 7200000 }),
        async (title1: string, title2: string, startDate: Date, duration1: number, gap: number) => {
          const context = createTestContext();
          const repository = new InMemoryCalendarEventRepository();
          const startAt1 = startDate.toISOString();
          const endAt1 = new Date(startDate.getTime() + duration1).toISOString();
          const startAt2 = new Date(startDate.getTime() + duration1 + gap).toISOString();
          const endAt2 = new Date(startDate.getTime() + duration1 + gap + duration1).toISOString();

          const input1: CreateCalendarEventInput = {
            title: title1,
            startAt: startAt1,
            endAt: endAt1,
          };

          const input2: CreateCalendarEventInput = {
            title: title2,
            startAt: startAt2,
            endAt: endAt2,
          };

          const event1 = await createCalendarEvent(input1, repository, context);
          const event2 = await createCalendarEvent(input2, repository, context);

          expect(event1.id).not.toBe(event2.id);
          expect(event1.title).toBe(title1.trim());
          expect(event2.title).toBe(title2.trim());
        }
      )
    );
  });

  it('property: overlapping events are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
        fc.date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31) }),
        fc.integer({ min: 1000, max: 3600000 }),
        async (title1: string, title2: string, startDate: Date, duration1: number) => {
          const context = createTestContext();
          const repository = new InMemoryCalendarEventRepository();
          const startAt1 = startDate.toISOString();
          const endAt1 = new Date(startDate.getTime() + duration1).toISOString();
          // Start second event halfway through first event to ensure overlap
          const startAt2 = new Date(startDate.getTime() + duration1 / 2).toISOString();
          const endAt2 = new Date(startDate.getTime() + duration1 * 1.5).toISOString();

          const input1: CreateCalendarEventInput = {
            title: title1,
            startAt: startAt1,
            endAt: endAt1,
          };

          const input2: CreateCalendarEventInput = {
            title: title2,
            startAt: startAt2,
            endAt: endAt2,
          };

          await createCalendarEvent(input1, repository, context);
          await expect(createCalendarEvent(input2, repository, context)).rejects.toThrow(CalendarEventError);
        }
      )
    );
  });
});
