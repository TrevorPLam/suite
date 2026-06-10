export {
  CalendarEventError,
  createCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
  listCalendarEventsInRange,
  resetCalendarEvents,
  resetCalendarEventsDB,
  updateCalendarEvent,
  deleteCalendarEvent,
  type CalendarEventRepository,
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
