import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCalendarEvent,
  updateCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
  listCalendarEventsInRange,
  resetCalendarEvents,
  CalendarEventError,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
} from './calendar-events.js';

function assertCalendarEventError(
  fn: () => void,
  code: string,
  detail?: string,
): void {
  let error: CalendarEventError | undefined;
  try {
    fn();
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

  it('should create a valid event with a stable ID', () => {
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = createCalendarEvent(input);

    expect(event.id).toBeDefined();
    expect(event.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    expect(event.title).toBe('Team Meeting');
    expect(event.startAt).toBe('2025-01-15T10:00:00Z');
    expect(event.endAt).toBe('2025-01-15T11:00:00Z');
  });

  it('should trim whitespace from title', () => {
    const input: CreateCalendarEventInput = {
      title: '  Team Meeting  ',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = createCalendarEvent(input);

    expect(event.title).toBe('Team Meeting');
  });

  it('should reject empty title', () => {
    const input: CreateCalendarEventInput = {
      title: '',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    assertCalendarEventError(() => createCalendarEvent(input), 'validation_error', 'title must be a non-empty string');
  });

  it('should reject whitespace-only title', () => {
    const input: CreateCalendarEventInput = {
      title: '   ',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    expect(() => createCalendarEvent(input)).toThrow(CalendarEventError);
  });

  it('should reject invalid startAt timestamp', () => {
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: 'invalid-date',
      endAt: '2025-01-15T11:00:00Z',
    };

    assertCalendarEventError(() => createCalendarEvent(input), 'validation_error', 'startAt must be a valid ISO timestamp');
  });

  it('should reject invalid endAt timestamp', () => {
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: 'invalid-date',
    };

    assertCalendarEventError(() => createCalendarEvent(input), 'validation_error', 'endAt must be a valid ISO timestamp');
  });

  it('should reject endAt before or equal to startAt', () => {
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T11:00:00Z',
      endAt: '2025-01-15T10:00:00Z',
    };

    expect(() => createCalendarEvent(input)).toThrow(CalendarEventError);
    expect(() => createCalendarEvent(input)).toThrow('endAt must be later than startAt');
  });

  it('should reject overlapping events', () => {
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

    createCalendarEvent(firstInput);

    assertCalendarEventError(() => createCalendarEvent(secondInput), 'conflict_error');
  });

  it('should allow non-overlapping events', () => {
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

    const firstEvent = createCalendarEvent(firstInput);
    const secondEvent = createCalendarEvent(secondInput);

    expect(firstEvent.id).not.toBe(secondEvent.id);
  });
});

describe('calendar-events - update', () => {
  beforeEach(() => {
    resetCalendarEvents();
  });

  it('should update an existing event', () => {
    const createInput: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = createCalendarEvent(createInput);

    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    const updated = updateCalendarEvent(event.id, updateInput);

    expect(updated.id).toBe(event.id);
    expect(updated.title).toBe('Updated Meeting');
    expect(updated.startAt).toBe('2025-01-15T14:00:00Z');
    expect(updated.endAt).toBe('2025-01-15T15:00:00Z');
  });

  it('should reject update with empty id', () => {
    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    assertCalendarEventError(() => updateCalendarEvent('', updateInput), 'validation_error', 'id must be a non-empty string');
  });

  it('should reject update for non-existent event', () => {
    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated Meeting',
      startAt: '2025-01-15T14:00:00Z',
      endAt: '2025-01-15T15:00:00Z',
    };

    assertCalendarEventError(() => updateCalendarEvent('non-existent-id', updateInput), 'not_found_error');
  });

  it('should reject update that creates conflict with other events', () => {
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

    const firstEvent = createCalendarEvent(firstInput);
    createCalendarEvent(secondInput);

    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated First Meeting',
      startAt: '2025-01-15T14:30:00Z',
      endAt: '2025-01-15T15:30:00Z',
    };

    assertCalendarEventError(() => updateCalendarEvent(firstEvent.id, updateInput), 'conflict_error');
  });

  it('should allow update that does not create conflict', () => {
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

    const firstEvent = createCalendarEvent(firstInput);
    createCalendarEvent(secondInput);

    const updateInput: UpdateCalendarEventInput = {
      title: 'Updated First Meeting',
      startAt: '2025-01-15T09:00:00Z',
      endAt: '2025-01-15T10:00:00Z',
    };

    const updated = updateCalendarEvent(firstEvent.id, updateInput);

    expect(updated.title).toBe('Updated First Meeting');
  });
});

describe('calendar-events - query', () => {
  beforeEach(() => {
    resetCalendarEvents();
  });

  it('should list all events sorted by start time', () => {
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

    createCalendarEvent(firstInput);
    createCalendarEvent(secondInput);

    const events = listCalendarEvents();

    expect(events).toHaveLength(2);
    expect(events[0]?.title).toBe('Second Meeting');
    expect(events[1]?.title).toBe('First Meeting');
  });

  it('should get event by id', () => {
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const event = createCalendarEvent(input);
    const found = getCalendarEvent(event.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(event.id);
    expect(found?.title).toBe('Team Meeting');
  });

  it('should return null for non-existent event', () => {
    const found = getCalendarEvent('non-existent-id');
    expect(found).toBeNull();
  });

  it('should list events in date range', () => {
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

    createCalendarEvent(firstInput);
    createCalendarEvent(secondInput);
    createCalendarEvent(thirdInput);

    const range = {
      startAt: '2025-01-15T00:00:00Z',
      endAt: '2025-01-17T00:00:00Z',
    };

    const events = listCalendarEventsInRange(range);

    expect(events).toHaveLength(2);
    expect(events.map((e: { title: string }) => e.title)).toContain('First Meeting');
    expect(events.map((e: { title: string }) => e.title)).toContain('Second Meeting');
    expect(events.map((e: { title: string }) => e.title)).not.toContain('Third Meeting');
  });

  it('should reject invalid date range', () => {
    const range = {
      startAt: 'invalid-date',
      endAt: '2025-01-17T00:00:00Z',
    };

    expect(() => listCalendarEventsInRange(range)).toThrow(CalendarEventError);
  });

  it('should return empty list for range with no events', () => {
    const input: CreateCalendarEventInput = {
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    createCalendarEvent(input);

    const range = {
      startAt: '2025-02-01T00:00:00Z',
      endAt: '2025-02-02T00:00:00Z',
    };

    const events = listCalendarEventsInRange(range);

    expect(events).toHaveLength(0);
  });
});
