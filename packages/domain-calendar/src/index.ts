export {
  CalendarEventError,
  createCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
  listCalendarEventsInRange,
  updateCalendarEvent,
} from './lib/calendar-events.js';

export type {
  CalendarEvent,
  CalendarEventErrorCode,
  CalendarEventRange,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from './lib/calendar-events.js';

import { listCalendarEvents } from './lib/calendar-events.js';

export function getCalendarOverview() {
  return {
    name: 'Calendar',
    description: 'Starter calendar domain package',
    events: listCalendarEvents(),
  };
}
