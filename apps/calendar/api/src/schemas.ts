import { z } from 'zod';
import type { CreateCalendarEventInput, UpdateCalendarEventInput } from '@suite/domain-calendar';

// Schema for creating a calendar event
export const createEventBodySchema = z.object({
  title: z.string().min(1).transform((val: string) => val.trim()),
  startAt: z.string().refine((val: string) => !Number.isNaN(Date.parse(val)), {
    message: 'startAt must be a valid ISO timestamp',
  }),
  endAt: z.string().refine((val: string) => !Number.isNaN(Date.parse(val)), {
    message: 'endAt must be a valid ISO timestamp',
  }),
}).refine((data) => Date.parse(data.endAt) > Date.parse(data.startAt), {
  message: 'endAt must be later than startAt',
}).transform((data): CreateCalendarEventInput => ({
  title: data.title,
  startAt: data.startAt,
  endAt: data.endAt,
}));

export type CreateEventBody = z.infer<typeof createEventBodySchema>;

// Schema for updating a calendar event (same as create)
export const updateEventBodySchema = createEventBodySchema.transform((data): UpdateCalendarEventInput => ({
  title: data.title,
  startAt: data.startAt,
  endAt: data.endAt,
}));

export type UpdateEventBody = z.infer<typeof updateEventBodySchema>;
