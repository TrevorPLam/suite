# File Metadata Spec

## User Story
As a user, I want to see file metadata (creation date, modification date, MIME type) so that I can understand when files were created/modified and what type of content they contain.

## API Contract

### Upload Drive File (Updated)
```typescript
uploadDriveFile(input: UploadDriveFileInput): Promise<DriveFile>
```

**Input (Updated):**
```typescript
{
  name: string;
  size: number;
  folderId?: string;  // Optional folder ID
  mimeType?: string;  // Optional MIME type
}
```

**Output (Updated):**
```typescript
{
  id: string;
  name: string;
  size: number;
  folderId?: string;
  mimeType?: string;
  createdAt: string;    // ISO 8601 timestamp
  modifiedAt: string;   // ISO 8601 timestamp
}
```

**Behavior:**
- `createdAt` is set automatically on upload (current timestamp)
- `modifiedAt` is set to `createdAt` on upload
- `mimeType` is optional, defaults to undefined if not provided

### Rename Drive File (Updated)
```typescript
renameDriveFile(input: RenameDriveFileInput): Promise<DriveFile | null>
```

**Behavior:**
- Updates `modifiedAt` to current timestamp on successful rename
- Other metadata fields remain unchanged

## Validation Rules

### MIME Type Validation
- Optional field
- If provided, must be valid MIME type format (e.g., "application/pdf", "image/jpeg")
- Must match pattern: `^[a-z]+\/[a-z0-9\.\-\+]+$`
- Case-insensitive (normalized to lowercase)
- Common types: application/*, image/*, text/*, video/*, audio/*

### Timestamp Validation
- `createdAt` is immutable once set
- `modifiedAt` is automatically updated on rename operations
- Both use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- Timezone: UTC

## Out of Scope
- File content storage (BLOB vs external storage)
- Automatic MIME type detection from file content
- File versioning (multiple versions with different timestamps)
- Metadata editing by user (except name via rename)
- Custom metadata fields

## Test Cases

### Upload with Metadata
- Upload file without mimeType (mimeType undefined)
- Upload file with valid mimeType
- Upload file with invalid mimeType format (reject)
- Upload file with uppercase mimeType (normalize to lowercase)
- Verify createdAt is set on upload
- Verify modifiedAt equals createdAt on upload
- Verify createdAt is immutable (cannot be changed via update)

### Rename Updates Metadata
- Rename file and verify modifiedAt is updated
- Rename file and verify createdAt is unchanged
- Rename file and verify other metadata is unchanged

### Metadata in Responses
- listDriveFiles returns files with metadata
- getDriveFile returns file with metadata
- Metadata fields are present in all file responses
