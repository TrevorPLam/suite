# Task Due Dates

One-sentence summary: Tasks users can assign due dates to tasks for time-based tracking and sorting.

## User story

As a Tasks user, I want to assign due dates to tasks so I can track deadlines and prioritize work based on urgency.

## Scope

- Add optional `dueDate` field to TaskItem
- Validate due date format (ISO 8601 timestamp)
- Filter tasks by due date ranges
- Sort tasks by due date
- Domain-level validation for past/future dates

## API contract

- Domain types:
  - `TaskItem.dueDate?: string` (ISO 8601 timestamp, e.g., "2026-06-15T00:00:00Z")
  - `CreateTaskInput.dueDate?: string`
  - `UpdateTaskInput.dueDate?: string`

## Validation rules

- `dueDate` must be a valid ISO 8601 timestamp when provided
- `dueDate` is optional (tasks can exist without due dates)
- No restriction on past dates (allow overdue tasks)
- No restriction on future dates (allow planning ahead)

## Error cases

- `validation_error`: Invalid ISO 8601 timestamp format
- `validation_error`: Non-string value for dueDate

## Out of scope

- Due date reminders/notifications
- Recurring due dates
- Time zone handling (store and display as UTC)
- Calendar integration

## Acceptance criteria

- Tasks can be created with due dates
- Tasks can be updated to add/remove due dates
- Invalid due date formats are rejected with clear error messages
- Tasks without due dates are handled correctly in sorting/filtering
