# Error Handling Taxonomy

This document defines the complete error code registry, HTTP status code mappings, Drizzle-to-HTTP error mappings, and client-side error rendering patterns for the Sovereign Suite API.

---

## Error Code Registry

All error codes follow the pattern: `<domain>_<error_name>` or `global_<error_name>` for cross-domain errors. Error codes are kebab-case.

### Global Errors (Cross-Domain)

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `global_unauthorized` | 401 | No valid session or token provided |
| `global_forbidden` | 403 | Authenticated but lacks permission |
| `global_not_found` | 404 | Resource does not exist |
| `global_rate_limited` | 429 | Rate limit exceeded |
| `global_internal_error` | 500 | Unexpected server error |
| `global_service_unavailable` | 503 | Service temporarily unavailable |
| `global_invalid_request` | 400 | Malformed request body or parameters |
| `global_idempotency_conflict` | 409 | Idempotency key already used with different payload |

### Calendar Domain Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `calendar_event_not_found` | 404 | Event does not exist |
| `calendar_invalid_date_range` | 400 | End date before start date |
| `calendar_event_conflict` | 409 | Event overlaps with existing event |
| `calendar_attendee_limit_exceeded` | 400 | Too many attendees for event type |
| `calendar_recursion_limit_exceeded` | 400 | Recurrence pattern too complex |

### Drive Domain Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `drive_file_not_found` | 404 | File does not exist |
| `drive_quota_exceeded` | 413 | Storage quota exceeded |
| `drive_invalid_file_type` | 400 | File type not allowed |
| `drive_virus_detected` | 403 | File contains malware |
| `drive_folder_not_empty` | 409 | Cannot delete non-empty folder |
| `drive_share_link_expired` | 410 | Share link has expired |

### Vault Domain Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `vault_credential_not_found` | 404 | Credential does not exist |
| `vault_invalid_master_key` | 401 | Master key decryption failed |
| `vault_recovery_unavailable` | 403 | No recovery method available |
| `vault_totp_verification_failed` | 401 | TOTP code invalid |
| `vault_key_derivation_failed` | 500 | Key derivation error |

### Mail Domain Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `mail_mailbox_not_found` | 404 | Mailbox does not exist |
| `mail_message_not_found` | 404 | Message does not exist |
| `mail_attachment_too_large` | 413 | Attachment exceeds size limit |
| `mail_invalid_recipient` | 400 | Recipient email address invalid |
| `mail_send_rate_exceeded` | 429 | Too many emails sent |

### Tasks Domain Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `tasks_task_not_found` | 404 | Task does not exist |
| `tasks_project_not_found` | 404 | Project does not exist |
| `tasks_circular_dependency` | 400 | Task dependency creates cycle |
| `tasks_completion_conflict` | 409 | Cannot complete task with incomplete dependencies |

---

## HTTP Status Code Mapping

### 2xx Success

| Status | Usage |
|--------|-------|
| 200 OK | Successful GET, PUT, PATCH, DELETE |
| 201 Created | Successful POST (resource created) |
| 202 Accepted | Request accepted for async processing |
| 204 No Content | Successful DELETE with no response body |

### 4xx Client Errors

| Status | Usage |
|--------|-------|
| 400 Bad Request | Invalid request body, parameters, or business logic violation |
| 401 Unauthorized | Missing or invalid authentication |
| 403 Forbidden | Authenticated but lacks permission |
| 404 Not Found | Resource does not exist |
| 409 Conflict | Resource state conflict (duplicate, version mismatch) |
| 413 Payload Too Large | Request body exceeds limit |
| 429 Too Many Requests | Rate limit exceeded |
| 422 Unprocessable Entity | Semantically invalid request (e.g., invalid email format) |

### 5xx Server Errors

| Status | Usage |
|--------|-------|
| 500 Internal Server Error | Unexpected server error |
| 502 Bad Gateway | Upstream service unavailable |
| 503 Service Unavailable | Service temporarily unavailable (maintenance) |
| 504 Gateway Timeout | Upstream service timeout |

---

## Drizzle-to-HTTP Error Mapping

Database errors from Drizzle ORM must be mapped to appropriate HTTP error codes and domain-specific error codes.

### Unique Constraint Violation → 409 Conflict

```typescript
// packages/domain-calendar/src/lib/create-event.ts
import { eq } from 'drizzle-orm';
import { calendarEvents } from '@suite/db/schema';
import { db } from '@suite/db';

export async function createEvent(input: CreateEventInput) {
  try {
    const [event] = await db.insert(calendarEvents).values(input).returning();
    return { success: true, data: event };
  } catch (error) {
    // Drizzle unique constraint violation
    if (error.code === '23505') {
      return {
        success: false,
        error: {
          code: 'calendar_event_conflict',
          message: 'An event with this identifier already exists',
        },
      };
    }
    throw error;
  }
}
```

### Foreign Key Violation → 400 Bad Request

```typescript
// packages/domain-drive/src/lib/create-file.ts
export async function createFile(input: CreateFileInput) {
  try {
    const [file] = await db.insert(driveFiles).values(input).returning();
    return { success: true, data: file };
  } catch (error) {
    // Drizzle foreign key violation
    if (error.code === '23503') {
      return {
        success: false,
        error: {
          code: 'drive_folder_not_found',
          message: 'The specified parent folder does not exist',
        },
      };
    }
    throw error;
  }
}
```

### Not Null Violation → 400 Bad Request

```typescript
// packages/domain-tasks/src/lib/create-task.ts
export async function createTask(input: CreateTaskInput) {
  try {
    const [task] = await db.insert(tasks).values(input).returning();
    return { success: true, data: task };
  } catch (error) {
    // Drizzle not null violation
    if (error.code === '23502') {
      return {
        success: false,
        error: {
          code: 'tasks_invalid_input',
          message: 'Required field is missing',
          field: error.column,
        },
      };
    }
    throw error;
  }
}
```

### Connection Error → 503 Service Unavailable

```typescript
// packages/db/src/client.ts
export async function query(sql: string, params: any[]) {
  try {
    return await pool.query(sql, params);
  } catch (error) {
    // PostgreSQL connection error
    if (error.code === 'ECONNREFUSED' || error.code === '57P01') {
      throw new ServiceUnavailableError('Database connection failed');
    }
    throw error;
  }
}
```

---

## Error Response Format

All error responses follow this structure:

```typescript
interface ErrorResponse {
  error: {
    code: string;           // Error code from registry
    message: string;       // Human-readable description
    details?: any;         // Additional error details
    requestId?: string;     // Request ID for tracing
    timestamp: string;      // ISO 8601 timestamp
  };
}
```

### Example Error Responses

```json
// 404 Not Found
{
  "error": {
    "code": "calendar_event_not_found",
    "message": "The requested event could not be found",
    "details": {
      "eventId": "abc-123"
    },
    "requestId": "req_abc123",
    "timestamp": "2026-06-01T10:00:00Z"
  }
}

// 409 Conflict
{
  "error": {
    "code": "calendar_event_conflict",
    "message": "This event conflicts with an existing event",
    "details": {
      "conflictingEventId": "def-456",
      "conflictingTime": "2026-06-01T10:00:00Z"
    },
    "requestId": "req_abc123",
    "timestamp": "2026-06-01T10:00:00Z"
  }
}

// 400 Bad Request
{
  "error": {
    "code": "calendar_invalid_date_range",
    "message": "End date must be after start date",
    "details": {
      "startAt": "2026-06-01T11:00:00Z",
      "endAt": "2026-06-01T10:00:00Z"
    },
    "requestId": "req_abc123",
    "timestamp": "2026-06-01T10:00:00Z"
  }
}
```

---

## Partial Failure Handling in Cross-Domain RPC

When a cross-domain RPC call fails, the calling Worker must handle the error gracefully and return a domain-specific error code.

### Example: Calendar → Drive RPC Failure

```typescript
// apps/calendar/api/src/index.ts
app.get('/api/events/:id/attachment', async (c) => {
  const eventId = c.req.param('id');
  const tenantId = c.get('tenantId');

  const event = await getEvent(eventId, tenantId);
  if (!event.success) {
    return c.json(event.error, 404);
  }

  try {
    const fileMetadata = await c.env.DRIVE_API.getFile(event.data.fileId, tenantId);
    return c.json(fileMetadata);
  } catch (error) {
    // Map Drive RPC error to Calendar error response
    if (error.code === 'drive_file_not_found') {
      return c.json({
        error: {
          code: 'calendar_attachment_not_found',
          message: 'The attachment for this event could not be found',
        },
      }, 404);
    }
    throw error;
  }
});
```

---

## Idempotency Key Design

Idempotency keys prevent duplicate operations for POST requests. The idempotency token is stored in a dedicated table.

### Idempotency Tokens Table Schema

```sql
CREATE TABLE app.idempotency_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  response JSONB,
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_idempotency_key ON app.idempotency_tokens(key);
CREATE INDEX idx_idempotency_expires ON app.idempotency_tokens(expires_at);
```

### Idempotency Middleware

```typescript
// packages/api/src/middleware/idempotency.ts
import { createMiddleware } from 'hono/factory';
import { crypto } from 'node:crypto';

export const idempotencyMiddleware = createMiddleware(async (c, next) => {
  const idempotencyKey = c.req.header('Idempotency-Key');
  
  if (!idempotencyKey) {
    await next();
    return;
  }

  const db = c.get('db');
  const requestBody = await c.req.json();
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(requestBody))
    .digest('hex');

  // Check if idempotency key exists
  const existing = await db.query(
    'SELECT * FROM app.idempotency_tokens WHERE key = $1',
    [idempotencyKey]
  );

  if (existing.rows.length > 0) {
    const token = existing.rows[0];
    
    // Return cached response if completed
    if (token.status === 'completed') {
      return c.json(token.response, 200);
    }
    
    // Return conflict if request hash differs
    if (token.request_hash !== requestHash) {
      return c.json({
        error: {
          code: 'global_idempotency_conflict',
          message: 'Idempotency key already used with different payload',
        },
      }, 409);
    }
    
    // Return 202 if still pending
    return c.json({ status: 'pending' }, 202);
  }

  // Store new idempotency token
  await db.query(
    'INSERT INTO app.idempotency_tokens (key, request_hash, status, expires_at) VALUES ($1, $2, $3, $4)',
    [idempotencyKey, requestHash, 'pending', new Date(Date.now() + 3600000)]
  );

  await next();

  // Update token with response
  const response = await c.res.json();
  await db.query(
    'UPDATE app.idempotency_tokens SET response = $1, status = $2 WHERE key = $3',
    [JSON.stringify(response), 'completed', idempotencyKey]
  );
});
```

### Idempotent Endpoints

The following endpoints should support idempotency:

- `POST /api/events` (Calendar)
- `POST /api/files` (Drive)
- `POST /api/credentials` (Vault)
- `POST /api/messages` (Mail)
- `POST /api/tasks` (Tasks)

---

## Client-Side Error Rendering

### React Query Error Handling

```typescript
// apps/calendar/web/src/hooks/use-events.ts
import { useQuery } from '@tanstack/react-query';
import { getEvents } from '@suite/api-client';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: getEvents,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error.status >= 400 && error.status < 500) {
        return false;
      }
      // Retry 3xx and 5xx errors
      return failureCount < 3;
    },
  });
}
```

### UI Error Display

```typescript
// apps/calendar/web/src/components/error-boundary.tsx
import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  error: { code: string; message: string };
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  const errorMessages: Record<string, string> = {
    calendar_event_not_found: 'The event you are looking for does not exist.',
    calendar_invalid_date_range: 'Please check that the end date is after the start date.',
    calendar_event_conflict: 'This event conflicts with another event on your calendar.',
    global_unauthorized: 'Please sign in to continue.',
    global_forbidden: 'You do not have permission to perform this action.',
    global_rate_limited: 'You have made too many requests. Please wait a moment.',
  };

  const message = errorMessages[error.code] || error.message;

  return (
    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
      <AlertCircle className="w-5 h-5 text-red-600" />
      <p className="text-sm text-red-800">{message}</p>
    </div>
  );
}
```

### Error Toast Notifications

```typescript
// apps/calendar/web/src/lib/toast.ts
import { toast } from 'sonner';

export function showError(error: { code: string; message: string }) {
  const errorMessages: Record<string, string> = {
    calendar_event_not_found: 'Event not found',
    calendar_invalid_date_range: 'Invalid date range',
    calendar_event_conflict: 'Event conflict',
    global_unauthorized: 'Authentication required',
    global_forbidden: 'Permission denied',
    global_rate_limited: 'Rate limit exceeded',
  };

  const title = errorMessages[error.code] || 'Error';
  toast.error(title, {
    description: error.message,
  });
}
```

---

## Error Logging

All errors must be logged with structured context:

```typescript
// packages/api/src/lib/logger.ts
export function logError(c: Context, error: any) {
  console.error({
    requestId: c.get('requestId'),
    userId: c.get('userId'),
    tenantId: c.get('tenantId'),
    operation: c.req.method + ' ' + c.req.path,
    errorCode: error.code,
    errorMessage: error.message,
    stackTrace: error.stack,
    timestamp: new Date().toISOString(),
  });
}
```

---

## Error Code Creation Guidelines

When adding a new error code:

1. **Use the domain prefix** (e.g., `calendar_`, `drive_`) for domain-specific errors
2. **Use `global_` prefix** for cross-domain errors
3. **Use kebab-case** for the error name
4. **Map to appropriate HTTP status** (400 for client errors, 500 for server errors)
5. **Add human-readable message** that explains the error to the user
6. **Add to this document** to maintain the registry
7. **Add client-side message** to the error display component

---

## Error Code Lifecycle

Error codes are never removed to maintain API stability. Deprecated error codes are marked as such in the registry and replaced with new codes over multiple API versions.

---

*This document must be updated whenever new error codes are added or when error handling patterns change.*
