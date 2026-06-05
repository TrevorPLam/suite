# Calendar App - Manual Acceptance Checklist

This checklist provides a manual smoke flow to verify the Calendar MVP works end-to-end.

## Prerequisites

- Calendar API is running: `pnpm --filter @suite/calendar-api dev`
- Calendar Web is running: `pnpm --filter @suite/calendar-web dev`
- Browser open to the calendar web URL

## Happy Path Tests

### 1. Create Event

- [ ] Navigate to the calendar web app
- [ ] Fill in the event form with valid data:
  - Title: "Team Meeting"
  - Start time: A future date/time
  - End time: A later date/time
- [ ] Click the submit button
- [ ] Verify the event appears in the events list
- [ ] Verify the event has a stable ID
- [ ] Verify the event details match the input

### 2. Browse Events

- [ ] View the events list
- [ ] Verify events are sorted by start time
- [ ] Verify day/week view toggle works
- [ ] Verify empty state shows when no events exist

### 3. Edit Event

- [ ] Click on an existing event
- [ ] Verify the form populates with event data
- [ ] Modify the event title
- [ ] Click the submit button
- [ ] Verify the event updates in the list
- [ ] Verify the new title is displayed

### 4. Date Range Filtering

- [ ] Use the date range filter
- [ ] Select a start date and end date
- [ ] Verify only events within the range are shown
- [ ] Verify events outside the range are hidden

## Error Path Tests

### 1. Validation Errors

- [ ] Try to create an event with an empty title
- [ ] Verify a validation error message appears
- [ ] Try to create an event with end time before start time
- [ ] Verify a validation error message appears
- [ ] Try to create an event with invalid ISO timestamps
- [ ] Verify a validation error message appears

### 2. Conflict Detection

- [ ] Create an event for a specific time range
- [ ] Try to create a second event that overlaps with the first
- [ ] Verify a conflict error message appears
- [ ] Verify the conflicting event is not created

### 3. Server Errors

- [ ] Temporarily stop the API server
- [ ] Try to create an event
- [ ] Verify a server error message appears
- [ ] Restart the API server
- [ ] Verify the app recovers and can create events again

## Edge Cases

### 1. Empty State

- [ ] Clear all events (if any exist)
- [ ] Verify the empty state message displays
- [ ] Verify the empty state is not broken

### 2. Long Titles

- [ ] Create an event with a very long title (100+ characters)
- [ ] Verify the title displays correctly
- [ ] Verify the title can be edited

### 3. Special Characters

- [ ] Create an event with special characters in the title (e.g., emojis, quotes)
- [ ] Verify the title displays correctly
- [ ] Verify the title can be edited

## Accessibility Checks

- [ ] Verify keyboard navigation works (Tab, Enter, Escape)
- [ ] Verify focus indicators are visible
- [ ] Verify screen reader can read event titles
- [ ] Verify error messages are announced

## Performance Checks

- [ ] Verify the app loads within 2 seconds
- [ ] Verify event list renders smoothly with 10+ events
- [ ] Verify form submission completes within 1 second

## Completion Criteria

All checkboxes marked as complete indicates the Calendar MVP passes manual acceptance.
