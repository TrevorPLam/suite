# Task Tags

One-sentence summary: Tasks users can assign tags to tasks for categorization and flexible filtering.

## User story

As a Tasks user, I want to assign tags to tasks so I can categorize work items and filter by project, context, or custom categories.

## Scope

- Add `tags` field to TaskItem as an array of strings
- Support multiple tags per task
- Support empty tags array (no tags)
- Filter tasks by tag(s)
- Add/remove tags on task update
- Validate tag format (non-empty strings, trimmed)

## API contract

- Domain types:
  - `TaskItem.tags: string[]`
  - `CreateTaskInput.tags?: string[]`
  - `UpdateTaskInput.tags?: string[]`

## Validation rules

- `tags` must be an array of strings when provided
- Each tag must be a non-empty string after trimming
- Tags are case-sensitive
- Duplicate tags within a single task are allowed (UI may handle deduplication)
- No limit on number of tags per task (within reasonable limits)
- No limit on tag length (within reasonable limits)

## Error cases

- `validation_error`: tags is not an array
- `validation_error`: tag is not a string
- `validation_error`: tag is empty or whitespace-only

## Out of scope

- Tag hierarchy/nesting
- Tag colors or metadata
- Tag auto-suggestion
- Tag management (create/delete tags independently)
- Tag-based task relationships

## Acceptance criteria

- Tasks can be created with tags
- Tasks can be updated to add/remove tags
- Invalid tag formats are rejected with clear error messages
- Tasks without tags are handled correctly
- Tag filtering works correctly
