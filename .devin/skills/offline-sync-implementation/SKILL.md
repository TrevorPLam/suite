---
name: offline-sync-implementation
description: Guides offline-first sync engine implementation with CRDT patterns, conflict resolution, and background sync for mobile/desktop apps
---

## Offline-First Sync Implementation Guide

This skill guides offline-first sync engine implementation with CRDT (Conflict-Free Replicated Data Types) patterns for conflict resolution.

## Why Offline-First?

Offline-first apps work on planes, tunnels, and flaky Wi-Fi — then sync cleanly when the network returns, without hand-rolled merge logic or "last write wins" regret.

## CRDTs in One Minute

CRDTs (Conflict-Free Replicated Data Types) let multiple replicas update data independently — offline, concurrently, out of order — and still converge to the same state when updates are exchanged.

**Key properties:**
- **Commutative**: Order doesn't matter
- **Associative**: Grouping doesn't matter
- **Idempotent**: Replays don't break things

## When CRDTs Are the Right Hammer

CRDTs shine when you have:
- Offline edits that must be preserved
- Concurrent edits (same entity updated in parallel)
- Collaboration (real-time or near real-time)
- A need for "eventual consistency" with correctness

CRDTs are less ideal when:
- You need strict transactional integrity across multiple records
- Your data model is mostly append-only logs
- You can tolerate "read-only offline" instead of "write offline"

## TypeScript CRDT Toolkit Landscape

### Decision Map

**1) Text editing vs general data**
- Text editing: Need toolkit with strong text CRDT support (Yjs, Automerge)
- General data: Need map/list primitives (Automerge, Yjs)

**2) Operation-based vs state-based**
- Ops/updates: Smaller, faster for real-time (Yjs)
- State-based: Simpler conceptually, more bandwidth (Automerge)

**3) Storage model and compaction**
- Ask: What happens after 100k edits?
- Can you compact/merge history?
- Can you prune old metadata safely?

## Recommended Toolkit: Automerge

For this monorepo, use **Automerge** for general data:
- TypeScript-first
- Good documentation
- Supports JSON-like data structures
- Handles compaction well

## Installation

```bash
pnpm add @automerge/automerge
```

## Basic Usage

### Document Creation

```typescript
// packages/sync/src/automerge.ts
import { Doc, change } from '@automerge/automerge';

export function createDocument<T>(initial: T): Doc<T> {
  return change(initial, (doc) => {
    // Initialize document
  });
}
```

### Making Changes

```typescript
import { change } from '@automerge/automerge';

export function updateTodo(doc: Doc<Todo[]>, todoId: string, updates: Partial<Todo>) {
  return change(doc, (doc) => {
    const todo = doc.find((t) => t.id === todoId);
    if (todo) {
      Object.assign(todo, updates);
    }
  });
}
```

### Merging Changes

```typescript
import { merge } from '@automerge/automerge';

export function mergeDocuments<T>(doc1: Doc<T>, doc2: Doc<T>): Doc<T> {
  return merge(doc1, doc2);
}
```

## Sync Architecture

```
Client (Offline)
├── Local Automerge document
├── Changes queued locally
└── Background sync when online

Server
├── Stores document snapshots
├── Tracks change history
└── Serves changes to clients
```

## Client-Side Implementation

### Local Storage

```typescript
// packages/sync/src/client/storage.ts
import { Doc, save, load } from '@automerge/automerge';

export class LocalStorage {
  async saveDocument<T>(key: string, doc: Doc<T>): Promise<void> {
    const binary = save(doc);
    await localStorage.setItem(key, binary);
  }

  async loadDocument<T>(key: string): Promise<Doc<T> | null> {
    const binary = localStorage.getItem(key);
    if (!binary) return null;
    return load<T>(binary);
  }
}
```

### Change Queue

```typescript
// packages/sync/src/client/queue.ts
export class ChangeQueue {
  private queue: Array<{ docId: string; changes: Uint8Array }> = [];

  async enqueue(docId: string, changes: Uint8Array) {
    this.queue.push({ docId, changes });
    await this.persist();
  }

  async dequeue(): Promise<{ docId: string; changes: Uint8Array } | null> {
    const item = this.queue.shift();
    await this.persist();
    return item || null;
  }

  private async persist() {
    await localStorage.setItem('sync-queue', JSON.stringify(this.queue));
  }
}
```

### Sync Manager

```typescript
// packages/sync/src/client/sync-manager.ts
import { Doc, save, load, merge } from '@automerge/automerge';

export class SyncManager {
  constructor(
    private storage: LocalStorage,
    private queue: ChangeQueue,
    private apiClient: ApiClient
  ) {}

  async sync<T>(docId: string): Promise<void> {
    // 1. Load local document
    const localDoc = await this.storage.loadDocument<T>(docId);
    if (!localDoc) return;

    // 2. Push local changes to server
    const localChanges = save(localDoc);
    await this.apiClient.pushChanges(docId, localChanges);

    // 3. Pull remote changes from server
    const remoteChanges = await this.apiClient.pullChanges(docId);

    // 4. Merge changes
    const remoteDoc = load<T>(remoteChanges);
    const mergedDoc = merge(localDoc, remoteDoc);

    // 5. Save merged document
    await this.storage.saveDocument(docId, mergedDoc);
  }

  async backgroundSync(): Promise<void> {
    if (!navigator.onLine) return;

    const docIds = await this.apiClient.listDocuments();
    for (const docId of docIds) {
      await this.sync(docId);
    }
  }
}
```

## Server-Side Implementation

### Document Storage

```typescript
// packages/sync/src/server/storage.ts
import { Doc, save, load } from '@automerge/automerge';

export class DocumentStorage {
  constructor(private db: Database) {}

  async saveDocument<T>(docId: string, doc: Doc<T>): Promise<void> {
    const binary = save(doc);
    await this.db.documents.upsert({
      id: docId,
      data: binary,
      updatedAt: new Date(),
    });
  }

  async loadDocument<T>(docId: string): Promise<Doc<T> | null> {
    const row = await this.db.documents.findUnique({ where: { id: docId } });
    if (!row) return null;
    return load<T>(row.data);
  }
}
```

### Sync API

```typescript
// apps/sync/api/routes/sync.ts
import { Hono } from 'hono';
import { merge, save, load } from '@automerge/automerge';

const app = new Hono();

app.post('/sync/:docId/push', async (c) => {
  const docId = c.req.param('docId');
  const { changes } = await c.req.json();

  // Load existing document
  const existingDoc = await storage.loadDocument(docId);
  if (!existingDoc) {
    // Create new document
    const newDoc = load(changes);
    await storage.saveDocument(docId, newDoc);
    return c.json({ success: true });
  }

  // Merge changes
  const incomingDoc = load(changes);
  const mergedDoc = merge(existingDoc, incomingDoc);
  await storage.saveDocument(docId, mergedDoc);

  return c.json({ success: true });
});

app.get('/sync/:docId/pull', async (c) => {
  const docId = c.req.param('docId');
  const doc = await storage.loadDocument(docId);

  if (!doc) {
    return c.json({ error: 'Document not found' }, 404);
  }

  const binary = save(doc);
  return c.json({ changes: binary });
});

export default app;
```

## Domain Integration

### Todo Example

```typescript
// packages/domain-tasks/src/entities/todo.ts
import { Doc } from '@automerge/automerge';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TodoDocument = Doc<Todo[]>;
```

### Use Case with Sync

```typescript
// packages/domain-tasks/src/use-cases/create-todo.ts
import { change } from '@automerge/automerge';
import { TodoDocument, Todo } from '../entities/todo';

export async function createTodo(
  doc: TodoDocument,
  title: string
): Promise<TodoDocument> {
  return change(doc, (doc) => {
    const todo: Todo = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    doc.push(todo);
  });
}
```

## Conflict Resolution

CRDTs handle most conflicts automatically, but you may need custom resolution for specific cases:

### Custom Conflict Resolution

```typescript
// packages/sync/src/conflict-resolution.ts
import { change } from '@automerge/automerge';

export function resolveTitleConflict(
  doc: Doc<Todo[]>,
  todoId: string,
  localTitle: string,
  remoteTitle: string
): Doc<Todo[]> {
  return change(doc, (doc) => {
    const todo = doc.find((t) => t.id === todoId);
    if (todo) {
      // Merge titles with separator
      todo.title = `${localTitle} (merged: ${remoteTitle})`;
      todo.updatedAt = Date.now();
    }
  });
}
```

## Performance and Payload Control

### 1. Update Growth

After many edits, CRDT documents can grow large. Implement compaction:

```typescript
// packages/sync/src/compaction.ts
import { Doc, save, load } from '@automerge/automerge';

export function compactDocument<T>(doc: Doc<T>): Doc<T> {
  // Automerge handles compaction internally
  // For custom compaction, create a new document with current state
  const binary = save(doc);
  return load<T>(binary);
}
```

### 2. Partition Documents

For large datasets, partition into multiple documents:

```typescript
// Instead of one document with all todos
const allTodos: Doc<Todo[]>;

// Use one document per list
const list1Todos: Doc<Todo[]>;
const list2Todos: Doc<Todo[]>;
```

### 3. Index in Derived Layer

Don't index inside CRDT documents. Use a separate index:

```typescript
// packages/sync/src/index.ts
export class TodoIndex {
  private index: Map<string, string[]> = new Map();

  updateIndex(doc: Doc<Todo[]>) {
    this.index.clear();
    for (const todo of doc) {
      const words = todo.title.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (!this.index.has(word)) {
          this.index.set(word, []);
        }
        this.index.get(word)!.push(todo.id);
      }
    }
  }

  search(query: string): string[] {
    const words = query.toLowerCase().split(/\s+/);
    const results = new Set<string>();

    for (const word of words) {
      const ids = this.index.get(word) || [];
      for (const id of ids) {
        results.add(id);
      }
    }

    return Array.from(results);
  }
}
```

### 4. Be Intentional About Metadata

Don't store unnecessary metadata in CRDT documents:

```typescript
// ❌ BAD: Storing UI state in CRDT
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  uiExpanded: boolean; // UI state - don't store in CRDT
}

// ✅ GOOD: Separate UI state
interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

// UI state in separate local storage
interface UIState {
  expandedTodos: Set<string>;
}
```

## Background Sync

### Service Worker (Web)

```typescript
// apps/calendar/src/service-worker.ts
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-todos') {
    event.waitUntil(syncTodos());
  }
});

async function syncTodos() {
  const syncManager = new SyncManager(storage, queue, apiClient);
  await syncManager.backgroundSync();
}
```

### Native (Mobile)

```typescript
// Use platform-specific background sync
// - iOS: Background Tasks
// - Android: WorkManager
// - Desktop: Electron background process
```

## Testing

```typescript
// packages/sync/src/__tests__/sync.test.ts
import { describe, it, expect } from 'vitest';
import { createDocument, updateTodo, mergeDocuments } from '../automerge';

describe('CRDT Sync', () => {
  it('should merge concurrent edits', async () => {
    const doc1 = createDocument<Todo[]>([]);
    const doc2 = createDocument<Todo[]>([]);

    // Concurrent edits
    const updated1 = updateTodo(doc1, 'todo-1', { title: 'Title 1' });
    const updated2 = updateTodo(doc2, 'todo-1', { title: 'Title 2' });

    // Merge
    const merged = mergeDocuments(updated1, updated2);

    // Both changes should be present (CRDT handles this)
    expect(merged).toBeDefined();
  });

  it('should handle offline edits', async () => {
    const doc = createDocument<Todo[]>([]);

    // Edit while offline
    const updated = updateTodo(doc, 'todo-1', { title: 'Offline edit' });

    // Simulate sync
    const synced = await syncManager.sync('doc-1');

    expect(synced).toBeDefined();
  });
});
```

## Rollout Plan

1. **Phase 1**: Implement sync for a single entity (e.g., todos)
2. **Phase 2**: Add conflict resolution for edge cases
3. **Phase 3**: Implement background sync
4. **Phase 4**: Roll out to all entities
5. **Phase 5**: Monitor and optimize performance

## Anti-Patterns to Avoid

### ❌ Last Write Wins

```typescript
// BAD: Simple overwrite loses data
function mergeTodos(local: Todo, remote: Todo) {
  return remote.updatedAt > local.updatedAt ? remote : local;
}
```

### ❌ Manual Merge UI

```typescript
// BAD: Requires user intervention for every conflict
function showConflictDialog(local: Todo, remote: Todo) {
  // Ask user to choose
}
```

### ❌ Storing Everything in One Document

```typescript
// BAD: Single document for all data
const everything: Doc<AllData>;
```

Partition into logical documents.

## Checklist

- [ ] CRDT toolkit selected (Automerge)
- [ ] Local storage implemented
- [ ] Change queue implemented
- [ ] Sync manager created
- [ ] Server-side sync API implemented
- [ ] Domain integration completed
- [ ] Conflict resolution strategy defined
- [ ] Document compaction implemented
- [ ] Background sync configured
- [ ] Tests cover sync scenarios

## Related Skills

- **domain-package-implementation**: Integrate sync in domain layer
- **e2ee-encryption-implementation**: Encrypt synced data
- **spec-first-development**: Specify sync requirements in feature specs
