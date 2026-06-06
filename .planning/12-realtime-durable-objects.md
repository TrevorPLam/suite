---
title: "Real‑Time with Durable Objects"
section: "realtime"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "04-architecture-technology-stack.md"
  - "11-api-design-hono.md"
tags:
  - "realtime"
  - "durable-objects"
  - "websocket"
  - "hibernation"
---

## 10. Real‑Time with Durable Objects

Real‑time communication is the heartbeat of collaboration. For the Sovereign Suite, this means live chat messages that appear instantly, collaborative document cursors that move without perceptible lag, and video conferencing that synchronises across dozens of participants. Cloudflare Durable Objects provide the stateful, serverless foundation for all of it. A Durable Object is a globally distributed, single‑threaded unit of coordination that can hold WebSocket connections, store persistent data in its own embedded SQLite database, and—critically—**hibernate** when idle to drive duration costs toward zero. This section covers the architectural decisions, coding patterns, and operational runbooks that make Durable Objects work safely and scalably for the Sovereign Suite.

---

### 10.1 Durable Objects Fundamentals: The Mental Model

A Durable Object is an instance of a JavaScript class that is:
- **Single‑threaded and globally unique** — For a given ID, the runtime guarantees that at most one instance executes at any time. There is no locking, no race conditions, and no distributed state coordination to debug.
- **Stateful** — Each instance has access to its own embedded SQLite database (`this.state.storage`) that persists data across hibernation and restarts. The embedded SQLite database offers **strong consistency**: writes are durable and automatically synchronised; you never lose a write.
- **Long‑lived** — The Durable Object remains active until it becomes idle, at which point the runtime may evict it from memory. Connections and data survive hibernation; when a new request arrives, the DO is resurrected, existing WebSocket connections are automatically re‑attached, and the previous storage state is reloaded.

The fundamental rule is: **one Durable Object per coordination unit**. A coordination unit is any set of clients that need to share state in real time. In the Sovereign Suite, this means one DO per chat room, one DO per collaborative document, one DO per shared whiteboard, and so on. The unique ID of the DO is derived from the resource identifier (e.g., the chat room slug) or, for transient sessions such as customer‑support chats, generated at creation time.

---

### 10.2 The 1 DO per "Room" Strategy

The decision to model coordination atoms as individual Durable Objects is rooted in two constraints: the WebSocket connection limit and the single‑threaded execution model. A single Durable Object is soft‑limited to **32,768 WebSocket connections** (the platform maximum), but in practice, a healthy ceiling is **10,000–20,000 concurrent connections per DO**. Beyond that, CPU contention and message queuing degrade responsiveness. The performance envelope is a lower bound: chat rooms can tolerate moderate queuing; real‑time cursors cannot.

**Architectural rule — derived from the documentation: "Model your 'atom' of coordination as a Durable Object instance—not a global coordinator".** For the Sovereign Suite, this means:
- `ChatRoom` DOs identified by `room:<slug>`, created on‑demand.
- `Document` DOs identified by `doc:<uuid>`, created when a document is first opened.
- `LiveBoard` DOs identified by `board:<uuid>`.

**Avoiding resource waste:** An inactive room with zero connected clients should **not** hold a Durable Object instance in memory. DOs are automatically garbage‑collected after approximately 30 seconds of complete inactivity, but you must also design your application to **destroy or release the DO's ID** from any routing table to prevent it being re‑created unnecessarily. The pattern is: no clients → no need for the DO to exist. The `Alarms API` can be used to schedule a final cleanup if the DO is re‑created after a long period of inactivity.

---

### 10.3 WebSocket Hibernation API: The Cost‑Savings Mechanism

The WebSocket Hibernation API is the key differentiator that makes Durable Objects economically viable for the Sovereign Suite. Standard WebSocket servers must keep a process alive for each connection, incurring significant compute costs even when connections are idle. With hibernation, the Durable Object can be **evicted from memory** while the WebSocket connections remain open at the edge, held by the Cloudflare network. When a message arrives, the runtime automatically resurrects the DO, delivers the message, and allows it to hibernate again.

The API is an extension of the Web Standard WebSocket API with two additional methods and a special `fetch` handler. Critically, **you must call `ctx.acceptWebSocket(server)` rather than the standard `ws.accept()`**. The `WebSocketPair` class provides the two ends of the WebSocket: the `client` end is returned to the browser; the `server` end is accepted by the Durable Object using `ctx.acceptWebSocket(server)`.

**Complete Hibernation‑Ready Durable Object Implementation:**

```typescript
// packages/real-time/rooms/ChatRoomDO.ts
export class ChatRoomDO implements DurableObject {
  private sessions: Map<WebSocket, { userId: string }> = new Map();

  constructor(private ctx: DurableObjectState) {}

  // Alarms API for cleanup
  async alarm() {
    if (this.sessions.size === 0) {
      // Optionally delete storage state for this room
      await this.ctx.storage.deleteAll();
    }
  }

  // The fetch handler is the entry point for all HTTP requests, including WebSocket upgrades
  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Create the WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the server side using the Hibernation API
    this.ctx.acceptWebSocket(server);

    // Get user identity from the request (set by auth middleware)
    const userId = request.headers.get('X-User-Id')!;
    this.sessions.set(server, { userId });

    // Schedule an alarm if this is the first connection
    if (this.sessions.size === 1) {
      await this.ctx.storage.setAlarm(Date.now() + 600_000); // 10 minutes
    }

    // Return the client side to the browser
    return new Response(null, { status: 101, webSocket: client });
  }

  // Called by the runtime when a WebSocket message is received
  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    const session = this.sessions.get(ws);
    if (!session) return;

    // Broadcast to all other sessions in this DO
    for (const [otherWs, _] of this.sessions.entries()) {
      if (otherWs !== ws) {
        otherWs.send(message);
      }
    }

    // Persist the message to storage (optional)
    await this.ctx.storage.put<ArrayBuffer>(`msg_${Date.now()}`, message as ArrayBuffer);
  }

  // Called when a WebSocket closes
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    this.sessions.delete(ws);
    if (this.sessions.size === 0) {
      // No more connections; no need to keep the DO alive
      // The alarm will eventually clean up storage
    }
  }

  // Optional: RPC method for external callers (e.g., analytics service)
  async getConnectionCount(): Promise<number> {
    return this.sessions.size;
  }
}
```

**Critical settings for Hibernation:**
- Accept the server side using `ctx.acceptWebSocket(server)`, never `ws.accept()`.
- Do not set a `onmessage` handler on the server side WebSocket; the `webSocketMessage` class method is called automatically by the runtime.
- On compatibility dates before **2026‑04‑07**, you must call `ws.close(code, reason)` manually inside `webSocketClose`. On or after this date, the runtime automatically replies to Close frames.
- The runtime automatically sends WebSocket ping/pong frames; you do not need to implement a heartbeat.

The result is a real‑time system where idle rooms cost almost nothing. The only billable events are CPU time for message processing and the WebSocket connection establishment (which is counted as a request on the free tier). For a chat room with 1,000 connected users that sends 1 message every 10 seconds, the Durable Object is awake for less than 5% of the time—a significant reduction in duration charges compared to traditional servers.

---

### 10.4 PartyKit vs. Raw Durable Objects: The Strategic Decision

PartyKit is a popular open‑source framework, acquired by Cloudflare, that provides a higher‑level abstraction on top of Durable Objects. It offers a simplified API, automatic room routing, broadcasting helpers, and built‑in presence management. For a solo developer, PartyKit can accelerate development significantly; a basic chat room can be implemented in under 50 lines of code.

However, the Sovereign Suite chooses **raw Durable Objects** for three reasons that directly impact reliability:

1. **The Vite HMR bug.** PartyKit's developer tooling has a known issue where WebSocket handlers break after hot‑module replacement (HMR) reloads when using Vite. While a full page refresh fixes it, this interrupts the development flow—a friction point the solo founder cannot afford.

2. **Long‑term sustainability.** PartyKit's API is an abstraction; if the project becomes inactive or diverges from Cloudflare's API updates, you will be stuck migrating dozens of real‑time modules off a deprecated library. Raw Durable Objects tie directly to the platform API, which is guaranteed stable.

3. **Granular control over cost.** PartyKit's "room" abstraction may implicitly keep Durable Objects alive longer than necessary. With raw Durable Objects, you control exactly when the DO hibernates and when its storage is cleaned up.

**Verdict for the Sovereign Suite:** Use raw Durable Objects for all core real‑time infrastructure. Evaluate PartyKit only for non‑critical internal tools where rapid iteration outweighs long‑term stability concerns.

---

### 10.5 End‑to‑End Encryption (E2EE) for Real‑Time Data

The zero‑knowledge guarantee must extend to WebSocket traffic. A Durable Object that relays plaintext messages between clients would violate the suite's core promise. The secure pattern is **end‑to‑end encryption at the application layer**: the server (the Durable Object) is a blind relay that sees only ciphertext and handles message routing and delivery, while the cryptographic session keys are exchanged directly between clients.

The key exchange flow is:

1. **When a user joins a chat room, the room's Durable Object notifies the client of the room's public key material.** The DO itself does not hold private keys; instead, each client generates a session key pair for the room and sends its public key to the DO, which broadcasts it to all other clients.

2. **Clients derive a shared secret per participant pair using ECDH (Elliptic Curve Diffie‑Hellman)**, typically using the `crypto.subtle.deriveKey` API with the `X25519` algorithm (supported in Cloudflare Workers and browsers).

3. **Messages are encrypted with AES‑256‑GCM** using a derived message key before being sent to the DO. The DO broadcasts the encrypted message to all participants.

4. **The DO never has access to the plaintext.** It sees only an opaque ciphertext. Even if the Durable Object instance is compromised, an attacker sees only encrypted payloads.

The `packages/crypto` library (Section 5.1) provides all the necessary primitives:

- `generateKeyPair()` for ECDH key exchange.
- `deriveSharedSecret()` for participant‑specific session keys.
- `encryptItem()` / `decryptItem()` for message encryption.

**Implementation pattern in the ChatRoomDO's `webSocketMessage` handler:**

```typescript
async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
  // The DO receives only ciphertext; it cannot decrypt.
  // Broadcast the ciphertext to all other participants in the room.
  for (const [otherWs, _] of this.sessions.entries()) {
    if (otherWs !== ws) {
      otherWs.send(message); // message is the ciphertext
    }
  }
}
```

The client encrypts the message before sending it and decrypts the ciphertext after receiving it. The server (DO) never touches the plaintext. Because the WebSocket payloads are encrypted using the participant‑specific shared secret, a malicious participant cannot eavesdrop on conversations between other pairs—the encryption is per participant pair, not per room.

---

### 10.6 Benchmark Expectations and Performance Envelope

The Durable Objects free tier includes **1 million WebSocket connection requests per month** and **400k GB‑seconds of duration**. With hibernation, idle connections consume almost zero duration, but the initial connection upgrade counts as a request.

Performance benchmarks from real‑world implementations:

| Metric | Expected Value | Source / Workload |
|--------|----------------|-------------------|
| **Maximum WebSocket connections per DO** | 32,768 (hard limit); practical ceiling 10,000–20,000 | Platform limit |
| **Message size limit** | 32 MiB (33,554,432 bytes) | WebSocket message size limit documented |
| **Request rate per DO (simple operations)** | 500–1,000 requests/second | General Durable Objects throughput |
| **Request rate per DO (complex operations)** | 200–500 requests/second | Storage writes, complex state updates |
| **Hibernation wake latency** | <100 ms (cold start); <10 ms (warm) | Users reporting <10ms when DO was recently active |
| **Storage per DO** | 10 GB (embedded SQLite) | Durable Objects storage limit |
| **Alarms** | Maximum 64 alarms scheduled per DO | Platform limit (internal) |

**Sharding strategy for high‑scale workloads:** If a single room grows beyond 20,000 concurrent connections, shard it by splitting participants across multiple Durable Objects, each responsible for a subset (e.g., by user ID hash). The clients in each shard only receive messages from participants in the same shard—a limitation that the application must accept.

---

### 10.7 Error Handling and Retry Policies

Durable Objects fail in two distinct ways: transient failures (the DO was evicted and needs to be re‑created) and permanent failures (the Durable Object class throws an unhandled exception). The design of the Sovereign Suite must handle both gracefully.

**Guideline for transient failures (overload, temporary unavailability):**
- In the calling Worker, wrap the RPC call or WebSocket upgrade request in a retry with exponential backoff (maximum 3 retries).
- **Do not retry immediately.** If the DO is overloaded, retrying will worsen the overload and increase the overall error rate.

**Guideline for permanent failures (bugs, invalid state):**
- Log the error with the Durable Object ID and the exact stack trace.
- Re‑create the Durable Object for a new coordination unit (e.g., a fresh room or document). **Do not attempt to repair state; it may be corrupted.**
- For critical rooms with persistent state, consider implementing a "state version" column in the DO's storage. If the version is stale, reject all further operations and instruct clients to re‑establish a fresh connection.

**The Alarms API for cleanup:** Schedule an alarm for each Durable Object instance to run a self‑cleanup after a period of inactivity. In the `alarm` handler, delete stale storage entries and, if there are no active WebSocket connections, delete all stored state to reclaim storage quota.

---

### 10.8 Production Monitoring and Observability

Without visibility into the state of your Durable Objects, real‑time failures become silent and unrecoverable. The Sovereign Suite implements:

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| `durable_objects.webSocketMessagesPerSecond` | Cloudflare GraphQL API | >500 for 5 minutes |
| `durable_objects.storageWriteBytes` | Cloudflare GraphQL API | >10 GB per month per DO (investigate abnormally large state) |
| `durable_objects.alarmFailures` | Cloudflare GraphQL API | Any failure |
| `durable_objects.evictionRate` | Cloudflare GraphQL API | >5% of DOs evicted per hour |
| `http_requests.duration` (for upgrade requests) | Worker logs | >500 ms |

**Distributed tracing:** The `X-Request-Id` header set in the API layer (Section 9.5) must be propagated to the Durable Object via the WebSocket upgrade request's headers. Use `c.req.header('X-Request-Id')` and pass it to the DO via a custom header. The DO then includes the same ID in its logs, correlating a user's chat message to the specific Durable Object that processed it.

---

### 10.9 AI Agent Rules for Real‑Time Development

Add the following to your root `AGENTS.md` to encode Durable Objects best practices for AI agents:

```markdown
## Real‑Time with Durable Objects — Rules for AI Agents

1. **One DO per coordination unit (chat room, document, board).** Never put multiple units in one DO.
2. **Always use the Hibernation API.** Use `ctx.acceptWebSocket(server)`, not `ws.accept()`.
3. **Never store client‑side state on the DO class instance.** State must be persisted to `this.ctx.storage` (embedded SQLite) to survive hibernation.
4. **Set alarms for cleanup.** Every DO that can become idle must schedule an alarm to delete stale state.
5. **E2EE is mandatory.** Encrypt messages before sending; DO should see only ciphertext.
6. **Implement retries with exponential backoff** for transient DO failures. Never retry immediately.
7. **Log the DO ID with every error.** This aids debugging across distributed failures.
8. **Use RPC service bindings for control operations** (e.g., `getConnectionCount`), not HTTP subrequests.
9. **Test WebSocket connections with proper cleanup.** Always close connections in `finally` blocks in tests.
10. **Respect free tier limits.** Monitor WebSocket connection requests and duration usage.
```

---

### 10.10 Summary: Real‑Time Architecture at a Glance

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Coordination unit** | One DO per chat room, document, board | Matches platform model; avoids cross‑room interference |
| **WebSocket management** | Hibernation API (`ctx.acceptWebSocket`) | Enables DO to hibernate, saving cost |
| **Abstraction layer** | Raw Durable Objects (not PartyKit) | Avoids Vite HMR bug, ensures long‑term stability |
| **E2EE for messages** | Client‑side encryption; DO is blind relay | Preserves zero‑knowledge guarantee |
| **Key exchange** | ECDH (X25519) + AES‑256‑GCM | Standard, high‑performance, supported across browsers and Workers |
| **Error handling** | Exponential backoff retries; state versioning | Prevents cascading failure and state corruption |
| **Observability** | `X-Request-Id` correlation + Cloudflare GraphQL metrics | Enables distributed tracing and cost attribution |
| **Sharding for scale** | Hash‑based partition when >10,000 connections per room | Avoids exceeding DO connection limits |

The result is a real‑time layer that scales from a single chat room to a global collaborative platform, respects the zero‑knowledge promise, and keeps operational costs near zero—all while remaining simple enough for a solo developer with AI agents to build and maintain.
