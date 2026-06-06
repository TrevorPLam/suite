# Drive App Guide

This document defines the architecture and implementation details for the Drive application in the Sovereign Suite.

---

## Overview

The Drive app provides encrypted file storage with chunked uploads to R2, file tree organization, and sharing permission model.

---

## Domain Model

### File

```typescript
interface File {
  id: string;
  tenantId: string;
  userId: string;
  parentId: string | null; // NULL for root
  name: string; // Plaintext for searchability
  size: number;
  mimeType: string;
  r2Key: string; // R2 object key
  encryptedBlob: Uint8Array; // Encrypted: thumbnail, tags
  createdAt: Date;
  updatedAt: Date;
}
```

### Folder

```typescript
interface Folder {
  id: string;
  tenantId: string;
  userId: string;
  parentId: string | null;
  name: string;
  createdAt: Date;
}
```

---

## Chunked R2 Upload Pipeline

### Upload Flow

```
Client → Chunk File → Encrypt Chunks → Upload to R2 → Assemble → Update Database
```

### Implementation

```typescript
// packages/domain-drive/src/lib/upload.ts
export async function uploadFile(
  file: File,
  encryptionKey: CryptoKey
): Promise<string> {
  const chunkSize = 5 * 1024 * 1024; // 5 MB chunks
  const chunks: Uint8Array[] = [];
  
  // Chunk the file
  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const chunk = file.slice(offset, offset + chunkSize);
    const encryptedChunk = await encryptChunk(chunk, encryptionKey);
    chunks.push(encryptedChunk);
  }
  
  // Upload chunks to R2
  const uploadId = await initiateMultipartUpload(file.name);
  const partETags: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const etag = await uploadPart(uploadId, i + 1, chunks[i]);
    partETags.push(etag);
  }
  
  // Complete multipart upload
  const r2Key = await completeMultipartUpload(uploadId, partETags);
  
  return r2Key;
}
```

---

## File Tree Schema

### Hierarchical Structure

```sql
CREATE TABLE drive.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES drive.files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  r2_key TEXT NOT NULL,
  encrypted_blob BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_files_parent ON drive.files(parent_id);
CREATE INDEX idx_files_tenant ON drive.files(tenant_id);
```

### Recursive Query for Tree

```sql
WITH RECURSIVE file_tree AS (
  SELECT id, name, parent_id, 0 as level
  FROM drive.files
  WHERE parent_id IS NULL AND tenant_id = $1
  
  UNION ALL
  
  SELECT f.id, f.name, f.parent_id, ft.level + 1
  FROM drive.files f
  JOIN file_tree ft ON f.parent_id = ft.id
)
SELECT * FROM file_tree ORDER BY level, name;
```

---

## Sharing Permission Model

### Share Types

| Type | Description | Access |
|------|-------------|--------|
| `view` | View only | Download, view |
| `edit` | Edit | View, edit, upload |
| `owner` | Full control | All permissions |

### Share Schema

```sql
CREATE TABLE drive.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES drive.files(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  shared_with_tenant_id UUID,
  shared_with_email TEXT,
  share_type TEXT NOT NULL, -- 'view', 'edit', 'owner'
  share_link TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Share Link Generation

```typescript
// packages/domain-drive/src/lib/shares.ts
import { randomUUID } from 'crypto';

export function generateShareLink(): string {
  const shareId = randomUUID();
  return `https://drive.yourdomain.com/s/${shareId}`;
}
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/files` | GET | List files |
| `/api/files` | POST | Upload file |
| `/api/files/:id` | GET | Get file |
| `/api/files/:id` | DELETE | Delete file |
| `/api/files/:id/download` | GET | Download file |
| `/api/shares` | POST | Create share |
| `/api/shares/:id` | DELETE | Delete share |
| `/s/:shareId` | GET | Access shared file |

---

## Encryption Strategy

### Plaintext Fields

- `name` (for searchability and file listing)
- `size`, `mimeType` (for file operations)

### Encrypted Fields

- `encrypted_blob` contains:
  - Thumbnail (encrypted)
  - Tags
  - Custom metadata

### File Content

File content is encrypted client-side before upload to R2 using the event-specific key.

---

*This document must be updated when the Drive app architecture changes.*
