export type CalendarEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
};

export type EventFormState = {
  title: string;
  startAt: string;
  endAt: string;
};

export type CalendarEventRange = {
  startAt: string;
  endAt: string;
};

export type ViewMode = 'day' | 'week';
