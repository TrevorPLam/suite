# Update Event

One-sentence summary: Calendar users can load an existing event and update its title or time range, and the system must validate conflicts before saving the new version through the Calendar domain/API boundary.

## User story

As a Calendar user, I want to edit an existing event so I can keep my schedule accurate.

## Scope

- Read the current calendar events.
- Update a single existing event.
- Validate required fields at the API boundary.
- Reject conflicting time ranges before saving.

## API contract

- `GET /api/events`
- `PUT /api/events/:id`
- Request body:
  - `title: string`
  - `startAt: string` ISO-8601 timestamp
  - `endAt: string` ISO-8601 timestamp
- Response 200:
  - `id: string`
  - `title: string`
  - `startAt: string`
  - `endAt: string`

## Validation rules

- `title` must be present and trimmed.
- `startAt` and `endAt` must be valid ISO timestamps.
- `endAt` must be later than `startAt`.
- Updates must fail fast if the payload is malformed.
- Updates must fail if the new range conflicts with another saved event.

## Failure cases

- 400: missing or invalid fields.
- 404: event id not found.
- 409: conflicting event range.
- 500: unexpected storage or domain failure.

## Out of scope

- Recurrence rules.
- Attendees.
- Time zone conversion UI.
- Calendar sharing and permissions.
- Reminder delivery.

## Acceptance criteria

- The API rejects invalid payloads before domain execution.
- The domain layer returns an updated event object with the same stable `id`.
- The web app can load an existing event, edit it, and see the saved values reflected immediately.
