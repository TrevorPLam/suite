## 12. Offline‑First Sync Engine

Being offline is not an edge case—it is a frequent and predictable state of the network. Users open apps in tunnels, on aircraft, in remote areas, and during infrastructure outages. For a productivity suite that competes with Google Workspace, the application must work just as well offline as it does online. Google Docs allows offline editing; the Sovereign Suite must do the same—and do it while maintaining end‑to‑end encryption.

This section provides a complete, production‑ready offline‑first architecture: local encrypted storage (SQLite + sqlcipher on mobile, IndexedDB with WebCrypto on web), a CRDT engine for conflict‑free merging (Yjs for rich text, last‑write‑wins for structured data), a sync protocol that uses Durable Objects as edge relays, and a queue‑based background sync system that respects battery and network constraints. This architecture treats the local device as the authoritative source of truth and the server as a synchronisation peer, not as a primary database.

---

### 12.1 The Core Principles of Offline‑First

An offline‑first application treats the network as optional and the local device as the primary data source. Every read operation reads from local storage; every write operation writes to local storage immediately and queues a synchronisation task for later. When the network becomes available, the sync engine performs a three‑step reconciliation: **pull remote changes, merge using deterministic conflict resolution (CRDTs or LWW), push local changes, retry on failure, and delete local data only after server confirmation**.

**The Sovereignty Requirement.** In the Sovereign Suite, offline storage is not simply a cache—it is an encrypted, tamper‑evident replica of the user’s data. Every write performed offline must be encrypted with the user’s domain key before being written to disk. The SQLite database on mobile is encrypted with SQLCipher (256‑bit AES). The web client uses IndexedDB with WebCrypto AES‑GCM. The sync engine never sees plaintext—it transports encrypted changes between devices and resolves conflicts deterministically on the client.

---

### 12.2 Strategic Decision: CRDTs vs. Centralised Authority

| Approach | Mechanism | Strength | Weakness | Best For |
|----------|-----------|----------|----------|----------|
| **CRDT (Yjs)** | Every replica applies every operation; deterministic merge based on mathematical properties of the data type. | True peer‑to‑peer; no central server required; works indefinitely offline with any number of devices. | Larger storage footprint; merge semantics are subtle for complex objects. | Rich text documents, free‑form collaborative notes, whiteboards. |
| **Central authority + rebase (prosemirror‑collab)** | Server is source of truth; offline client stores operations locally, rebases against server’s state on reconnection. | Extremely simple (∼40 lines of code); very small storage; mature optimisation. | Requires server to be source of truth; cannot merge two offline devices without server mediation. | Task lists, calendars, contacts—structured data with minimal concurrent edit conflicts. |

The Sovereign Suite uses **both approaches, selected per data type**:

- **Rich text documents, collaborative whiteboards, chat messages**: Yjs CRDT. The mathematical convergence guarantees are required for true peer‑to‑peer editing.
- **Calendars, task lists, contacts, spreadsheets**: “Central authority + rebase”. The server remains the single source of truth, and the offline client synchronises changes on reconnection. This avoids the storage overhead of full CRDT history for large structured datasets.

The Yjs versus Automerge trade‑off is settled: Yjs offers **lower memory footprint and faster performance for large text documents** than the Rust‑core Automerge, which retains full edit history forever. A 2025 CRDT comparison on mobile devices found that Automerge’s memory usage is 2–3× higher than Yjs for equivalent document sizes, due to the embedded document history that never drops tombstones.

For relational data such as tasks, events, and contacts, the complexity of CRDTs is unnecessary. A simple version‑vector + last‑write‑wins (LWW) strategy is sufficient: every entity has a `version` (Lamport timestamp) and a `lastModifiedAt` server timestamp. When two clients modify the same entity offline, the server timestamp determines the winner. The user never sees a conflict dialog—the algorithm chooses deterministically.

---

### 12.3 Local Storage: Encrypted Database Everywhere

#### 12.3.1 Mobile: SQLite + SQLCipher

On iOS and Android, the **Capacitor Community SQLite plugin** provides a full SQLite implementation with SQLCipher encryption (256‑bit AES). The encryption key is stored in the **iOS Keychain** or **Android Keystore** via the `@capacitor-community/sqlite` plugin’s built‑in secure storage. The key is never exposed to the application’s JavaScript heap.

**Implementation pattern for encrypted offline SQLite (`packages/mobile/src/offlineDb.ts`):**

```typescript
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

export class OfflineDatabase {
  private db: SQLiteDBConnection;

  async init(tenantId: string, encryptionKey: string) {
    const conn = new SQLiteConnection(CapacitorSQLite);
    this.db = await conn.createConnection(
      `offline_${tenantId}`,
      false,
      'no-encryption',
      1,
      SQLiteConnection.OPEN_READWRITE | SQLiteConnection.OPEN_CREATE,
      encryptionKey  // 256-bit key stored in Keychain/Keystore
    );
    await this.db.open();
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        encrypted_blob TEXT NOT NULL,
        version INTEGER NOT NULL,
        last_modified INTEGER NOT NULL,
        sync_status TEXT DEFAULT 'pending'
      )
    `);
  }
}
```

The encryption key itself is derived from the user’s domain key and a per‑device salt, stored in the Keychain/Keystore. The application never handles the raw key in plaintext in the JavaScript heap; the native layer holds it.

#### 12.3.2 Web: IndexedDB + WebCrypto

On the web, the browser does not offer SQLite with encryption. Instead, the Sovereign Suite uses **IndexedDB with a custom encryption wrapper**. The data is encrypted client‑side using `packages/crypto` before being written to IndexedDB.

**Persistence wrapper (`@suite/offline/web`):**

```typescript
import { encryptItem, decryptItem } from '@suite/crypto';

class EncryptedIndexedDB {
  private db: IDBDatabase;
  private domainKey: CryptoKey;

  async put(store: string, id: string, value: any) {
    const plaintext = new TextEncoder().encode(JSON.stringify(value));
    const { ciphertext, iv } = await encryptItem(plaintext, this.domainKey);
    const tx = this.db.transaction(store, 'readwrite');
    tx.objectStore(store).put({ id, ciphertext, iv });
  }

  async get(store: string, id: string) {
    const tx = this.db.transaction(store, 'readonly');
    const record = await tx.objectStore(store).get(id);
    const plaintext = await decryptItem(record.ciphertext, record.iv, this.domainKey);
    return JSON.parse(new TextDecoder().decode(plaintext));
  }
}
```

The IndexedDB database is not itself encrypted at rest, but all values are stored as encrypted blobs. IndexedDB’s built‑in indexing cannot operate on encrypted fields, but because the Sovereign Suite uses **blind indexing** (Section 17) for search, the server‑side tokens are stored in a separate IndexedDB store. This trade‑off is acceptable because the query patterns that require server‑side indexes are not needed offline—the client simply filters the decrypted local dataset.

---

### 12.4 Sync Engine Architecture: Durable Objects as Edge Relays

The sync engine runs as a **per‑user Durable Object** on Cloudflare’s edge. Each user has exactly one Durable Object, which holds an append‑only log of encrypted operations and the current document state for each document. The DO’s embedded SQLite database ensures that operations are durable and survive the DO being evicted.

**Architectural rule from the Cloudflare documentation:** “Model your ‘atom’ of coordination as a Durable Object instance—not a global coordinator.” A single DO per coordination unit—in this case, a user—holds the state for all of the user’s offline‑capable documents.

**DO responsibilities:**
- Maintain an append‑only log of encrypted operations (`type`, `clientId`, `version`, `ciphertext`).
- Maintain the current materialised state of each document (encrypted).
- Accept `pull` requests from the client, returning all operations with version > `since`.
- Accept `push` requests, appending new operations to the log.
- Broadcast operations to other clients connected to the same user (multi‑device sync) via WebSockets.

**DO implementation skeleton (`packages/offline/syncDO.ts`):**

```typescript
import { DurableObject } from 'cloudflare:workers';

export interface SyncOp {
  id: string;
  clientId: string;
  version: number;
  type: 'update' | 'delete';
  encryptedPayload: ArrayBuffer;
  timestamp: number;
}

export class UserSyncDO extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/pull') {
      const since = parseInt(url.searchParams.get('since') || '0');
      const ops = await this.ctx.storage.sql.exec(`
        SELECT * FROM sync_log WHERE version > ${since} ORDER BY version ASC
      `);
      return Response.json(ops);
    }
    if (url.pathname === '/push') {
      const ops: SyncOp[] = await request.json();
      await this.ctx.storage.sql.exec(`
        BEGIN TRANSACTION;
        INSERT INTO sync_log (id, clientId, version, type, encryptedPayload, timestamp)
        VALUES ${ops.map(() => '(?, ?, ?, ?, ?, ?)').join(',')}
      `, ops.flatMap(o => [o.id, o.clientId, o.version, o.type, o.encryptedPayload, o.timestamp]));
      // Invalidate materialised view if needed
      await this.ctx.storage.sql.exec(`COMMIT`);
      return new Response('OK', { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  }

  async alarm() {
    // Compact sync log, keep only last 30 days
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    await this.ctx.storage.sql.exec(`DELETE FROM sync_log WHERE timestamp < ${cutoff}`);
    // Re‑schedule compaction daily
    await this.ctx.storage.setAlarm(Date.now() + 24 * 3600 * 1000);
  }

  // SQLite table creation on first access
  async init() {
    await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        version INTEGER NOT NULL,
        type TEXT NOT NULL,
        encryptedPayload BLOB NOT NULL,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_version ON sync_log(version);
    `);
  }
}
```

**Client‑side sync manager (`packages/offline/syncManager.ts`):**

```typescript
export class SyncManager {
  private offlineDb: OfflineDatabase;
  private pendingOps: SyncOp[] = [];
  private lastSyncVersion: number = 0;

  async sync(tenantId: string) {
    // 1. Pull remote operations since last sync
    const remoteOps = await fetch(`https://sync.yourdomain.com/pull?since=${this.lastSyncVersion}`);
    const ops = await remoteOps.json();

    // 2. Apply remote operations to local DB (merge)
    for (const op of ops) {
      await this.applyRemoteOp(op);
      this.lastSyncVersion = op.version;
    }

    // 3. Push local pending operations to server
    if (this.pendingOps.length > 0) {
      await fetch('https://sync.yourdomain.com/push', {
        method: 'POST',
        body: JSON.stringify(this.pendingOps),
      });
      this.pendingOps = [];
    }
  }

  private async applyRemoteOp(op: SyncOp) {
    // Decrypt payload, merge into local state using Yjs or LWW
  }
}
```

---

### 12.5 Conflict Resolution for Structured Data (LWW)

For structured entities (calendar events, tasks, contacts), the Sovereign Suite uses **last‑write‑wins (LWW) with server‑side timestamps** as the tiebreaker. Each entity has a `version` field that is a Lamport timestamp (server time + counter). The algorithm is:

1. Client A, offline, modifies event `E` at local time `t1` and increments its local version counter.
2. Client B, offline, modifies the same event `E` at local time `t2`, with a different version counter.
3. On sync, the server compares the Lamport timestamps. The entity with the larger timestamp wins. The losing client discards its changes and applies the winning version.
4. The server then increments its master version counter and responds to both clients with the final state.

This approach guarantees eventual convergence without user‑visible conflict dialogs. For the rare case where two clients modify the same field of the same entity with identical timestamps, the deterministic tie‑breaker is the client ID (a random integer). The user never sees a conflict resolution UI—the system resolves automatically.

**Field‑level conflict resolution example for structured data:**

```typescript
function mergeEntities<T extends { version: number; data: T }>(local: T, remote: T): T {
  if (remote.version > local.version) return remote;
  if (local.version > remote.version) return local;
  // Equal versions: field‑level merge (e.g., keep both)
  return { ...local, ...remote, version: local.version + 1 };
}
```

---

### 12.6 AI Agent Rules for Offline‑First Development

Add the following to `AGENTS.md` to encode offline‑first discipline:

```markdown
## Offline‑First Sync — Rules for AI Agents

1. **Every write is optimistic.** Write to local DB immediately; queue sync to server. Never block UI on network.
2. **Local DB is source of truth.** Reads always come from local encrypted storage; treat server as sync peer.
3. **Encrypt everything.** All data written to SQLite/IndexedDB must be encrypted with `@suite/crypto`.
4. **Use CRDTs for rich text; LWW for structured data.** Do not mix incorrectly.
5. **Sync via Durable Objects only.** Each user gets a DO for operation log.
6. **Never store operation log indefinitely.** Compact DO SQLite tables every 30 days.
7. **Test with offline scenarios.** Automated tests must run with network disconnected.
8. **Do not overwrite user data on conflict.** Resolve deterministically, using version timestamps.
9. **Sync on reconnect, not periodically.** Queue sync and run immediately when online.
10. **Background sync must respect battery and network state.** Only sync on unmetered Wi‑Fi if large payloads are expected.
```

---

### 12.7 Summary Table: Offline‑First Decisions

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Local DB (mobile)** | SQLite + SQLCipher (256‑bit AES) | SQLCipher is the industry standard for encrypted SQLite; Capacitor plugin supports Keychain/Keystore. |
| **Local DB (web)** | IndexedDB + WebCrypto AES‑GCM | No native encrypted SQLite on web; encrypt values before storage, not the store. |
| **Rich text CRDT** | Yjs (via `yjs` npm) | Lower memory footprint than Automerge; native Y.Text for collaboration. |
| **Structured data CRDT** | LWW + server timestamps | Simple, predictable, no conflict UI. Sufficient for calendars/tasks. |
| **Sync relay** | Per‑user Durable Object + SQLite | Append‑only operation log; embedded SQLite for strong consistency. |
| **Sync protocol** | Pull then push (version‑based) | Classic sync pattern; works with DO’s atomic log. |
| **Encryption** | Domain key + per‑item IV | Data encrypted at rest on device; server sees only ciphertext. |

The offline‑first engine is the final pillar of the Sovereign Suite’s data resilience strategy. When combined with cloud backups (Section 15) and row‑level security (Section 7), this architecture guarantees that user data is never lost, never leaked, and always accessible—even when the network is not.