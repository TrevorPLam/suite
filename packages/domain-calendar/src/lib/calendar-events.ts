export type CalendarEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
};

export type CreateCalendarEventInput = {
  title: string;
  startAt: string;
  endAt: string;
};

export type UpdateCalendarEventInput = CreateCalendarEventInput;

export type CalendarEventRange = {
  startAt: string;
  endAt: string;
};

export type CalendarEventErrorCode = 'validation_error' | 'conflict_error' | 'not_found_error';

export class CalendarEventError extends Error {
  constructor(
    message: string,
    public readonly code: CalendarEventErrorCode,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'CalendarEventError';
  }
}

const calendarEvents = new Map<string, CalendarEvent>();

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function normalizeCalendarEventInput(input: CreateCalendarEventInput): CreateCalendarEventInput {
  const title = input.title.trim();
  const startAt = input.startAt.trim();
  const endAt = input.endAt.trim();
  const details: string[] = [];

  if (!isNonEmptyString(title)) {
    details.push('title must be a non-empty string');
  }

  if (!isValidIsoTimestamp(startAt)) {
    details.push('startAt must be a valid ISO timestamp');
  }

  if (!isValidIsoTimestamp(endAt)) {
    details.push('endAt must be a valid ISO timestamp');
  }

  if (details.length > 0) {
    throw new CalendarEventError('Invalid calendar event payload', 'validation_error', details);
  }

  if (Date.parse(endAt) <= Date.parse(startAt)) {
    throw new CalendarEventError('endAt must be later than startAt', 'validation_error', [
      'endAt must be later than startAt',
    ]);
  }

  return {
    title,
    startAt,
    endAt,
  };
}

function hasOverlap(candidate: CalendarEvent, existing: CalendarEvent): boolean {
  return Date.parse(candidate.startAt) < Date.parse(existing.endAt)
    && Date.parse(candidate.endAt) > Date.parse(existing.startAt);
}

function assertNoConflict(candidate: CalendarEvent, ignoreId?: string): void {
  const conflict = listCalendarEvents().find((event) => {
    if (ignoreId !== undefined && event.id === ignoreId) {
      return false;
    }

    return hasOverlap(candidate, event);
  });

  if (conflict) {
    throw new CalendarEventError(
      `Conflicting calendar event range with \"${conflict.title}\"`,
      'conflict_error',
      [`Conflicts with event \"${conflict.title}\"`],
    );
  }
}

function snapshot(event: CalendarEvent): CalendarEvent {
  return {
    ...event,
  };
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((left, right) => {
    const startDifference = Date.parse(left.startAt) - Date.parse(right.startAt);

    if (startDifference !== 0) {
      return startDifference;
    }

    const titleDifference = left.title.localeCompare(right.title);

    if (titleDifference !== 0) {
      return titleDifference;
    }

    return left.id.localeCompare(right.id);
  });
}

function normalizeCalendarEventRange(range: CalendarEventRange): CalendarEventRange {
  const startAt = range.startAt.trim();
  const endAt = range.endAt.trim();
  const details: string[] = [];

  if (!isValidIsoTimestamp(startAt)) {
    details.push('startAt must be a valid ISO timestamp');
  }

  if (!isValidIsoTimestamp(endAt)) {
    details.push('endAt must be a valid ISO timestamp');
  }

  if (details.length > 0) {
    throw new CalendarEventError('Invalid calendar event range', 'validation_error', details);
  }

  if (Date.parse(endAt) <= Date.parse(startAt)) {
    throw new CalendarEventError('endAt must be later than startAt', 'validation_error', [
      'endAt must be later than startAt',
    ]);
  }

  return {
    startAt,
    endAt,
  };
}

function overlapsRange(event: CalendarEvent, range: CalendarEventRange): boolean {
  return Date.parse(event.startAt) < Date.parse(range.endAt)
    && Date.parse(event.endAt) > Date.parse(range.startAt);
}

export function listCalendarEvents(): CalendarEvent[] {
  return sortEvents([...calendarEvents.values()]).map(snapshot);
}

export function listCalendarEventsInRange(range: CalendarEventRange): CalendarEvent[] {
  const normalizedRange = normalizeCalendarEventRange(range);

  return sortEvents(
    [...calendarEvents.values()].filter((event) => overlapsRange(event, normalizedRange)),
  ).map(snapshot);
}

export function getCalendarEvent(id: string): CalendarEvent | null {
  const event = calendarEvents.get(id);

  return event ? snapshot(event) : null;
}

export function createCalendarEvent(input: CreateCalendarEventInput): CalendarEvent {
  const normalizedInput = normalizeCalendarEventInput(input);
  const event: CalendarEvent = {
    id: crypto.randomUUID(),
    ...normalizedInput,
  };

  assertNoConflict(event);
  calendarEvents.set(event.id, event);

  return snapshot(event);
}

export function resetCalendarEvents(): void {
  calendarEvents.clear();
}

export function updateCalendarEvent(id: string, input: UpdateCalendarEventInput): CalendarEvent {
  if (!isNonEmptyString(id)) {
    throw new CalendarEventError('Invalid calendar event id', 'validation_error', [
      'id must be a non-empty string',
    ]);
  }

  const existingEvent = calendarEvents.get(id);

  if (!existingEvent) {
    throw new CalendarEventError(`Calendar event \"${id}\" was not found`, 'not_found_error', [
      `No event exists for id \"${id}\"`,
    ]);
  }

  const normalizedInput = normalizeCalendarEventInput(input);
  const event: CalendarEvent = {
    id,
    ...normalizedInput,
  };

  assertNoConflict(event, id);
  calendarEvents.set(id, event);

  return snapshot(event);
}
