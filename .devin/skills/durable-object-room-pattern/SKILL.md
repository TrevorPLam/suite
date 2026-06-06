---
name: durable-object-room-pattern
description: Guides Durable Object implementation for real-time coordination, ensuring one DO per "room" (chat, doc, board) with proper hibernation API usage
---

## Durable Object Room Pattern Guide

This skill guides Cloudflare Durable Object implementation for real-time coordination, ensuring one DO per logical "room" with proper hibernation API usage.

## Core Principle

**Create one Durable Object per logical unit that needs coordination:**
- Chat room
- Game session
- Document
- User's data
- Tenant's workspace

Each "atom" of your application gets its own single-threaded execution environment with private storage. No race conditions, no distributed locks needed.

## Basic Chat Room Example

```typescript
// apps/chat/src/durable-objects/chat-room.ts
import { DurableObject } from 'cloudflare:workers';

export interface Env {
  CHAT_ROOM: DurableObjectNamespace<ChatRoom>;
}

export class ChatRoom extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    // Initialize storage in constructor
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  }

  async sendMessage(userId: string, message: string) {
    // All messages to this room are processed sequentially
    // No race conditions, no distributed locks needed
    this.ctx.storage.sql.exec(
      'INSERT INTO messages (id, user_id, content, created_at) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), userId, message, Date.now()]
    );
  }

  async getMessages(limit: number = 50) {
    const result = this.ctx.storage.sql.exec(
      'SELECT * FROM messages ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return result.results;
  }
}
```

## Worker Entry Point

```typescript
// apps/chat/src/worker.ts
import { ChatRoom } from './durable-objects/chat-room';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const roomId = url.searchParams.get('room') ?? 'lobby';

    // Each room ID maps to exactly one Durable Object instance globally
    const id = env.CHAT_ROOM.idFromName(roomId);
    const stub = env.CHAT_ROOM.get(id);

    if (url.pathname === '/send') {
      const { userId, message } = await request.json();
      await stub.sendMessage(userId, message);
      return new Response('Message sent');
    }

    if (url.pathname === '/messages') {
      const messages = await stub.getMessages();
      return Response.json(messages);
    }

    return new Response('Not found', { status: 404 });
  },
};
```

## wrangler.toml Configuration

```toml
# apps/chat/wrangler.toml
name = "chat-api"
main = "src/worker.ts"

[[durable_objects.bindings]]
name = "CHAT_ROOM"
class_name = "ChatRoom"
```

## Design Principles

### 1. Model Around "Atom" of Coordination

Choose the right granularity for your Durable Objects:

```typescript
// ✅ GOOD: One DO per chat room
const roomId = url.searchParams.get('room');
const id = env.CHAT_ROOM.idFromName(roomId);

// ❌ BAD: Single global DO for all rooms
const id = env.CHAT_ROOM.idFromName('global');
```

### 2. Use Deterministic IDs

Use deterministic IDs for predictable routing:

```typescript
// ✅ GOOD: Deterministic ID from room name
const id = env.CHAT_ROOM.idFromName(roomId);

// ❌ BAD: Random ID (can't find the DO again)
const id = env.CHAT_ROOM.newUniqueId();
```

### 3. Use SQLite-Backed Storage

Use SQLite for persistent storage within the DO:

```typescript
export class ChatRoom extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    // Initialize SQLite storage
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_created_at ON messages(created_at);
    `);
  }
}
```

### 4. Initialize Storage in Constructor

Run migrations in the constructor:

```typescript
constructor(state: DurableObjectState, env: Env) {
  super(state, env);
  // Run migrations here
  this.ctx.storage.sql.exec(`
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at INTEGER;
  `);
}
```

### 5. Use RPC Methods Instead of fetch()

Use RPC methods for better type safety and performance:

```typescript
export class ChatRoom extends DurableObject<Env> {
  async sendMessage(userId: string, message: string) {
    // RPC method
    this.ctx.storage.sql.exec(
      'INSERT INTO messages (id, user_id, content, created_at) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), userId, message, Date.now()]
    );
  }

  async getMessages(limit: number = 50) {
    const result = this.ctx.storage.sql.exec(
      'SELECT * FROM messages ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return result.results;
  }
}

// Call RPC method
const stub = env.CHAT_ROOM.get(id);
await stub.sendMessage(userId, message);
const messages = await stub.getMessages();
```

### 6. Always Await RPC Calls

Always await RPC calls to ensure they complete:

```typescript
// ✅ GOOD: Await RPC call
await stub.sendMessage(userId, message);

// ❌ BAD: Fire and forget (may not complete)
stub.sendMessage(userId, message);
```

## WebSocket Support with Hibernation

### Basic WebSocket Pattern

```typescript
export class ChatRoom extends DurableObject<Env> {
  sessions: Set<WebSocket> = new Set();

  async fetch(request: Request) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.sessions.add(server);

      server.accept();
      server.addEventListener('message', (event) => {
        this.handleMessage(server, event.data);
      });

      server.addEventListener('close', () => {
        this.sessions.delete(server);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Expected WebSocket', { status: 400 });
  }

  handleMessage(ws: WebSocket, data: string) {
    const message = JSON.parse(data);
    // Broadcast to all sessions
    for (const session of this.sessions) {
      session.send(data);
    }
  }
}
```

### Hibernatable WebSockets API

For cost efficiency with many connections, use the Hibernatable WebSockets API:

```typescript
export class ChatRoom extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.ctx.setWebSocketHibernation(true);
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    // Called when message received while hibernated
    const data = JSON.parse(message);
    this.handleMessage(ws, data);
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    // Called when connection closes
  }
}
```

### Persist Per-Connection State

Use `serializeAttachment()` to persist per-connection state:

```typescript
export class ChatRoom extends DurableObject<Env> {
  async webSocketMessage(ws: WebSocket, message: string) {
    const data = JSON.parse(message);

    // Store user ID per connection
    ws.serializeAttachment({ userId: data.userId });

    // Broadcast to all sessions
    for (const session of this.sessions) {
      const attachment = session.deserializeAttachment();
      session.send(JSON.stringify({
        userId: attachment.userId,
        message: data.message,
      }));
    }
  }
}
```

## Alarms for Scheduled Tasks

Use alarms for per-entity scheduled tasks:

```typescript
export class ChatRoom extends DurableObject<Env> {
  async setReminder(userId: string, message: string, at: number) {
    const alarmId = crypto.randomUUID();
    this.ctx.storage.set(alarmId, { userId, message });
    this.ctx.storage.setAlarm(alarmId, at);
  }

  async alarm() {
    // Called when alarm fires
    const alarms = this.ctx.storage.list();
    for (const [id, data] of alarms) {
      if (this.ctx.storage.getAlarmTime(id) <= Date.now()) {
        // Send reminder
        this.sendReminder(data.userId, data.message);
        this.ctx.storage.delete(id);
      }
    }
  }

  sendReminder(userId: string, message: string) {
    // Send notification to user
  }
}
```

## Error Handling

Handle errors gracefully:

```typescript
export class ChatRoom extends DurableObject<Env> {
  async sendMessage(userId: string, message: string) {
    try {
      this.ctx.storage.sql.exec(
        'INSERT INTO messages (id, user_id, content, created_at) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), userId, message, Date.now()]
      );
    } catch (error) {
      // Log error and handle gracefully
      console.error('Failed to send message:', error);
      throw new Error('Failed to send message');
    }
  }
}
```

## Anti-Patterns to Avoid

### ❌ Single Global DO

```typescript
// BAD: Single DO for all coordination
const id = env.GLOBAL_DO.idFromName('global');
const stub = env.GLOBAL_DO.get(id);
```

This creates a bottleneck and defeats the purpose of Durable Objects.

### ❌ Multiple Coordination Units in One DO

```typescript
// BAD: One DO handles multiple chat rooms
export class GlobalChat extends DurableObject<Env> {
  rooms: Map<string, ChatRoom> = new Map();

  async sendMessage(roomId: string, userId: string, message: string) {
    const room = this.rooms.get(roomId);
    room?.sendMessage(userId, message);
  }
}
```

Each room should be its own DO.

### ❌ Not Using SQLite

```typescript
// BAD: Using in-memory storage only
export class ChatRoom extends DurableObject<Env> {
  messages: Message[] = [];

  async sendMessage(message: Message) {
    this.messages.push(message);
  }
}
```

Use SQLite for persistent storage.

### ❌ Calling migrate() in Worker

```typescript
// BAD: Running migrations in Worker
export default {
  async fetch(request: Request, env: Env) {
    await migrate(env.DB);
    // ...
  },
};
```

Migrations must run in CI, not in Workers.

## Testing

```typescript
// apps/chat/src/durable-objects/__tests__/chat-room.test.ts
import { describe, it, expect } from 'vitest';
import { ChatRoom } from '../chat-room';

describe('ChatRoom', () => {
  it('should send and retrieve messages', async () => {
    const env = createTestEnv();
    const state = createTestState();
    const room = new ChatRoom(state, env);

    await room.sendMessage('user-1', 'Hello');
    const messages = await room.getMessages();

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Hello');
  });
});
```

## Checklist

- [ ] One Durable Object per logical coordination unit
- [ ] Deterministic IDs used for routing
- [ ] SQLite storage initialized in constructor
- [ ] RPC methods used instead of fetch()
- [ ] All RPC calls awaited
- [ ] Hibernatable WebSockets API used for cost efficiency
- [ ] Per-connection state persisted with serializeAttachment()
- [ ] Alarms used for scheduled tasks
- [ ] Error handling implemented
- [ ] Tests cover DO behavior

## Related Skills

- **hono-api-development**: Integrate DOs with Hono API routes
- **spec-first-development**: Specify real-time requirements in feature specs
- **domain-package-implementation**: Domain logic called from DOs
