# Folder Hierarchy Spec

## User Story
As a user, I want to organize my files into folders so that I can manage my documents in a structured way.

## API Contract

### Create Folder
```typescript
createFolder(input: CreateFolderInput): Promise<DriveFolder>
```

**Input:**
```typescript
{
  name: string;        // Folder name (1-255 chars, no special chars)
  parentId?: string;   // Optional parent folder ID for nesting
}
```

**Output:**
```typescript
{
  id: string;          // UUID
  name: string;
  parentId?: string;
  createdAt: string;   // ISO 8601 timestamp
}
```

**Errors:**
- `DriveError: name must be a non-empty string`
- `DriveError: name contains invalid characters`
- `DriveError: name exceeds maximum length (255 characters)`
- `DriveError: parent folder not found` (if parentId provided)

### List Folders
```typescript
listFolders(parentId?: string): Promise<DriveFolder[]>
```

**Input:**
- `parentId?: string` - Optional parent folder ID to filter by

**Output:**
- Array of DriveFolder objects

### Rename Folder
```typescript
renameFolder(input: RenameFolderInput): Promise<DriveFolder | null>
```

**Input:**
```typescript
{
  id: string;
  name: string;
}
```

**Output:**
- Updated DriveFolder or null if not found

**Errors:**
- `DriveError: name must be a non-empty string`
- `DriveError: name contains invalid characters`
- `DriveError: name exceeds maximum length (255 characters)`

### Delete Folder
```typescript
deleteFolder(id: string): Promise<boolean>
```

**Input:**
- `id: string` - Folder ID

**Output:**
- `true` if deleted, `false` if not found

**Business Rule:**
- Cannot delete folder if it contains files (returns false)
- Cannot delete folder if it contains subfolders (returns false)

### Move File
```typescript
moveFile(input: MoveFileInput): Promise<DriveFile | null>
```

**Input:**
```typescript
{
  id: string;          // File ID
  folderId?: string;   // New folder ID (null = root)
}
```

**Output:**
- Updated DriveFile or null if not found

**Errors:**
- `DriveError: folder not found` (if folderId provided)

## Validation Rules

### Folder Name Validation
- Must be non-empty string
- Must be 1-255 characters
- Cannot contain: `< > : " / \ | ? *` (Windows reserved characters)
- Cannot start or end with space
- Cannot be `.` or `..` (special directory names)
- Case-sensitive

### Folder Hierarchy Rules
- Maximum nesting depth: 10 levels (to prevent infinite loops)
- Cannot create circular references (folder cannot be its own ancestor)
- Folder names must be unique within the same parent

## Out of Scope
- Folder sharing/permissions
- Folder versioning
- Folder thumbnails
- Folder size calculation
- Drag-and-drop reordering
- Bulk folder operations

## Test Cases

### Create Folder
- Create folder in root (no parentId)
- Create folder with parent (nested)
- Reject empty name
- Reject name with special characters
- Reject name exceeding 255 characters
- Reject non-existent parent folder
- Trim whitespace from name

### List Folders
- List all folders (no filter)
- List folders by parent
- Return empty array when no folders exist
- Return folders in creation order

### Rename Folder
- Rename folder successfully
- Trim whitespace from new name
- Return null for non-existent folder
- Reject invalid name

### Delete Folder
- Delete empty folder successfully
- Return false for non-existent folder
- Return false for folder with files
- Return false for folder with subfolders

### Move File
- Move file to folder
- Move file to root (folderId = null)
- Return null for non-existent file
- Reject non-existent folder
