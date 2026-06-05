# Drive App - Manual Acceptance Checklist

This checklist provides a manual smoke flow to verify the Drive MVP works end-to-end.

## Prerequisites

- Drive API is running: `pnpm --filter @suite/drive-api dev`
- Drive Web is running: `pnpm --filter @suite/drive-web dev`
- Browser open to the drive web URL

## Happy Path Tests

### 1. Upload File

- [ ] Navigate to the drive web app
- [ ] Fill in the upload form with valid data:
  - File name: "document.pdf"
  - File size: 1024
- [ ] Click the submit button
- [ ] Verify the file appears in the files list
- [ ] Verify the file has a stable ID
- [ ] Verify the file details match the input

### 2. Browse Files

- [ ] View the files list
- [ ] Verify files are sorted by upload date (newest first)
- [ ] Verify empty state shows when no files exist

### 3. Rename File

- [ ] Click the rename button on a file
- [ ] Verify a rename dialog appears
- [ ] Enter a new file name
- [ ] Click the confirm button
- [ ] Verify the file name updates in the list
- [ ] Verify the new name is displayed

### 4. Delete File

- [ ] Click the delete button on a file
- [ ] Verify a confirmation dialog appears
- [ ] Confirm the deletion
- [ ] Verify the file is removed from the list
- [ ] Verify the file cannot be retrieved

### 5. View File Metadata

- [ ] Click on a file to view details
- [ ] Verify the metadata panel shows:
  - File name
  - File size
  - Upload date (if available)
- [ ] Verify the metadata is accurate

## Error Path Tests

### 1. Validation Errors

- [ ] Try to upload a file with an empty name
- [ ] Verify a validation error message appears
- [ ] Try to upload a file with a negative size
- [ ] Verify a validation error message appears
- [ ] Try to upload a file with a non-integer size
- [ ] Verify a validation error message appears

### 2. Rename Errors

- [ ] Try to rename a file with an empty name
- [ ] Verify a validation error message appears
- [ ] Try to rename a non-existent file
- [ ] Verify a 404 error message appears

### 3. Delete Errors

- [ ] Try to delete a non-existent file
- [ ] Verify a 404 error message appears

### 4. Server Errors

- [ ] Temporarily stop the API server
- [ ] Try to upload a file
- [ ] Verify a server error message appears
- [ ] Restart the API server
- [ ] Verify the app recovers and can upload files again

## Edge Cases

### 1. Empty State

- [ ] Clear all files (if any exist)
- [ ] Verify the empty state message displays
- [ ] Verify the empty state is not broken

### 2. Long File Names

- [ ] Upload a file with a very long name (100+ characters)
- [ ] Verify the name displays correctly
- [ ] Verify the name can be renamed

### 3. Special Characters

- [ ] Upload a file with special characters in the name (e.g., emojis, quotes)
- [ ] Verify the name displays correctly
- [ ] Verify the name can be renamed

### 4. Large File Sizes

- [ ] Upload a file with a large size (e.g., 1GB)
- [ ] Verify the size displays correctly
- [ ] Verify the size is formatted for readability

### 5. Many Files

- [ ] Upload 20+ files
- [ ] Verify the list renders smoothly
- [ ] Verify file actions work with many files

## Accessibility Checks

- [ ] Verify keyboard navigation works (Tab, Enter, Escape)
- [ ] Verify focus indicators are visible
- [ ] Verify screen reader can read file names
- [ ] Verify action buttons are accessible
- [ ] Verify error messages are announced
- [ ] Verify modal dialogs trap focus

## Performance Checks

- [ ] Verify the app loads within 2 seconds
- [ ] Verify file list renders smoothly with 50+ files
- [ ] Verify upload completes within 1 second
- [ ] Verify rename/delete actions are instant

## Completion Criteria

All checkboxes marked as complete indicates the Drive MVP passes manual acceptance.
