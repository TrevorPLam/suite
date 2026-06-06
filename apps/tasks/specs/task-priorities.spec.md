# Task Priorities

One-sentence summary: Tasks users can assign priority levels to tasks for importance-based sorting and filtering.

## User story

As a Tasks user, I want to assign priority levels to tasks so I can focus on high-impact work and organize my task list by importance.

## Scope

- Add `priority` field to TaskItem
- Support three priority levels: low, medium, high
- Default priority to medium when not specified
- Filter tasks by priority level
- Sort tasks by priority (high > medium > low)

## API contract

- Domain types:
  - `type TaskPriority = 'low' | 'medium' | 'high'`
  - `TaskItem.priority: TaskPriority`
  - `CreateTaskInput.priority?: TaskPriority`
  - `UpdateTaskInput.priority?: TaskPriority`

## Validation rules

- `priority` must be one of: 'low', 'medium', 'high'
- `priority` defaults to 'medium' when not provided
- Case-sensitive validation (exact string match required)

## Error cases

- `validation_error`: Invalid priority value (not one of allowed values)
- `validation_error`: Non-string value for priority

## Out of scope

- Custom priority levels
- Priority weights/numeric values
- Priority-based auto-sorting in list (UI concern)
- Priority escalation/de-escalation rules

## Acceptance criteria

- Tasks can be created with priorities
- Tasks default to medium priority when not specified
- Tasks can be updated to change priority
- Invalid priority values are rejected with clear error messages
- Priority filtering works correctly
