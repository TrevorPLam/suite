# Create Event

One-sentence summary: Calendar users can create an event with a title and time range, and the system must validate the request before storing it through the Calendar domain/API boundary.

## User story

As a Calendar user, I want to create an event so I can reserve time on my schedule.

## Scope

- Create a single calendar event.
- Validate required fields at the API boundary.
- Return the created event shape expected by the web app.

## API contract

- `POST /api/events`
- Request body:
  - `title: string`
  - `startAt: string` ISO-8601 timestamp
  - `endAt: string` ISO-8601 timestamp
- Response 201:
  - `id: string`
  - `title: string`
  - `startAt: string`
  - `endAt: string`
- Response 401:
  - `error: string` - Unauthorized (missing or invalid session)

## Validation rules

- `title` must be present and trimmed.
- `startAt` and `endAt` must be valid ISO timestamps.
- `endAt` must be later than `startAt`.
- Requests must fail fast if the payload is malformed.

## Failure cases

- 400: missing or invalid fields.
- 409: conflicting event creation rules if overlap detection is later added.
- 500: unexpected storage or domain failure.

## Out of scope

- Recurrence rules.
- Attendees.
- Time zone conversion UI.
- Calendar sharing and permissions.
- Reminder delivery.

## Acceptance criteria

- The API rejects invalid payloads before domain execution.
- The domain layer returns a created event object with a stable `id`.
- The web app can call the contract without changing the route shape later.
