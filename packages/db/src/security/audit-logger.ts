/**
 * Audit Logger for Security and Compliance
 * 
 * Logs sensitive operations for security monitoring and compliance.
 * Tracks user creation/deletion, permission changes, bulk exports, and schema modifications.
 */

/**
 * Audit event types
 */
export enum AuditEventType {
  USER_CREATED = 'USER_CREATED',
  USER_DELETED = 'USER_DELETED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  BULK_EXPORT = 'BULK_EXPORT',
  SCHEMA_MODIFIED = 'SCHEMA_MODIFIED',
  DATA_DELETED = 'DATA_DELETED',
  DATA_UPDATED = 'DATA_UPDATED',
  DATA_CREATED = 'DATA_CREATED',
}

/**
 * Audit event structure
 */
export interface AuditEvent {
  eventType: AuditEventType;
  userId: string;
  tenantId: string;
  timestamp: Date;
  operation: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown> | undefined;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * In-memory audit log storage
 * In production, this should be replaced with a persistent storage solution
 * (e.g., database table, external logging service, or Cloudflare Analytics Engine)
 */
const auditLog: AuditEvent[] = [];

/**
 * Maximum audit log size to prevent memory bloat
 */
const MAX_AUDIT_LOG_SIZE = 10000;

/**
 * Log an audit event
 * 
 * @param event - The audit event to log
 */
export function logAuditEvent(event: AuditEvent): void {
  // Ensure timestamp is set
  if (!event.timestamp) {
    event.timestamp = new Date();
  }

  // Add to in-memory log
  auditLog.push(event);

  // Prevent memory bloat by removing old entries
  if (auditLog.length > MAX_AUDIT_LOG_SIZE) {
    auditLog.shift();
  }

  // In production, you would also:
  // 1. Write to a database table
  // 2. Send to external logging service (e.g., Datadog, Splunk)
  // 3. Use Cloudflare Analytics Engine for Workers
  // 4. Send to SIEM system for security monitoring

  // For now, we'll log to console for development
  console.log('[AUDIT]', JSON.stringify({
    eventType: event.eventType,
    userId: event.userId,
    tenantId: event.tenantId,
    timestamp: event.timestamp.toISOString(),
    operation: event.operation,
    entity: event.entity,
    entityId: event.entityId,
    metadata: event.metadata,
  }));
}

/**
 * Create a user creation audit event
 * 
 * @param userId - The user ID
 * @param tenantId - The tenant ID
 * @param metadata - Optional metadata
 */
export function logUserCreated(userId: string, tenantId: string, metadata?: Record<string, unknown>): void {
  const event: AuditEvent = {
    eventType: AuditEventType.USER_CREATED,
    userId,
    tenantId,
    timestamp: new Date(),
    operation: 'CREATE_USER',
    entity: 'user',
    entityId: userId,
  };
  if (metadata !== undefined) {
    event.metadata = metadata;
  }
  logAuditEvent(event);
}

/**
 * Create a user deletion audit event
 * 
 * @param userId - The user ID
 * @param tenantId - The tenant ID
 * @param metadata - Optional metadata
 */
export function logUserDeleted(userId: string, tenantId: string, metadata?: Record<string, unknown>): void {
  const event: AuditEvent = {
    eventType: AuditEventType.USER_DELETED,
    userId,
    tenantId,
    timestamp: new Date(),
    operation: 'DELETE_USER',
    entity: 'user',
    entityId: userId,
  };
  if (metadata !== undefined) {
    event.metadata = metadata;
  }
  logAuditEvent(event);
}

/**
 * Create a permission change audit event
 * 
 * @param userId - The user ID
 * @param tenantId - The tenant ID
 * @param permission - The permission that changed
 * @param oldValue - The old permission value
 * @param newValue - The new permission value
 * @param metadata - Optional metadata
 */
export function logPermissionChanged(
  userId: string,
  tenantId: string,
  permission: string,
  oldValue: unknown,
  newValue: unknown,
  metadata?: Record<string, unknown>
): void {
  logAuditEvent({
    eventType: AuditEventType.PERMISSION_CHANGED,
    userId,
    tenantId,
    timestamp: new Date(),
    operation: 'UPDATE_PERMISSION',
    entity: 'permission',
    metadata: {
      permission,
      oldValue,
      newValue,
      ...metadata,
    },
  });
}

/**
 * Create a bulk export audit event
 * 
 * @param userId - The user ID
 * @param tenantId - The tenant ID
 * @param entity - The entity type being exported
 * @param count - The number of records exported
 * @param metadata - Optional metadata
 */
export function logBulkExport(
  userId: string,
  tenantId: string,
  entity: string,
  count: number,
  metadata?: Record<string, unknown>
): void {
  logAuditEvent({
    eventType: AuditEventType.BULK_EXPORT,
    userId,
    tenantId,
    timestamp: new Date(),
    operation: 'BULK_EXPORT',
    entity,
    metadata: {
      count,
      ...metadata,
    },
  });
}

/**
 * Create a schema modification audit event
 * 
 * @param userId - The user ID
 * @param tenantId - The tenant ID
 * @param operation - The schema operation (e.g., ADD_COLUMN, DROP_TABLE)
 * @param table - The affected table
 * @param metadata - Optional metadata
 */
export function logSchemaModified(
  userId: string,
  tenantId: string,
  operation: string,
  table: string,
  metadata?: Record<string, unknown>
): void {
  logAuditEvent({
    eventType: AuditEventType.SCHEMA_MODIFIED,
    userId,
    tenantId,
    timestamp: new Date(),
    operation,
    entity: 'schema',
    metadata: {
      table,
      ...metadata,
    },
  });
}

/**
 * Create a data deletion audit event
 * 
 * @param userId - The user ID
 * @param tenantId - The tenant ID
 * @param entity - The entity type
 * @param entityId - The entity ID
 * @param metadata - Optional metadata
 */
export function logDataDeleted(
  userId: string,
  tenantId: string,
  entity: string,
  entityId: string,
  metadata?: Record<string, unknown>
): void {
  const event: AuditEvent = {
    eventType: AuditEventType.DATA_DELETED,
    userId,
    tenantId,
    timestamp: new Date(),
    operation: 'DELETE',
    entity,
    entityId,
  };
  if (metadata !== undefined) {
    event.metadata = metadata;
  }
  logAuditEvent(event);
}

/**
 * Create a data creation audit event
 * 
 * @param userId - The user ID
 * @param tenantId - The tenant ID
 * @param entity - The entity type
 * @param entityId - The entity ID
 * @param metadata - Optional metadata
 */
export function logDataCreated(
  userId: string,
  tenantId: string,
  entity: string,
  entityId: string,
  metadata?: Record<string, unknown>
): void {
  const event: AuditEvent = {
    eventType: AuditEventType.DATA_CREATED,
    userId,
    tenantId,
    timestamp: new Date(),
    operation: 'CREATE',
    entity,
    entityId,
  };
  if (metadata !== undefined) {
    event.metadata = metadata;
  }
  logAuditEvent(event);
}

/**
 * Create a data update audit event
 * 
 * @param userId - The user ID
 * @param tenantId - The tenant ID
 * @param entity - The entity type
 * @param entityId - The entity ID
 * @param metadata - Optional metadata
 */
export function logDataUpdated(
  userId: string,
  tenantId: string,
  entity: string,
  entityId: string,
  metadata?: Record<string, unknown>
): void {
  const event: AuditEvent = {
    eventType: AuditEventType.DATA_UPDATED,
    userId,
    tenantId,
    timestamp: new Date(),
    operation: 'UPDATE',
    entity,
    entityId,
  };
  if (metadata !== undefined) {
    event.metadata = metadata;
  }
  logAuditEvent(event);
}

/**
 * Query audit log for events
 * 
 * @param filters - Optional filters for the query
 * @returns Array of matching audit events
 */
export function queryAuditLog(filters?: {
  userId?: string;
  tenantId?: string;
  eventType?: AuditEventType;
  entity?: string;
  startDate?: Date;
  endDate?: Date;
}): AuditEvent[] {
  let results = [...auditLog];

  if (filters?.userId) {
    results = results.filter(event => event.userId === filters.userId);
  }

  if (filters?.tenantId) {
    results = results.filter(event => event.tenantId === filters.tenantId);
  }

  if (filters?.eventType) {
    results = results.filter(event => event.eventType === filters.eventType);
  }

  if (filters?.entity) {
    results = results.filter(event => event.entity === filters.entity);
  }

  if (filters?.startDate) {
    const startDate = filters.startDate;
    results = results.filter(event => event.timestamp >= startDate);
  }

  if (filters?.endDate) {
    const endDate = filters.endDate;
    results = results.filter(event => event.timestamp <= endDate);
  }

  return results;
}

/**
 * Clear audit log (useful for testing)
 */
export function clearAuditLog(): void {
  auditLog.length = 0;
}
