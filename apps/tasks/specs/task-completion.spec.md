# Task Completion

One-sentence summary: Tasks users can browse created tasks, toggle completion state, and receive clear feedback when the API rejects a mutation.

## User story

As a Tasks user, I want to toggle a task’s completion state so I can keep track of what is done and what still needs attention.

## Scope

- List saved tasks.
- Toggle completion on an existing task.
- Surface stable task records to the UI after create and completion changes.

## API contract

- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PUT /api/tasks/:id/completion`

## Validation rules

- `completed` must be a boolean when updating completion.
- Missing task IDs should return a not-found response.
- The task list should remain stable enough to re-render after each mutation.

## Failure cases

- 400: invalid JSON or invalid completion payload.
- 404: unknown task ID.
- 500: unexpected domain or persistence failure.

## Acceptance criteria

- Creating a task immediately adds it to the browsable task list.
- Toggling completion updates the stored task and re-renders the list.
- API failures are shown in the UI with a readable message and details when available.
