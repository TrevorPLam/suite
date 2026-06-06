/**
 * Audit Logging for Cryptographic Operations
 *
 * This module provides optional audit logging for key lifecycle events and security events.
 * Audit logging is disabled by default and must be explicitly enabled.
 *
 * Design Principles:
 * - Audit logging is optional (disabled by default)
 * - Log key lifecycle events (creation, usage, deletion)
 * - Log security events (failed operations, suspicious activity)
 * - Support custom log handlers for SIEM integration
 * - Do not log sensitive data (keys, plaintext)
 *
 * References:
 * - NIST SP 800-92: Guide to Computer Security Log Management
 * - PCI DSS Requirement 10: Track and monitor all access to network resources
 * - HIPAA Security Rule: Audit Controls
 */

/**
 * Audit event types
 */
export enum AuditEventType {
  KEY_CREATED = 'KEY_CREATED',
  KEY_USED = 'KEY_USED',
  KEY_DELETED = 'KEY_DELETED',
  KEY_ROTATED = 'KEY_ROTATED',
  KEY_EXPIRED = 'KEY_EXPIRED',
  OPERATION_FAILED = 'OPERATION_FAILED',
  INVALID_KEY = 'INVALID_KEY',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

/**
 * Audit event metadata
 * Provides additional context without exposing sensitive data
 */
export interface AuditEventMetadata {
  operation?: string; // The operation being performed (e.g., 'encrypt', 'decrypt')
  algorithm?: string; // The algorithm being used (e.g., 'AES-GCM', 'X25519')
  keyId?: string; // Identifier for the key (never the key itself)
  keySize?: number; // Key size in bits
  status?: string; // Operation status (e.g., 'success', 'failed')
  source?: string; // Source of the operation (e.g., 'api', 'worker')
  [key: string]: string | number | boolean | undefined;
}

/**
 * Audit event structure
 * Follows industry best practices for audit log entries
 */
export interface AuditEvent {
  timestamp: number; // Unix timestamp in milliseconds
  eventType: AuditEventType; // Type of event
  keyId?: string | undefined; // Key identifier (never the key material)
  operation?: string | undefined; // Operation being performed
  metadata: AuditEventMetadata; // Additional context
}

/**
 * Audit logger interface
 * Implementations can log to console, file, SIEM, etc.
 */
export interface AuditLogger {
  /**
   * Log a key creation event
   */
  logKeyCreated(event: AuditEvent): void | Promise<void>;

  /**
   * Log a key usage event
   */
  logKeyUsed(event: AuditEvent): void | Promise<void>;

  /**
   * Log a key deletion event
   */
  logKeyDeleted(event: AuditEvent): void | Promise<void>;

  /**
   * Log a key rotation event
   */
  logKeyRotated(event: AuditEvent): void | Promise<void>;

  /**
   * Log a key expiration event
   */
  logKeyExpired(event: AuditEvent): void | Promise<void>;

  /**
   * Log a security event (failed operations, suspicious activity)
   */
  logSecurityEvent(event: AuditEvent): void | Promise<void>;
}

/**
 * Global audit logger instance
 * Defaults to null (disabled)
 */
let globalAuditLogger: AuditLogger | null = null;

/**
 * Set the global audit logger
 * Enables audit logging for all crypto operations
 *
 * @param logger - Audit logger implementation
 */
export function setAuditLogger(logger: AuditLogger | null): void {
  globalAuditLogger = logger;
}

/**
 * Get the current global audit logger
 *
 * @returns Current audit logger or null if disabled
 */
export function getAuditLogger(): AuditLogger | null {
  return globalAuditLogger;
}

/**
 * Create an audit event
 * Helper function to create properly structured audit events
 *
 * @param eventType - Type of event
 * @param keyId - Optional key identifier
 * @param operation - Optional operation
 * @param metadata - Additional metadata
 * @returns AuditEvent object
 */
export function createAuditEvent(
  eventType: AuditEventType,
  keyId?: string,
  operation?: string,
  metadata: AuditEventMetadata = {}
): AuditEvent {
  const eventMetadata: AuditEventMetadata = { ...metadata };

  // Only add keyId and operation to metadata if they are provided
  if (keyId !== undefined) {
    eventMetadata.keyId = keyId;
  }
  if (operation !== undefined) {
    eventMetadata.operation = operation;
  }

  const event: AuditEvent = {
    timestamp: Date.now(),
    eventType,
    metadata: eventMetadata,
  };

  // Only add optional properties if they are defined
  if (keyId !== undefined) {
    event.keyId = keyId;
  }
  if (operation !== undefined) {
    event.operation = operation;
  }

  return event;
}

/**
 * Log a key creation event
 * Called when a new key is created
 *
 * @param keyId - Key identifier
 * @param algorithm - Algorithm used
 * @param keySize - Key size in bits
 * @param metadata - Additional metadata
 */
export function logKeyCreated(
  keyId: string,
  algorithm: string,
  keySize: number,
  metadata: AuditEventMetadata = {}
): void {
  if (!globalAuditLogger) return;

  const event = createAuditEvent(
    AuditEventType.KEY_CREATED,
    keyId,
    'createKey',
    {
      algorithm,
      keySize,
      ...metadata,
    }
  );

  const result = globalAuditLogger.logKeyCreated(event);
  if (result instanceof Promise) {
    // Fire and forget for async loggers
    result.catch((error) => {
      console.error('Audit logging failed:', error);
    });
  }
}

/**
 * Log a key usage event
 * Called when a key is used for an operation
 *
 * @param keyId - Key identifier
 * @param operation - Operation performed
 * @param algorithm - Algorithm used
 * @param metadata - Additional metadata
 */
export function logKeyUsed(
  keyId: string,
  operation: string,
  algorithm: string,
  metadata: AuditEventMetadata = {}
): void {
  if (!globalAuditLogger) return;

  const event = createAuditEvent(
    AuditEventType.KEY_USED,
    keyId,
    operation,
    {
      algorithm,
      ...metadata,
    }
  );

  const result = globalAuditLogger.logKeyUsed(event);
  if (result instanceof Promise) {
    result.catch((error) => {
      console.error('Audit logging failed:', error);
    });
  }
}

/**
 * Log a key deletion event
 * Called when a key is deleted or crypto-shredded
 *
 * @param keyId - Key identifier
 * @param metadata - Additional metadata
 */
export function logKeyDeleted(keyId: string, metadata: AuditEventMetadata = {}): void {
  if (!globalAuditLogger) return;

  const event = createAuditEvent(
    AuditEventType.KEY_DELETED,
    keyId,
    'deleteKey',
    metadata
  );

  const result = globalAuditLogger.logKeyDeleted(event);
  if (result instanceof Promise) {
    result.catch((error) => {
      console.error('Audit logging failed:', error);
    });
  }
}

/**
 * Log a key rotation event
 * Called when a key is rotated
 *
 * @param oldKeyId - Old key identifier
 * @param newKeyId - New key identifier
 * @param metadata - Additional metadata
 */
export function logKeyRotated(
  oldKeyId: string,
  newKeyId: string,
  metadata: AuditEventMetadata = {}
): void {
  if (!globalAuditLogger) return;

  const event = createAuditEvent(
    AuditEventType.KEY_ROTATED,
    newKeyId,
    'rotateKey',
    {
      oldKeyId,
      ...metadata,
    }
  );

  const result = globalAuditLogger.logKeyRotated(event);
  if (result instanceof Promise) {
    result.catch((error) => {
      console.error('Audit logging failed:', error);
    });
  }
}

/**
 * Log a key expiration event
 * Called when a key expires
 *
 * @param keyId - Key identifier
 * @param metadata - Additional metadata
 */
export function logKeyExpired(keyId: string, metadata: AuditEventMetadata = {}): void {
  if (!globalAuditLogger) return;

  const event = createAuditEvent(
    AuditEventType.KEY_EXPIRED,
    keyId,
    'keyExpired',
    metadata
  );

  const result = globalAuditLogger.logKeyExpired(event);
  if (result instanceof Promise) {
    result.catch((error) => {
      console.error('Audit logging failed:', error);
    });
  }
}

/**
 * Log a security event
 * Called for failed operations, invalid keys, suspicious activity
 *
 * @param eventType - Type of security event
 * @param operation - Operation that failed
 * @param metadata - Additional metadata
 */
export function logSecurityEvent(
  eventType: AuditEventType,
  operation: string,
  metadata: AuditEventMetadata = {}
): void {
  if (!globalAuditLogger) return;

  const event = createAuditEvent(eventType, undefined, operation, metadata);

  const result = globalAuditLogger.logSecurityEvent(event);
  if (result instanceof Promise) {
    result.catch((error) => {
      console.error('Audit logging failed:', error);
    });
  }
}

/**
 * Console audit logger implementation
 * Logs events to console with structured format
 * Useful for development and debugging
 */
export class ConsoleAuditLogger implements AuditLogger {
  private readonly redactSensitive: boolean;

  constructor(options: { redactSensitive?: boolean } = {}) {
    this.redactSensitive = options.redactSensitive ?? true;
  }

  logKeyCreated(event: AuditEvent): void {
    this.logEvent('KEY_CREATED', event);
  }

  logKeyUsed(event: AuditEvent): void {
    this.logEvent('KEY_USED', event);
  }

  logKeyDeleted(event: AuditEvent): void {
    this.logEvent('KEY_DELETED', event);
  }

  logKeyRotated(event: AuditEvent): void {
    this.logEvent('KEY_ROTATED', event);
  }

  logKeyExpired(event: AuditEvent): void {
    this.logEvent('KEY_EXPIRED', event);
  }

  logSecurityEvent(event: AuditEvent): void {
    this.logEvent('SECURITY_EVENT', event);
  }

  private logEvent(prefix: string, event: AuditEvent): void {
    const timestamp = new Date(event.timestamp).toISOString();
    const metadata = this.redactSensitive ? this.redactMetadata(event.metadata) : event.metadata;

    console.log(`[AUDIT:${prefix}] ${timestamp}`, {
      eventType: event.eventType,
      keyId: event.keyId,
      operation: event.operation,
      metadata,
    });
  }

  private redactMetadata(metadata: AuditEventMetadata): AuditEventMetadata {
    const redacted: AuditEventMetadata = { ...metadata };

    // Redact any field that might contain sensitive data
    const sensitiveFields = ['key', 'password', 'secret', 'token', 'plaintext', 'ciphertext'];
    for (const field of sensitiveFields) {
      if (field in redacted) {
        redacted[field] = '[REDACTED]';
      }
    }

    return redacted;
  }
}

/**
 * Create a console audit logger
 * Factory function for creating console logger instances
 *
 * @param options - Logger options
 * @returns ConsoleAuditLogger instance
 */
export function createConsoleAuditLogger(
  options?: { redactSensitive?: boolean }
): ConsoleAuditLogger {
  return new ConsoleAuditLogger(options);
}

/**
 * Custom audit logger implementation
 * Allows users to provide custom logging logic for SIEM integration
 */
export class CustomAuditLogger implements AuditLogger {
  private readonly handlers: {
    logKeyCreated?: (event: AuditEvent) => void | Promise<void>;
    logKeyUsed?: (event: AuditEvent) => void | Promise<void>;
    logKeyDeleted?: (event: AuditEvent) => void | Promise<void>;
    logKeyRotated?: (event: AuditEvent) => void | Promise<void>;
    logKeyExpired?: (event: AuditEvent) => void | Promise<void>;
    logSecurityEvent?: (event: AuditEvent) => void | Promise<void>;
  };

  constructor(handlers: {
    logKeyCreated?: (event: AuditEvent) => void | Promise<void>;
    logKeyUsed?: (event: AuditEvent) => void | Promise<void>;
    logKeyDeleted?: (event: AuditEvent) => void | Promise<void>;
    logKeyRotated?: (event: AuditEvent) => void | Promise<void>;
    logKeyExpired?: (event: AuditEvent) => void | Promise<void>;
    logSecurityEvent?: (event: AuditEvent) => void | Promise<void>;
  }) {
    this.handlers = handlers;
  }

  logKeyCreated(event: AuditEvent): void | Promise<void> {
    return this.handlers.logKeyCreated?.(event);
  }

  logKeyUsed(event: AuditEvent): void | Promise<void> {
    return this.handlers.logKeyUsed?.(event);
  }

  logKeyDeleted(event: AuditEvent): void | Promise<void> {
    return this.handlers.logKeyDeleted?.(event);
  }

  logKeyRotated(event: AuditEvent): void | Promise<void> {
    return this.handlers.logKeyRotated?.(event);
  }

  logKeyExpired(event: AuditEvent): void | Promise<void> {
    return this.handlers.logKeyExpired?.(event);
  }

  logSecurityEvent(event: AuditEvent): void | Promise<void> {
    return this.handlers.logSecurityEvent?.(event);
  }
}

/**
 * Create a custom audit logger
 * Factory function for creating custom logger instances
 *
 * @param handlers - Custom handler functions
 * @returns CustomAuditLogger instance
 */
export function createCustomAuditLogger(
  handlers: {
    logKeyCreated?: (event: AuditEvent) => void | Promise<void>;
    logKeyUsed?: (event: AuditEvent) => void | Promise<void>;
    logKeyDeleted?: (event: AuditEvent) => void | Promise<void>;
    logKeyRotated?: (event: AuditEvent) => void | Promise<void>;
    logKeyExpired?: (event: AuditEvent) => void | Promise<void>;
    logSecurityEvent?: (event: AuditEvent) => void | Promise<void>;
  }
): CustomAuditLogger {
  return new CustomAuditLogger(handlers);
}
