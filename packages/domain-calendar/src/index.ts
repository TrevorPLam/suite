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

export function getCalendarOverview() {
  return {
    name: 'Calendar',
    description: 'Starter calendar domain package',
    events: [] as CalendarEvent[],
  };
}

export function createCalendarEvent(input: CreateCalendarEventInput): CalendarEvent {
  return {
    id: crypto.randomUUID(),
    ...input,
  };
}
