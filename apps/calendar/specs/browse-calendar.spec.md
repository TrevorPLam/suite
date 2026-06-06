# Browse Calendar

One-sentence summary: Calendar users can browse events in day and week views, filter by the current date range, and keep loading, empty, and error states inside the calendar app shell.

## User story

As a Calendar user, I want to browse events by day or week so I can quickly understand what is coming up without leaving the calendar screen.

## Scope

- List events by a selected date range.
- Show a day view for one selected day.
- Show a week view for seven consecutive days.
- Keep the browse controls and the create/edit flow in the same app shell.
- Surface loading, empty, and error states clearly.

## API contract

- `GET /api/v1/events`
- Optional query parameters:
  - `startAt: string` ISO-8601 timestamp
  - `endAt: string` ISO-8601 timestamp
- Response 200:
  - `events: Array<{ id: string; title: string; startAt: string; endAt: string }>`

## View rules

- The selected range must be computed from the active view mode.
- Day view shows the selected day only.
- Week view shows seven consecutive days.
- Events should appear when they overlap the selected range.
- The UI should keep navigation actions visible and easy to reach.

## Validation rules

- Missing range parameters should return all events.
- Invalid range timestamps must fail fast with a 400 response.
- The domain layer should keep the range query deterministic and sorted.
- Browse views should not mutate event data.

## Failure cases

- 400: malformed or partially specified date range.
- 500: unexpected storage or domain failure.

## Out of scope

- Month grid drag-and-drop.
- Calendar sharing.
- Recurrence exceptions.
- Collaborative editing.

## Acceptance criteria

- The API can return events filtered by a selected date range.
- The web app can switch between day and week browsing without leaving the shell.
- Empty ranges show a friendly empty state instead of a broken layout.
- Loading and error states are visible and actionable.
