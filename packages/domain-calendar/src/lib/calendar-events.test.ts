import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  createCalendarEvent,
  updateCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
  listCalendarEventsInRange,
  resetCalendarEvents,
  resetCalendarEventsDB,
  setCalendarEventRepository,
  getCalendarEventRepository,
  CalendarEventError,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
  type CalendarEvent,
} from './calendar-events.js';
import { setCalendarKeyProvider, resetKeyProvider } from './calendar-crypto.js';
import { generateAESKey } from '@suite/crypto';

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
  beforeEach(() => {
    resetCalendarEvents();
  });

  it('should create a valid event with a stable ID', async () => {
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(input);

    expect(event.id).toBeDefined();
    expect(event.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    expect(event.title).toBe('Team Meeting');
    expect(event.startAt).toBe('2025-01-15T10:00:00Z');
    expect(event.endAt).toBe('2025-01-15T11:00:00Z');
  });

  it('should trim whitespace from title', async () => {
    const input: CreateCalendarEventInput = {
      title: '  Team Meeting  ',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(input);

    expect(event.title).toBe('Team Meeting');
  });

  it('should reject empty title', async () => {
    const input: CreateCalendarEventInput = {
      title: '',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await assertCalendarEventError(() => createCalendarEvent(input), 'validation_error', 'title must be a non-empty string');
  });

  it('should reject whitespace-only title', async () => {
    const input: CreateCalendarEventInput = {
      title: '   ',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await expect(createCalendarEvent(input)).rejects.toThrow(CalendarEventError);
  });

  it('should reject invalid startAt timestamp', async () => {
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: 'invalid-date',
      endAt: '2025-01-15T11:00:00Z',
    };

    await assertCalendarEventError(() => createCalendarEvent(input), 'validation_error', 'startAt must be a valid ISO timestamp');
  });

  it('should reject invalid endAt timestamp', async () => {
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: 'invalid-date',
    };

    await assertCalendarEventError(() => createCalendarEvent(input), 'validation_error', 'endAt must be a valid ISO timestamp');
  });

  it('should reject endAt before or equal to startAt', async () => {
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T11:00:00Z',
      endAt: '2025-01-15T10:00:00Z',
    };

    await expect(createCalendarEvent(input)).rejects.toThrow(CalendarEventError);
    await expect(createCalendarEvent(input)).rejects.toThrow('endAt must be later than startAt');
  });

  it('should reject overlapping events', async () => {
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

    await createCalendarEvent(firstInput);

    await assertCalendarEventError(() => createCalendarEvent(secondInput), 'conflict_error');
  });

  it('should allow non-overlapping events', async () => {
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

    const firstEvent = await createCalendarEvent(firstInput);
    const secondEvent = await createCalendarEvent(secondInput);

    expect(firstEvent.id).not.toBe(secondEvent.id);
  });
});

describe('calendar-events - update', () => {
  beforeEach(() => {
    resetCalendarEvents();
  });

  it('should update an existing event', async () => {
    const createInput: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(createInput);

    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    const updated = await updateCalendarEvent(event.id, updateInput);

    expect(updated.id).toBe(event.id);
    expect(updated.title).toBe('Updated Meeting');
    expect(updated.startAt).toBe('2025-01-15T14:00:00Z');
    expect(updated.endAt).toBe('2025-01-15T15:00:00Z');
  });

  it('should reject update with empty id', async () => {
    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    await assertCalendarEventError(() => updateCalendarEvent('', updateInput), 'validation_error', 'id must be a non-empty string');
  });

  it('should reject update for non-existent event', async () => {
    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    await assertCalendarEventError(() => updateCalendarEvent('non-existent-id', updateInput), 'not_found_error');
  });

  it('should reject update that creates conflict with other events', async () => {
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

    const firstEvent = await createCalendarEvent(firstInput);
    await createCalendarEvent(secondInput);

    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated First Meeting',
      startAt: '2025-01-15T14:30:00Z',
      endAt: '2025-01-15T15:30:00Z',
    };

    await assertCalendarEventError(() => updateCalendarEvent(firstEvent.id, updateInput), 'conflict_error');
  });

  it('should allow update that does not create conflict', async () => {
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

    const firstEvent = await createCalendarEvent(firstInput);
    await createCalendarEvent(secondInput);

    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated First Meeting',
      startAt: '2025-01-15T09:00:00Z',
      endAt: '2025-01-15T10:00:00Z',
    };

    const updated = await updateCalendarEvent(firstEvent.id, updateInput);

    expect(updated.title).toBe('Updated First Meeting');
  });
});

describe('calendar-events - encryption', () => {
  beforeEach(() => {
    resetCalendarEvents();
    resetKeyProvider();
  });

  it('should encrypt title before storage when encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(input);

    // The returned event should have the decrypted title
    expect(event.title).toBe('Team Meeting');
  });

  it('should list events with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await createCalendarEvent(input);
    const events = await listCalendarEvents();

    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe('Team Meeting');
  });

  it('should list events in range with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await createCalendarEvent(input);

    const range = {
      startAt: '2025-01-15T00:00:00Z',
      endAt: '2025-01-17T00:00:00Z',
    };

    const events = await listCalendarEventsInRange(range);

    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe('Team Meeting');
  });

  it('should get event by id with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(input);
    const found = await getCalendarEvent(event.id);

    expect(found).not.toBeNull();
    expect(found?.title).toBe('Team Meeting');
  });

  it('should update event with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const createInput: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(createInput);

    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    const updated = await updateCalendarEvent(event.id, updateInput);

    expect(updated.title).toBe('Updated Meeting');
  });

  it('should reset calendar events DB', async () => {
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await createCalendarEvent(input);
    await resetCalendarEventsDB();

    const events = await listCalendarEvents();
    expect(events).toHaveLength(0);
  });
});

describe('calendar-events - database-specific conflict detection', () => {
  let originalRepository: ReturnType<typeof getCalendarEventRepository>;

  beforeEach(() => {
    resetCalendarEvents();
    originalRepository = getCalendarEventRepository();
  });

  afterEach(() => {
    // Reset to default repository after each test
    setCalendarEventRepository(originalRepository);
    resetCalendarEvents();
  });

  it('should use database-specific conflict detection when available', async () => {
    // Create a mock repository with findOverlapping method
    let findOverlappingCalled = false;

    const customRepository = {
      ...originalRepository,
      async findById(id: string): Promise<CalendarEvent | null> {
        return originalRepository.findById(id);
      },
      async findAll(): Promise<CalendarEvent[]> {
        return originalRepository.findAll();
      },
      async create(entity: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
        return originalRepository.create(entity);
      },
      async update(id: string, entity: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
        return originalRepository.update(id, entity);
      },
      async delete(id: string): Promise<boolean> {
        return originalRepository.delete(id);
      },
      async findOverlapping(_startAt: Date, _endAt: Date, _excludeId?: string): Promise<CalendarEvent[]> {
        findOverlappingCalled = true;
        // Return empty array to allow creation
        return [];
      },
    };

    setCalendarEventRepository(customRepository);

    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await createCalendarEvent(input);
    expect(findOverlappingCalled).toBe(true);
  });

  it('should reject overlapping events using database-specific detection', async () => {
    const existingEvent: CalendarEvent = {
      id: 'existing-id',
      title: 'Existing Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const customRepository = {
      ...originalRepository,
      async findById(id: string): Promise<CalendarEvent | null> {
        return originalRepository.findById(id);
      },
      async findAll(): Promise<CalendarEvent[]> {
        return originalRepository.findAll();
      },
      async create(entity: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
        return originalRepository.create(entity);
      },
      async update(id: string, entity: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
        return originalRepository.update(id, entity);
      },
      async delete(id: string): Promise<boolean> {
        return originalRepository.delete(id);
      },
      async findOverlapping(_startAt: Date, _endAt: Date, _excludeId?: string): Promise<CalendarEvent[]> {
        // Return existing event to simulate conflict
        return [existingEvent];
      },
    };

    setCalendarEventRepository(customRepository);

    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:30:00Z',
      endAt: '2025-01-15T11:30:00Z',
    };

    await assertCalendarEventError(() => createCalendarEvent(input), 'conflict_error');
  });
});

describe('calendar-events - query', () => {
  beforeEach(() => {
    resetCalendarEvents();
  });

  it('should list all events sorted by start time', async () => {
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

    await createCalendarEvent(firstInput);
    await createCalendarEvent(secondInput);

    const events = await listCalendarEvents();

    expect(events).toHaveLength(2);
    expect(events[0]?.title).toBe('Second Meeting');
    expect(events[1]?.title).toBe('First Meeting');
  });

  it('should get event by id', async () => {
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = await createCalendarEvent(input);
    const found = await getCalendarEvent(event.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(event.id);
    expect(found?.title).toBe('Team Meeting');
  });

  it('should return null for non-existent event', async () => {
    const found = await getCalendarEvent('non-existent-id');
    expect(found).toBeNull();
  });

  it('should list events in date range', async () => {
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

    await createCalendarEvent(firstInput);
    await createCalendarEvent(secondInput);
    await createCalendarEvent(thirdInput);

    const range = {
      startAt: '2025-01-15T00:00:00Z',
      endAt: '2025-01-17T00:00:00Z',
    };

    const events = await listCalendarEventsInRange(range);

    expect(events).toHaveLength(2);
    expect(events.map((e: { title: string }) => e.title)).toContain('First Meeting');
    expect(events.map((e: { title: string }) => e.title)).toContain('Second Meeting');
    expect(events.map((e: { title: string }) => e.title)).not.toContain('Third Meeting');
  });

  it('should reject invalid date range', async () => {
    const range = {
      startAt: 'invalid-date',
      endAt: '2025-01-17T00:00:00Z',
    };

    await expect(listCalendarEventsInRange(range)).rejects.toThrow(CalendarEventError);
  });

  it('should return empty list for range with no events', async () => {
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    await createCalendarEvent(input);

    const range = {
      startAt: '2025-02-01T00:00:00Z',
      endAt: '2025-02-02T00:00:00Z',
    };

    const events = await listCalendarEventsInRange(range);

    expect(events).toHaveLength(0);
  });
});

describe('calendar-events - property-based tests', () => {
  beforeEach(() => {
    resetCalendarEvents();
  });

  it('property: end time is always after start time for valid events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
        fc.date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31) }),
        fc.integer({ min: 1, max: 86400000 }), // 1ms to 24 hours in milliseconds
        async (title: string, startDate: Date, durationMs: number) => {
          resetCalendarEvents();
          const startAt = startDate.toISOString();
          const endDate = new Date(startDate.getTime() + durationMs);
          const endAt = endDate.toISOString();

          const input: CreateCalendarEventInput = {
            title,
            startAt,
            endAt,
          };

          const event = await createCalendarEvent(input);
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
          resetCalendarEvents();
          const titleWithWhitespace = whitespace + title + whitespace;
          const startAt = new Date().toISOString();
          const endAt = new Date(Date.now() + 3600000).toISOString();

          const input: CreateCalendarEventInput = {
            title: titleWithWhitespace,
            startAt,
            endAt,
          };

          const event = await createCalendarEvent(input);
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
          resetCalendarEvents();
          const startAt = startDate.toISOString();
          const endAt = new Date(startDate.getTime() + 3600000).toISOString();

          const input: CreateCalendarEventInput = {
            title,
            startAt,
            endAt,
          };

          const event = await createCalendarEvent(input);
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
          resetCalendarEvents();
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

          const event1 = await createCalendarEvent(input1);
          const event2 = await createCalendarEvent(input2);

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
          resetCalendarEvents();
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

          await createCalendarEvent(input1);
          await expect(createCalendarEvent(input2)).rejects.toThrow(CalendarEventError);
        }
      )
    );
  });
});
