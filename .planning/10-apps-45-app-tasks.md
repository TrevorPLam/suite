# Tasks App Guide

This document defines the architecture and implementation details for the Tasks application in the Sovereign Suite.

---

## Overview

The Tasks app provides encrypted task management with project hierarchy and Yjs CRDT for collaborative task editing.

---

## Domain Model

### Task

```typescript
interface Task {
  id: string;
  tenantId: string;
  userId: string;
  projectId: string | null;
  title: string; // Plaintext for searchability
  completed: boolean;
  archived: boolean;
  encryptedBlob: Uint8Array; // Encrypted: description, subtasks
  createdAt: Date;
  updatedAt: Date;
}
```

### Project

```typescript
interface Project {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  encryptedBlob: Uint8Array; // Encrypted: project settings
  createdAt: Date;
}
```

---

## Project Hierarchy

### Schema

```sql
CREATE TABLE tasks.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  encrypted_blob BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES tasks.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false NOT NULL,
  archived BOOLEAN DEFAULT false NOT NULL,
  encrypted_blob BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Recursive Query for Subtasks

```sql
WITH RECURSIVE task_tree AS (
  SELECT id, title, project_id, 0 as level
  FROM tasks.tasks
  WHERE project_id IS NULL AND tenant_id = $1
  
  UNION ALL
  
  SELECT t.id, t.title, t.project_id, tt.level + 1
  FROM tasks.tasks t
  JOIN task_tree tt ON t.project_id = tt.id
)
SELECT * FROM task_tree ORDER BY level, title;
```

---

## Yjs CRDT for Collaborative Editing

### Yjs Integration

```typescript
// packages/domain-tasks/src/lib/crdt.ts
import * as Y from 'yjs';

export function createTaskDocument(): Y.Doc {
  const doc = new Y.Doc();
  
  const map = doc.getMap('task');
  map.set('title', '');
  map.set('description', '');
  map.set('subtasks', new Y.Array());
  
  return doc;
}

export function applyUpdate(doc: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(doc, update);
}

export function encodeState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}
```

### Durable Object Storage

```typescript
// apps/tasks/api/src/task-do.ts
export class TaskDocument extends DurableObject<Env> {
  private doc: Y.Doc;
  
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    
    // Load from storage or create new
    const stored = await this.ctx.storage.get<Uint8Array>('doc');
    if (stored) {
      this.doc = new Y.Doc();
      Y.applyUpdate(this.doc, stored);
    } else {
      this.doc = createTaskDocument();
    }
  }
  
  async applyUpdate(update: Uint8Array) {
    Y.applyUpdate(this.doc, update);
    
    // Persist to storage
    const state = Y.encodeStateAsUpdate(this.doc);
    await this.ctx.storage.put('doc', state);
    
    // Broadcast to other clients
    this.broadcast({ type: 'update', update });
  }
}
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List projects |
| `/api/projects` | POST | Create project |
| `/api/projects/:id` | GET | Get project |
| `/api/projects/:id` | PUT | Update project |
| `/api/projects/:id` | DELETE | Delete project |
| `/api/tasks` | GET | List tasks |
| `/api/tasks` | POST | Create task |
| `/api/tasks/:id` | GET | Get task |
| `/api/tasks/:id` | PUT | Update task |
| `/api/tasks/:id` | DELETE | Delete task |
| `/api/tasks/:id/crdt` | WebSocket | Yjs CRDT sync |

---

## Encryption Strategy

### Plaintext Fields

- `title` (for searchability)
- `completed`, `archived` (for filtering)

### Encrypted Fields

- `encrypted_blob` contains:
  - Description
  - Subtasks
  - Due date
  - Priority
  - Custom fields

---

*This document must be updated when the Tasks app architecture changes.*
