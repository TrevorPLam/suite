---
trigger: glob
globs: **/*.ts
---

# Cloudflare Durable Objects Patterns

Durable Objects provide strongly consistent coordination but must be used correctly to avoid performance and cost issues.

## Core Principle: One DO Per Coordination Unit

Create one Durable Object per logical unit that needs coordination:
- A chat room
- A game session
- A document
- A user's data
- A tenant's workspace

Each "atom" of coordination gets its own single-threaded execution environment with private storage.

## Correct Usage Pattern

```typescript
import { DurableObject } from "cloudflare:workers";

export interface Env {
  CHAT_ROOM: DurableObjectNamespace<ChatRoom>;
}

// Each chat room is its own Durable Object instance
export class ChatRoom extends DurableObject<Env> {
  async sendMessage(userId: string, message: string) {
    // All messages to this room are processed sequentially
    // No race conditions, no distributed locks needed
    this.ctx.storage.sql.exec(
      "INSERT INTO messages (user_id, content, created_at) VALUES (?, ?, ?)",
      userId,
      message,
      Date.now()
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const roomId = url.searchParams.get("room") ?? "lobby";
    
    // Each room ID maps to exactly one Durable Object instance globally
    const id = env.CHAT_ROOM.idFromName(roomId);
    const stub = env.CHAT_ROOM.get(id);
    
    await stub.sendMessage("user-123", "Hello, room!");
    return new Response("Message sent");
  },
};
```

## Anti-Patterns to Avoid

### ❌ Single Global DO

**NEVER create a single "global" Durable Object that handles all requests:**

```typescript
// ❌ FORBIDDEN - Global singleton DO
export class GlobalState extends DurableObject {
  // This becomes a bottleneck and scales poorly
  async handleAllRequests() {
    // All traffic goes through one instance
  }
}
```

### ❌ Multiple Coordination Units in One DO

**NEVER put multiple coordination units in one Durable Object:**

```typescript
// ❌ FORBIDDEN - Multiple rooms in one DO
export class MultiRoomChat extends DurableObject {
  // Don't manage multiple rooms in one instance
  // Create one DO per room instead
}
```

## Design Guidelines

Based on 2026 Cloudflare Durable Objects best practices:

### 1. Use Deterministic IDs

Use `idFromName()` for predictable routing:
```typescript
const id = env.DO_NAMESPACE.idFromName(roomId);
```

### 2. Use SQLite-Backed Storage

Initialize storage in the constructor:
```typescript
constructor(ctx: DurableObjectState, env: Env) {
  super(ctx, env);
  this.ctx.storage.sql.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY,
      content TEXT,
      created_at INTEGER
    )
  `);
}
```

### 3. Use RPC Methods Instead of fetch()

Prefer RPC methods for internal DO communication:
```typescript
// In the DO
async sendMessage(userId: string, message: string) {
  // RPC method implementation
}

// Call from fetch handler
await stub.sendMessage(userId, message);
```

### 4. Use Hibernatable WebSockets API

For real-time features, use the Hibernation API to reduce costs:
```typescript
this.ctx.acceptWebSocket(webSocket, [
  ["serializeAttachment", () => JSON.stringify(this.state)]
]);
```

### 5. Use Alarms for Scheduled Tasks

Use alarms for per-entity scheduled tasks:
```typescript
this.ctx.storage.setAlarm(Date.now() + 60000, async () => {
  // Run scheduled task
});
```

## Storage Best Practices

- **Understand in-memory vs persistent storage**: In-memory state is lost on eviction, persistent storage survives
- **Create indexes for frequent queries**: Use SQL indexes for columns queried often
- **Use blockConcurrencyWhile() sparingly**: Only when absolutely necessary to prevent concurrent access
- **Clean up with deleteAll()**: When deleting entities, clean up storage to avoid orphaned data

## When NOT to Use Durable Objects

Use Workers KV or other storage for:
- Global configuration accessed on every request
- Static content that doesn't need coordination
- High-throughput read-only data
- Simple key-value storage without coordination needs

## Enforcement

- Code reviews check for global singleton DOs
- Static analysis flags multiple coordination units in one DO
- Performance monitoring identifies DO bottlenecks
- Cost monitoring flags inefficient DO usage
