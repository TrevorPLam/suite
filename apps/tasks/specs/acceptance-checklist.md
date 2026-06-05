# Tasks App - Manual Acceptance Checklist

This checklist provides a manual smoke flow to verify the Tasks MVP works end-to-end.

## Prerequisites

- Tasks API is running: `pnpm --filter @suite/tasks-api dev`
- Tasks Web is running: `pnpm --filter @suite/tasks-web dev`
- Browser open to the tasks web URL

## Happy Path Tests

### 1. Create Task

- [ ] Navigate to the tasks web app
- [ ] Fill in the task form with a valid title
- [ ] Click the submit button
- [ ] Verify the task appears in the tasks list
- [ ] Verify the task has a stable ID
- [ ] Verify the task is marked as incomplete by default

### 2. Browse Tasks

- [ ] View the tasks list
- [ ] Verify tasks are sorted by creation date (newest first)
- [ ] Verify filter chips (all/active/completed/archived) are visible
- [ ] Verify empty state shows when no tasks exist

### 3. Toggle Completion

- [ ] Click the completion checkbox on a task
- [ ] Verify the task is marked as completed
- [ ] Verify the task moves to the completed filter view
- [ ] Click the completion checkbox again
- [ ] Verify the task is marked as incomplete
- [ ] Verify the task appears in the active filter view

### 4. Edit Task

- [ ] Click the edit button on a task
- [ ] Verify the form populates with task data
- [ ] Modify the task title
- [ ] Click the submit button
- [ ] Verify the task updates in the list
- [ ] Verify the new title is displayed

### 5. Archive Task

- [ ] Click the archive button on a task
- [ ] Verify the task is marked as archived
- [ ] Verify the task moves to the archived filter view
- [ ] Verify the task is hidden from the active/completed views

### 6. Delete Task

- [ ] Click the delete button on a task
- [ ] Verify a confirmation dialog appears
- [ ] Confirm the deletion
- [ ] Verify the task is removed from the list
- [ ] Verify the task cannot be retrieved

### 7. Filter Tasks

- [ ] Click the "active" filter chip
- [ ] Verify only incomplete, non-archived tasks are shown
- [ ] Click the "completed" filter chip
- [ ] Verify only completed, non-archived tasks are shown
- [ ] Click the "archived" filter chip
- [ ] Verify only archived tasks are shown
- [ ] Click the "all" filter chip
- [ ] Verify all non-archived tasks are shown

## Error Path Tests

### 1. Validation Errors

- [ ] Try to create a task with an empty title
- [ ] Verify a validation error message appears
- [ ] Try to create a task with whitespace-only title
- [ ] Verify a validation error message appears

### 2. Server Errors

- [ ] Temporarily stop the API server
- [ ] Try to create a task
- [ ] Verify a server error message appears
- [ ] Restart the API server
- [ ] Verify the app recovers and can create tasks again

## Edge Cases

### 1. Empty State

- [ ] Clear all tasks (if any exist)
- [ ] Verify the empty state message displays
- [ ] Verify the empty state is not broken

### 2. Long Titles

- [ ] Create a task with a very long title (100+ characters)
- [ ] Verify the title displays correctly
- [ ] Verify the title can be edited

### 3. Special Characters

- [ ] Create a task with special characters in the title (e.g., emojis, quotes)
- [ ] Verify the title displays correctly
- [ ] Verify the title can be edited

### 4. Many Tasks

- [ ] Create 20+ tasks
- [ ] Verify the list renders smoothly
- [ ] Verify filtering works with many tasks
- [ ] Verify completion toggles work with many tasks

## Accessibility Checks

- [ ] Verify keyboard navigation works (Tab, Enter, Escape)
- [ ] Verify focus indicators are visible
- [ ] Verify screen reader can read task titles
- [ ] Verify filter chips are accessible
- [ ] Verify error messages are announced

## Performance Checks

- [ ] Verify the app loads within 2 seconds
- [ ] Verify task list renders smoothly with 50+ tasks
- [ ] Verify form submission completes within 1 second
- [ ] Verify filter switching is instant

## Completion Criteria

All checkboxes marked as complete indicates the Tasks MVP passes manual acceptance.
