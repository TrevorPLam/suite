/**
 * Query Logger for Database Observability
 * 
 * Provides structured logging for database queries with metadata for debugging
 * and performance monitoring. Logs SQL, duration, userId, tenantId, and other
 * context information.
 */

export interface QueryLogContext {
  userId?: string;
  tenantId?: string;
  operation?: string;
  table?: string;
}

export interface QueryLogEntry {
  sql: string;
  duration: number; // milliseconds
  success: boolean;
  error?: string;
  context?: QueryLogContext;
  timestamp: number;
}

/**
 * Log a database query with metadata
 * 
 * @param sql - SQL query string (truncated to 1000 chars for log size)
 * @param duration - Query duration in milliseconds
 * @param context - Optional context (userId, tenantId, operation, table)
 * @param error - Optional error if query failed
 */
export function logQuery(
  sql: string,
  duration: number,
  context?: QueryLogContext,
  error?: Error
): void {
  const entry: QueryLogEntry = {
    sql: sql.length > 1000 ? sql.substring(0, 1000) + '...' : sql,
    duration,
    success: !error,
    ...(error && { error: error.message }),
    ...(context && { context }),
    timestamp: Date.now(),
  };

  // Structured logging - in production this would go to a proper logging system
  // For now, use console with structured format
  const logLevel = error ? 'error' : duration > 1000 ? 'warn' : 'info';
  const logData = {
    type: 'database_query',
    ...entry,
  };

  if (logLevel === 'error') {
    console.error('[DB Query]', JSON.stringify(logData));
  } else if (logLevel === 'warn') {
    console.warn('[DB Query]', JSON.stringify(logData));
  } else {
    console.log('[DB Query]', JSON.stringify(logData));
  }
}

/**
 * Extract table name from SQL query for better categorization
 * 
 * @param sql - SQL query string
 * @returns Table name or undefined
 */
export function extractTableName(sql: string): string | undefined {
  const match = sql.match(/(?:FROM|INTO|UPDATE)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  return match?.[1];
}

/**
 * Extract operation type from SQL query
 * 
 * @param sql - SQL query string
 * @returns Operation type (SELECT, INSERT, UPDATE, DELETE, etc.)
 */
export function extractOperation(sql: string): string | undefined {
  const match = sql.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)/i);
  return match?.[1]?.toUpperCase();
}
