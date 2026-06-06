import type { Repository } from '@suite/db';
import { generateUUID } from '@suite/shared-kernel';
import { sealEvent, unsealEvent, unsealEvents, isEncryptionEnabled, type EncryptedCalendarEvent } from './calendar-crypto.js';

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

export interface CalendarEventRepository extends Repository<CalendarEvent> {
  findOverlapping?(startAt: Date, endAt: Date, excludeId?: string): Promise<CalendarEvent[]>;
}

// In-memory repository for testing (default)
class InMemoryCalendarEventRepository implements CalendarEventRepository {
  private events = new Map<string, CalendarEvent>();

  async findById(id: string): Promise<CalendarEvent | null> {
    return this.events.get(id) ?? null;
  }

  async findAll(): Promise<CalendarEvent[]> {
    return Array.from(this.events.values());
  }

  async create(entity: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: generateUUID(),
      ...entity,
    };
    this.events.set(event.id, event);
    return event;
  }

  async update(id: string, entity: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    const existing = this.events.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...entity };
    this.events.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.events.delete(id);
  }

  clear(): void {
    this.events.clear();
  }
}

// Default repository (in-memory for backward compatibility)
let defaultRepository: CalendarEventRepository = new InMemoryCalendarEventRepository();

// Current repository (can be injected)
let currentRepository: CalendarEventRepository = defaultRepository;

export function setCalendarEventRepository(repository: CalendarEventRepository): void {
  currentRepository = repository;
}

export function getCalendarEventRepository(): CalendarEventRepository {
  return currentRepository;
}

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

async function assertNoConflict(candidate: CalendarEvent, ignoreId?: string): Promise<void> {
  // Use database-specific conflict detection if available
  if (currentRepository.findOverlapping) {
    const startAt = new Date(candidate.startAt);
    const endAt = new Date(candidate.endAt);
    const conflicts = await currentRepository.findOverlapping(startAt, endAt, ignoreId);

    if (conflicts.length > 0) {
      const conflict = conflicts[0]!;
      throw new CalendarEventError(
        `Conflicting calendar event range with "${conflict.title}"`,
        'conflict_error',
        [`Conflicts with event "${conflict.title}"`],
      );
    }
  } else {
    // Fallback to in-memory conflict detection
    const events = await listCalendarEvents();
    const conflict = events.find((event: CalendarEvent) => {
      if (ignoreId !== undefined && event.id === ignoreId) {
        return false;
      }

      return hasOverlap(candidate, event);
    });

    if (conflict) {
      throw new CalendarEventError(
        `Conflicting calendar event range with "${conflict.title}"`,
        'conflict_error',
        [`Conflicts with event "${conflict.title}"`],
      );
    }
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

export async function listCalendarEvents(): Promise<CalendarEvent[]> {
  const events = await currentRepository.findAll();
  const sortedEvents = sortEvents(events);
  
  // Decrypt if encryption is enabled
  if (isEncryptionEnabled()) {
    const decryptedEvents = await unsealEvents(sortedEvents as unknown as EncryptedCalendarEvent[]);
    return decryptedEvents.map(snapshot);
  }
  
  return sortedEvents.map(snapshot);
}

export async function listCalendarEventsInRange(range: CalendarEventRange): Promise<CalendarEvent[]> {
  const normalizedRange = normalizeCalendarEventRange(range);
  const events = await currentRepository.findAll();
  const filteredEvents = events.filter((event) => overlapsRange(event, normalizedRange));
  const sortedEvents = sortEvents(filteredEvents);

  // Decrypt if encryption is enabled
  if (isEncryptionEnabled()) {
    const decryptedEvents = await unsealEvents(sortedEvents as unknown as EncryptedCalendarEvent[]);
    return decryptedEvents.map(snapshot);
  }

  return sortedEvents.map(snapshot);
}

export async function getCalendarEvent(id: string): Promise<CalendarEvent | null> {
  const event = await currentRepository.findById(id);
  if (!event) return null;

  // Decrypt if encryption is enabled
  if (isEncryptionEnabled()) {
    const decryptedEvent = await unsealEvent(event as unknown as EncryptedCalendarEvent);
    return snapshot(decryptedEvent);
  }

  return snapshot(event);
}

export async function createCalendarEvent(input: CreateCalendarEventInput): Promise<CalendarEvent> {
  const normalizedInput = normalizeCalendarEventInput(input);
  const event: CalendarEvent = {
    id: generateUUID(),
    ...normalizedInput,
  };

  await assertNoConflict(event);

  // Encrypt before storage if encryption is enabled
  let eventToCreate = normalizedInput;
  if (isEncryptionEnabled()) {
    const eventWithId: CalendarEvent = {
      id: generateUUID(),
      ...normalizedInput,
    };
    const encryptedEvent = await sealEvent(eventWithId);
    // EncryptedEvent has encryptedTitle instead of title, but repository expects title
    // We need to pass the encrypted event as unknown to satisfy the type system
    eventToCreate = encryptedEvent as unknown as CreateCalendarEventInput;
  }

  const created = await currentRepository.create(eventToCreate);

  // Decrypt the result if encryption is enabled
  if (isEncryptionEnabled()) {
    const decryptedEvent = await unsealEvent(created as unknown as EncryptedCalendarEvent);
    return snapshot(decryptedEvent);
  }

  return snapshot(created);
}

export function resetCalendarEvents(): void {
  if (currentRepository instanceof InMemoryCalendarEventRepository) {
    (currentRepository as InMemoryCalendarEventRepository).clear();
  }
}

export async function resetCalendarEventsDB(): Promise<void> {
  // For database repositories, delete all events
  const events = await currentRepository.findAll();
  for (const event of events) {
    await currentRepository.delete(event.id);
  }
}

export async function updateCalendarEvent(id: string, input: UpdateCalendarEventInput): Promise<CalendarEvent> {
  if (!isNonEmptyString(id)) {
    throw new CalendarEventError('Invalid calendar event id', 'validation_error', [
      'id must be a non-empty string',
    ]);
  }

  const existingEvent = await currentRepository.findById(id);

  if (!existingEvent) {
    throw new CalendarEventError(`Calendar event "${id}" was not found`, 'not_found_error', [
      `No event exists for id "${id}"`,
    ]);
  }

  const normalizedInput = normalizeCalendarEventInput(input);
  const event: CalendarEvent = {
    id,
    ...normalizedInput,
  };

  await assertNoConflict(event, id);

  // Encrypt before storage if encryption is enabled
  let eventToUpdate = normalizedInput;
  if (isEncryptionEnabled()) {
    const eventWithId: CalendarEvent = {
      id,
      ...normalizedInput,
    };
    const encryptedEvent = await sealEvent(eventWithId);
    // EncryptedEvent has encryptedTitle instead of title, but repository expects title
    // We need to pass the encrypted event as unknown to satisfy the type system
    eventToUpdate = encryptedEvent as unknown as UpdateCalendarEventInput;
  }

  const updated = await currentRepository.update(id, eventToUpdate);

  if (!updated) {
    throw new CalendarEventError(`Calendar event "${id}" was not found`, 'not_found_error', [
      `No event exists for id "${id}"`,
    ]);
  }

  // Decrypt the result if encryption is enabled
  if (isEncryptionEnabled()) {
    const decryptedEvent = await unsealEvent(updated as unknown as EncryptedCalendarEvent);
    return snapshot(decryptedEvent);
  }

  return snapshot(updated);
}
