# Chat App Guide

This document defines the architecture and implementation details for the Chat application in the Sovereign Suite.

---

## Overview

The Chat app provides encrypted real-time messaging with Durable Object room model, ECDH X25519 session key exchange, and message retention policy.

---

## Domain Model

### Room

```typescript
interface Room {
  id: string;
  tenantId: string;
  name: string;
  encryptedBlob: Uint8Array; // Encrypted: room settings
  createdAt: Date;
}
```

### Message

```typescript
interface Message {
  id: string;
  roomId: string;
  userId: string;
  encryptedBlob: Uint8Array; // Encrypted: message content
  createdAt: Date;
}
```

---

## Durable Object Room Model

### One DO Per Room

```typescript
// apps/chat/api/src/room-do.ts
import { DurableObject } from 'cloudflare:workers';

export interface Env {
  CHAT_ROOM: DurableObjectNamespace<ChatRoom>;
}

export class ChatRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    
    // Initialize SQLite storage
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        encrypted_blob BLOB NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
  }
  
  async sendMessage(userId: string, encryptedBlob: Uint8Array) {
    const messageId = randomUUID();
    
    this.ctx.storage.sql.exec(
      `INSERT INTO messages (id, user_id, encrypted_blob, created_at)
       VALUES (?, ?, ?, ?)`,
      [messageId, userId, encryptedBlob, Date.now()]
    );
    
    // Broadcast to connected clients
    this.broadcast({
      type: 'message',
      messageId,
      userId,
      encryptedBlob,
    });
  }
  
  async getMessages(limit: number = 50) {
    const result = this.ctx.storage.sql.exec(
      `SELECT * FROM messages ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    
    return result.results;
  }
  
  broadcast(message: any) {
    const sessions = this.ctx.getWebSockets();
    for (const session of sessions) {
      session.send(JSON.stringify(message));
    }
  }
}
```

### Hibernatable WebSockets

```typescript
export class ChatRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    
    this.ctx.acceptWebSocket(this, [
      ['serializeAttachment', () => JSON.stringify(this.state)],
    ]);
  }
  
  async webSocketMessage(ws: WebSocket, message: string) {
    const data = JSON.parse(message);
    
    if (data.type === 'send_message') {
      await this.sendMessage(data.userId, data.encryptedBlob);
    }
  }
}
```

---

## ECDH X25519 Session Key Exchange

### Key Agreement

```typescript
// packages/domain-chat/src/lib/crypto.ts
import { generateKeyPair, deriveSharedSecret } from '@suite/crypto';

export async function establishSessionKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return await deriveSharedSecret(privateKey, publicKey);
}
```

### Per-Message Key Derivation

```typescript
export async function deriveMessageKey(
  sessionKey: CryptoKey,
  messageId: string
): Promise<CryptoKey> {
  return await hkdf(sessionKey, messageId);
}
```

---

## Message Retention Policy

### Configurable Retention

```typescript
interface RetentionPolicy {
  duration: number; // milliseconds
  autoDelete: boolean;
}

const DEFAULT_RETENTION: RetentionPolicy = {
  duration: 30 * 24 * 60 * 60 * 1000, // 30 days
  autoDelete: true,
};
```

### Scheduled Deletion

```typescript
export class ChatRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    
    // Schedule deletion job
    this.ctx.storage.setAlarm(Date.now() + 86400000, async () => {
      await this.deleteOldMessages();
    });
  }
  
  async deleteOldMessages() {
    const cutoff = Date.now() - DEFAULT_RETENTION.duration;
    
    this.ctx.storage.sql.exec(
      `DELETE FROM messages WHERE created_at < ?`,
      [cutoff]
    );
  }
}
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rooms` | GET | List rooms |
| `/api/rooms` | POST | Create room |
| `/api/rooms/:id` | GET | Get room |
| `/api/rooms/:id/messages` | GET | Get messages |
| `/api/rooms/:id/messages` | POST | Send message (WebSocket) |
| `/api/rooms/:id/join` | POST | Join room (WebSocket) |

---

## Encryption Strategy

### Plaintext Fields

- `name` (room name for searchability)

### Encrypted Fields

- `encrypted_blob` contains:
  - Message content
  - Room settings
  - User metadata

---

*This document must be updated when the Chat app architecture changes.*
