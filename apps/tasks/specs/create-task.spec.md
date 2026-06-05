# Create Task

One-sentence summary: Tasks users can create a task with a title and optional completion state, and the API should validate and return the created task object for the UI.

## User story

As a Tasks user, I want to create a task so I can track work items and follow through later.

## Scope

- Create a single task.
- Validate the incoming request at the API edge.
- Return a task object that the Tasks web app can render immediately.

## API contract

- `POST /api/tasks`
- Request body:
  - `title: string`
  - `completed?: boolean`
- Response 201:
  - `id: string`
  - `title: string`
  - `completed: boolean`

## Validation rules

- `title` must be present and trimmed.
- `completed` defaults to `false` when omitted.
- The API should reject empty titles.

## Failure cases

- 400: missing or invalid input.
- 500: unexpected domain or persistence failure.

## Out of scope

- Lists, boards, or nested subtasks.
- Due dates and reminders.
- Assignment, labels, or collaboration.
- Recurrence or dependencies.

## Acceptance criteria

- Valid requests create a task and return the new entity.
- Invalid requests are rejected before any domain mutation.
- The contract is simple enough to extend into lists later without breaking the base create flow.
