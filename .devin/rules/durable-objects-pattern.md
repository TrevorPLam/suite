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

**AGENTS.md Rule 7:** One Durable Object per "room" (chat, doc, board). Never put multiple coordination units in one DO.

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

For real-time features, use the Hibernation API to reduce costs. **Critical:** Use `ctx.acceptWebSocket(server)` instead of `ws.accept()`.

```typescript
async fetch(request: Request): Promise<Response> {
  const upgradeHeader = request.headers.get('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);

  // Accept the server side using the Hibernation API
  this.ctx.acceptWebSocket(server);

  return new Response(null, { status: 101, webSocket: client });
}

// Called by the runtime when a WebSocket message is received
async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
  // Broadcast to all sessions
  for (const [otherWs, _] of this.sessions.entries()) {
    if (otherWs !== ws) {
      otherWs.send(message);
    }
  }
}

// Called when a WebSocket closes
async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
  this.sessions.delete(ws);
}
```

**Critical Hibernation Settings:**
- Use `ctx.acceptWebSocket(server)`, never `ws.accept()`
- Do not set `onmessage` handler on the server side WebSocket
- The runtime automatically sends ping/pong frames (no heartbeat needed)

### 5. Use Alarms for Scheduled Tasks

Use alarms for per-entity scheduled tasks and cleanup:
```typescript
async alarm() {
  if (this.sessions.size === 0) {
    // Clean up storage when no connections
    await this.ctx.storage.deleteAll();
  }
}

// Schedule alarm when first connection arrives
if (this.sessions.size === 1) {
  await this.ctx.storage.setAlarm(Date.now() + 600_000); // 10 minutes
}
```

### 6. End-to-End Encryption (E2EE) for Real-Time Data

**AGENTS.md Rule 9:** E2EE crypto is non-negotiable. The Durable Object must be a blind relay that sees only ciphertext.

Key exchange flow:
1. Each client generates a session key pair using ECDH (X25519)
2. Clients exchange public keys via the DO
3. Messages are encrypted with AES-256-GCM before sending to DO
4. DO broadcasts ciphertext without decrypting

```typescript
async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
  // The DO receives only ciphertext; it cannot decrypt
  // Broadcast the ciphertext to all other participants
  for (const [otherWs, _] of this.sessions.entries()) {
    if (otherWs !== ws) {
      otherWs.send(message); // message is the ciphertext
    }
  }
}
```

Use `@suite/crypto` for:
- `generateKeyPair()` for ECDH key exchange
- `deriveSharedSecret()` for participant-specific session keys
- `encryptItem()` / `decryptItem()` for message encryption

## Storage Best Practices

- **Understand in-memory vs persistent storage**: In-memory state is lost on eviction, persistent storage survives
- **Create indexes for frequent queries**: Use SQL indexes for columns queried often
- **Use blockConcurrencyWhile() sparingly**: Only when absolutely necessary to prevent concurrent access
- **Clean up with deleteAll()**: When deleting entities, clean up storage to avoid orphaned data
- **Never store client-side state on DO class instance**: State must be persisted to `this.ctx.storage` to survive hibernation

## Error Handling and Retry Policies

### Transient Failures (overload, temporary unavailability)
- Wrap RPC calls with retry with exponential backoff (maximum 3 retries)
- **Do not retry immediately** - retrying worsens overload
- Example retry pattern:
```typescript
async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw lastError;
}
```

### Permanent Failures (bugs, invalid state)
- Log error with Durable Object ID and stack trace
- Re-create DO for a new coordination unit (fresh room/document)
- **Do not attempt to repair state** - it may be corrupted
- Consider "state version" column in storage to detect stale state

## Performance and Limits

| Metric | Expected Value | Notes |
|--------|----------------|-------|
| Max WebSocket connections per DO | 32,768 (hard limit); practical ceiling 10,000–20,000 | Platform limit |
| Message size limit | 32 MiB | WebSocket message size limit |
| Request rate per DO (simple) | 500–1,000 requests/second | General throughput |
| Request rate per DO (complex) | 200–500 requests/second | With storage writes |
| Hibernation wake latency | <100 ms (cold); <10 ms (warm) | When recently active |
| Storage per DO | 10 GB | Embedded SQLite limit |
| Max alarms per DO | 64 | Platform limit |

### Sharding Strategy
If a single room exceeds 10,000 concurrent connections, shard by participant hash:
- Split participants across multiple DO instances
- Each shard handles a subset of users
- Clients only receive messages from participants in same shard

## Monitoring and Observability

Key metrics to monitor:
- `durable_objects.webSocketMessagesPerSecond` - Alert if >500 for 5 minutes
- `durable_objects.storageWriteBytes` - Alert if >10 GB per month per DO
- `durable_objects.alarmFailures` - Alert on any failure
- `durable_objects.evictionRate` - Alert if >5% evicted per hour
- `http_requests.duration` (upgrade requests) - Alert if >500 ms

### Distributed Tracing
Propagate `X-Request-Id` header from API layer to DO via WebSocket upgrade:
```typescript
const requestId = request.headers.get('X-Request-Id');
// Include requestId in DO logs for correlation
```

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

## Integration with Hono APIs

### 1. Add DO Namespace Binding to wrangler.toml

```toml
# apps/calendar/api/wrangler.toml
[[durable_objects.bindings]]
name = "CHAT_ROOM"
class_name = "ChatRoomDO"
script_name = "calendar-api"
```

### 2. Define Environment Interface

```typescript
// apps/calendar/api/src/index.ts
import { Hono } from 'hono';
import { BaseDurableObject } from '@suite/shared-kernel';

interface Env {
  CHAT_ROOM: DurableObjectNamespace<ChatRoomDO>;
  // ... other bindings
}

class ChatRoomDO extends BaseDurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  // Custom implementation
}
```

### 3. Route to DO Instances in Hono

```typescript
const app = new Hono<{ Bindings: Env }>();

// WebSocket upgrade route
app.get('/ws/chat/:roomId', async (c) => {
  const roomId = c.req.param('roomId');
  const id = c.env.CHAT_ROOM.idFromName(roomId);
  const stub = c.env.CHAT_ROOM.get(id);

  // Forward request to DO for WebSocket upgrade
  return stub.fetch(c.req.raw);
});

// RPC call via HTTP
app.get('/api/chat/:roomId/stats', async (c) => {
  const roomId = c.req.param('roomId');
  const id = c.env.CHAT_ROOM.idFromName(roomId);
  const stub = c.env.CHAT_ROOM.get(id);

  // Call RPC method
  const connectionCount = await stub.getConnectionCount();
  return c.json({ connectionCount });
});
```

### 4. Export DO Class for Cloudflare Workers

```typescript
// apps/calendar/api/src/index.ts
export default {
  fetch: app.fetch,
  // Export DO class for Cloudflare Workers
  ChatRoomDO,
};
```

### 5. Testing Durable Objects

```typescript
// apps/calendar/api/src/durable-object.test.ts
import { describe, it, expect } from 'vitest';
import { ChatRoomDO } from './index';

describe('ChatRoomDO', () => {
  it('should broadcast messages to all sessions', async () => {
    // Mock DurableObjectState and Env
    const mockState = {
      storage: {
        sql: { exec: () => [] },
        deleteAll: async () => {},
        setAlarm: () => {},
      },
      acceptWebSocket: () => {},
    };

    const do = new ChatRoomDO(mockState as any, {} as any);

    // Test RPC methods
    const count = await do.getConnectionCount();
    expect(count).toBe(0);
  });
});
```

### Key Integration Points

- **DO Namespace Binding**: Add to wrangler.toml under `[[durable_objects.bindings]]`
- **Environment Interface**: Extend Hono's `Bindings` type to include DO namespace
- **Routing**: Use `idFromName()` for deterministic routing to DO instances
- **RPC Calls**: Call DO methods directly via stub (no HTTP overhead)
- **WebSocket Upgrades**: Forward upgrade requests to DO's fetch handler
- **Export DO Class**: Must export DO class for Cloudflare Workers to instantiate
