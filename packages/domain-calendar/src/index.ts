export {
  CalendarEventError,
  createCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
  listCalendarEventsInRange,
  resetCalendarEvents,
  resetCalendarEventsDB,
  setCalendarEventRepository,
  updateCalendarEvent,
} from './lib/calendar-events.js';

export {
  setCalendarKeyProvider,
  getCalendarKeyProvider,
  setCalendarKeyProviderFromEnv,
  isEncryptionEnabled,
  sealEvent,
  unsealEvent,
  sealEvents,
  unsealEvents,
} from './lib/calendar-crypto.js';

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
