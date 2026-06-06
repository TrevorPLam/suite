/**
 * Durable Object Template
 *
 * This template follows Cloudflare Durable Objects best practices:
 * - One DO per coordination unit (chat room, document, board)
 * - SQLite-backed storage for persistence
 * - Hibernatable WebSockets API for cost savings
 * - Alarms for scheduled cleanup
 * - E2EE support (DO acts as blind relay)
 *
 * See .devin/rules/durable-objects-pattern.md for detailed guidelines.
 */

// Type definitions for Cloudflare Workers Durable Objects
// These are inline definitions to avoid dependency on @cloudflare/workers-types
export interface DurableObjectStorage {
  sql: {
    exec(query: string, ...params: unknown[]): unknown[];
  };
  deleteAll(): Promise<void>;
  setAlarm(timestamp: number, callback: () => void | Promise<void>): void;
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface DurableObjectState {
  storage: DurableObjectStorage;
  acceptWebSocket(ws: WebSocket, protocols?: string[] | string[][]): void;
  waitUntil(promise: Promise<unknown>): void;
  blockConcurrencyWhile<T>(fn: () => Promise<T>): Promise<T>;
}

export interface DurableObjectNamespace<T> {
  idFromName(name: string): DurableObjectId;
  idFromString(id: string): DurableObjectId;
  get(id: DurableObjectId): T;
}

export interface DurableObjectId {
  toString(): string;
}

export interface WebSocketPair {
  0: WebSocket;
  1: WebSocket;
}

export interface DurableObjectEnv {
  // Add your Durable Object namespace bindings here
  // Example: CHAT_ROOM: DurableObjectNamespace<ChatRoomDO>;
}

/**
 * Base Durable Object class with common patterns
 *
 * Extend this class for your specific coordination units.
 * This template provides:
 * - SQLite initialization
 * - Hibernation-ready WebSocket handling
 * - Alarm-based cleanup
 * - RPC method pattern
 */
export abstract class BaseDurableObject {
  protected sessions: Map<WebSocket, { userId: string }> = new Map();

  constructor(protected ctx: DurableObjectState, protected env: DurableObjectEnv) {
    this.initializeStorage();
  }

  /**
   * Initialize SQLite storage in constructor
   * Override this method to create your specific tables
   */
  protected initializeStorage(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
    `);
  }

  /**
   * Alarm handler for scheduled tasks
   * Override this method for custom alarm logic
   */
  async alarm(): Promise<void> {
    // Default cleanup: delete all state if no active sessions
    if (this.sessions.size === 0) {
      await this.ctx.storage.deleteAll();
    }
  }

  /**
   * Schedule alarm for cleanup
   * Call this when first connection arrives
   */
  protected scheduleCleanupAlarm(delayMs: number = 600_000): void {
    this.ctx.storage.setAlarm(Date.now() + delayMs, async () => {
      await this.alarm();
    });
  }

  /**
   * Fetch handler for HTTP requests and WebSocket upgrades
   * Override this method for custom routing logic
   */
  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');

    if (upgradeHeader === 'websocket') {
      return this.handleWebSocketUpgrade(request);
    }

    // Handle HTTP requests (RPC calls via fetch)
    return this.handleHttpRequest(request);
  }

  /**
   * Handle WebSocket upgrade with Hibernation API
   */
  protected async handleWebSocketUpgrade(request: Request): Promise<Response> {
    // @ts-ignore - WebSocketPair is a global in Cloudflare Workers runtime
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    // Accept the server side using the Hibernation API
    this.ctx.acceptWebSocket(server);

    // Get user identity from request (set by auth middleware)
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      server.close(1008, 'Unauthorized');
      // @ts-ignore - webSocket is a valid ResponseInit option in Cloudflare Workers
      return new Response(null, { status: 101, webSocket: client });
    }

    this.sessions.set(server, { userId });

    // Schedule cleanup alarm if this is the first connection
    if (this.sessions.size === 1) {
      this.scheduleCleanupAlarm();
    }

    // @ts-ignore - webSocket is a valid ResponseInit option in Cloudflare Workers
    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Handle HTTP requests (RPC calls)
   * Override this method to add custom RPC endpoints
   */
  protected async handleHttpRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // Example RPC endpoint: GET /stats
    if (method === 'GET' && url.pathname === '/stats') {
      return Response.json({
        connectionCount: this.sessions.size,
        storageSize: await this.getStorageSize(),
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Called by runtime when WebSocket message is received
   * Override this method for custom message handling
   */
  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    const session = this.sessions.get(ws);
    if (!session) return;

    // E2EE: DO acts as blind relay - broadcasts ciphertext without decrypting
    // Client encrypts before sending, decrypts after receiving
    for (const [otherWs, _] of this.sessions.entries()) {
      if (otherWs !== ws) {
        otherWs.send(message);
      }
    }

    // Persist message to storage (optional)
    await this.persistMessage(session.userId, message);
  }

  /**
   * Called when WebSocket closes
   */
  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    this.sessions.delete(ws);

    // If no more connections, alarm will eventually clean up storage
  }

  /**
   * Persist message to SQLite storage
   */
  protected async persistMessage(userId: string, message: ArrayBuffer | string): Promise<void> {
    const messageType = message instanceof ArrayBuffer ? 'binary' : 'text';
    const data = message instanceof ArrayBuffer ? JSON.stringify({ size: message.byteLength }) : message;

    this.ctx.storage.sql.exec(
      'INSERT INTO events (type, data, user_id, created_at) VALUES (?, ?, ?, ?)',
      messageType,
      data,
      userId,
      Date.now()
    );
  }

  /**
   * Get storage size for monitoring
   */
  protected async getStorageSize(): Promise<number> {
    const result = this.ctx.storage.sql.exec('SELECT COUNT(*) as count FROM events');
    const row = result[0] as Record<string, unknown> | undefined;
    return (row?.count as number) || 0;
  }

  /**
   * Example RPC method: get connection count
   */
  async getConnectionCount(): Promise<number> {
    return this.sessions.size;
  }

  /**
   * Example RPC method: broadcast message to all sessions
   */
  async broadcast(message: string | ArrayBuffer): Promise<void> {
    for (const [ws, _] of this.sessions.entries()) {
      ws.send(message);
    }
  }
}

/**
 * Example Durable Object implementation
 *
 * This shows how to extend the base template for a specific use case.
 */
export class ExampleChatRoomDO extends BaseDurableObject {
  constructor(ctx: DurableObjectState, env: DurableObjectEnv) {
    super(ctx, env);
  }

  protected override initializeStorage(): void {
    super.initializeStorage();
    // Add chat-specific tables
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    `);
  }

  override async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    const session = this.sessions.get(ws);
    if (!session) return;

    // Broadcast to all other sessions (E2EE: message is ciphertext)
    for (const [otherWs, _] of this.sessions.entries()) {
      if (otherWs !== ws) {
        otherWs.send(message);
      }
    }

    // Persist to storage
    if (typeof message === 'string') {
      this.ctx.storage.sql.exec(
        'INSERT INTO messages (content, user_id, created_at) VALUES (?, ?, ?)',
        message,
        session.userId,
        Date.now()
      );
    }
  }

  // Chat-specific RPC method
  async getMessageHistory(limit: number = 50): Promise<Record<string, unknown>[]> {
    const result = this.ctx.storage.sql.exec(
      'SELECT * FROM messages ORDER BY created_at DESC LIMIT ?',
      limit
    );
    return result as Record<string, unknown>[];
  }
}
