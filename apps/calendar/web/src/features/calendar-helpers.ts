import type { CalendarEvent, CalendarEventRange, ViewMode } from './calendar-types';

function toUtcDate(value: string): Date {
  return new Date(value);
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addDays(value: Date, amount: number): Date {
  return new Date(value.getTime() + amount * 24 * 60 * 60 * 1000);
}

function formatDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function formatDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function getTodayDateInputValue(): string {
  const today = new Date();
  const offsetMinutes = today.getTimezoneOffset();
  const localMidnight = new Date(today.getTime() - offsetMinutes * 60 * 1000);

  return formatDateInputValue(localMidnight);
}

export function shiftSelectedDate(selectedDate: string, viewMode: ViewMode, direction: -1 | 1): string {
  const current = startOfUtcDay(toUtcDate(`${selectedDate}T00:00:00.000Z`));
  const offset = viewMode === 'day' ? 1 : 7;
  return formatDateKey(addDays(current, direction * offset));
}

export function getViewRange(selectedDate: string, viewMode: ViewMode): CalendarEventRange {
  const anchor = startOfUtcDay(toUtcDate(`${selectedDate}T00:00:00.000Z`));
  const weekOffset = (anchor.getUTCDay() + 6) % 7;
  const startAt = viewMode === 'day' ? anchor : addDays(anchor, -weekOffset);
  const endAt = viewMode === 'day' ? addDays(startAt, 1) : addDays(startAt, 7);

  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
  };
}

export function getRangeLabel(selectedDate: string, viewMode: ViewMode): string {
  const range = getViewRange(selectedDate, viewMode);
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  });

  const start = new Date(range.startAt);
  const end = new Date(range.endAt);
  const endLabel = viewMode === 'day' ? formatter.format(start) : formatter.format(addDays(end, -1));

  return viewMode === 'day'
    ? formatter.format(start)
    : `${formatter.format(start)} to ${endLabel}`;
}

export function getDaySections(events: CalendarEvent[], selectedDate: string): Array<{ date: string; label: string; events: CalendarEvent[] }> {
  const dayStart = getViewRange(selectedDate, 'day').startAt;
  const key = formatDateKey(new Date(dayStart));
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return [
    {
      date: key,
      label: formatter.format(new Date(dayStart)),
      events,
    },
  ];
}

export function getWeekSections(events: CalendarEvent[], selectedDate: string): Array<{ date: string; label: string; events: CalendarEvent[] }> {
  const range = getViewRange(selectedDate, 'week');
  const start = new Date(range.startAt);
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const sections: Array<{ date: string; label: string; events: CalendarEvent[] }> = [];

  for (let index = 0; index < 7; index += 1) {
    const current = addDays(start, index);
    const currentKey = formatDateKey(current);
    const currentEvents = events.filter((event) => {
      const eventStart = new Date(event.startAt);
      const eventEnd = new Date(event.endAt);
      return eventStart < addDays(current, 1) && eventEnd > current;
    });

    sections.push({
      date: currentKey,
      label: formatter.format(current),
      events: currentEvents,
    });
  }

  return sections;
}
