/**
 * Database error codes for classification and handling
 * 
 * Provides actionable error codes to distinguish between transient and permanent errors.
 * Transient errors should be retried with exponential backoff.
 * Permanent errors should fail fast without retry.
 */

/**
 * Database error codes
 */
export enum DatabaseErrorCode {
  // Transient errors - retry with backoff
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_QUERY_TIMEOUT = 'DB_QUERY_TIMEOUT',
  DB_TRANSIENT_ERROR = 'DB_TRANSIENT_ERROR',
  
  // Permanent errors - fail fast
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',
  DB_DEADLOCK_DETECTED = 'DB_DEADLOCK_DETECTED',
  DB_SYNTAX_ERROR = 'DB_SYNTAX_ERROR',
  DB_INVALID_DATA = 'DB_INVALID_DATA',
}

/**
 * PostgreSQL SQLSTATE codes for transient errors
 * These codes indicate temporary failures that may resolve with retry
 */
export const TRANSIENT_SQLSTATE_CODES = new Set<string>([
  '57P01', // admin_shutdown
  '08006', // connection_failure
  '08003', // connection_does_not_exist
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // server_rejected_establishment_of_sqlconnection
  '08007', // transaction_resolution_unknown
  '40001', // serialization_failure (deadlock - may be retried)
  '40P01', // deadlock_detected
]);

/**
 * PostgreSQL SQLSTATE codes for permanent errors
 * These codes indicate permanent failures that should not be retried
 */
export const PERMANENT_SQLSTATE_CODES = new Set<string>([
  '23505', // unique_violation
  '23503', // foreign_key_violation
  '23502', // not_null_violation
  '23514', // check_violation
  '22001', // string_data_right_truncation
  '22003', // numeric_value_out_of_range
  '42601', // syntax_error
  '42703', // undefined_column
  '42702', // ambiguous_column
  '42701', // duplicate_column
  '42P01', // undefined_table
  '42P02', // undefined_parameter
  '42P04', // duplicate_table
  '42P06', // duplicate_schema
  '42P07', // duplicate_object
  '42P16', // invalid_table_definition
  '28000', // invalid_authorization_specification
  '28P01', // invalid_password
]);

/**
 * Classify an error as transient or permanent based on error message or SQLSTATE
 * 
 * @param error - The error to classify
 * @returns true if the error is transient (should be retried), false if permanent
 */
export function isTransientError(error: Error | unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  
  // Check for transient error keywords in message
  const transientKeywords = [
    'connection',
    'timeout',
    'network',
    'temporary',
    'unavailable',
    'too many connections',
    'admin shutdown',
  ];
  
  for (const keyword of transientKeywords) {
    if (message.includes(keyword)) {
      return true;
    }
  }

  // Check for SQLSTATE code in error message
  const sqlstateMatch = error.message.match(/SQLSTATE\[?["']?([0-9A-Z]{5})["']?\]?/i);
  if (sqlstateMatch && sqlstateMatch[1]) {
    const sqlstate = sqlstateMatch[1];
    return TRANSIENT_SQLSTATE_CODES.has(sqlstate);
  }

  // Check postgres.js error code format
  const codeMatch = error.message.match(/code: ['"]?([0-9A-Z]{5})['"]?/i);
  if (codeMatch && codeMatch[1]) {
    const code = codeMatch[1];
    return TRANSIENT_SQLSTATE_CODES.has(code);
  }

  return false;
}

/**
 * Get a database error code from an error
 * 
 * @param error - The error to classify
 * @returns A DatabaseErrorCode
 */
export function getDatabaseErrorCode(error: Error | unknown): DatabaseErrorCode {
  if (!(error instanceof Error)) {
    return DatabaseErrorCode.DB_TRANSIENT_ERROR;
  }

  const message = error.message.toLowerCase();

  // Check for constraint violations
  if (message.includes('unique constraint') || message.includes('duplicate key')) {
    return DatabaseErrorCode.DB_CONSTRAINT_VIOLATION;
  }
  if (message.includes('foreign key constraint')) {
    return DatabaseErrorCode.DB_CONSTRAINT_VIOLATION;
  }
  if (message.includes('not null constraint')) {
    return DatabaseErrorCode.DB_CONSTRAINT_VIOLATION;
  }
  if (message.includes('check constraint')) {
    return DatabaseErrorCode.DB_CONSTRAINT_VIOLATION;
  }

  // Check for deadlock
  if (message.includes('deadlock') || message.includes('serialization failure')) {
    return DatabaseErrorCode.DB_DEADLOCK_DETECTED;
  }

  // Check for syntax errors
  if (message.includes('syntax error')) {
    return DatabaseErrorCode.DB_SYNTAX_ERROR;
  }

  // Check for connection errors
  if (message.includes('connection') || message.includes('timeout')) {
    return DatabaseErrorCode.DB_CONNECTION_FAILED;
  }

  // Default to transient error
  return DatabaseErrorCode.DB_TRANSIENT_ERROR;
}
