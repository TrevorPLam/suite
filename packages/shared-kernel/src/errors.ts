/**
 * Error Code Taxonomy
 * 
 * This module defines error code constants and error classes following the
 * standardized error taxonomy from the planning docs.
 * 
 * Error codes follow the pattern: <domain>_<error_name> or global_<error_name>
 * for cross-domain errors. All error codes are kebab-case.
 */

// ============================================================================
// Error Code Constants
// ============================================================================

// Global Errors (Cross-Domain)
export const ERROR_CODES = {
  GLOBAL_UNAUTHORIZED: 'global_unauthorized',
  GLOBAL_FORBIDDEN: 'global_forbidden',
  GLOBAL_NOT_FOUND: 'global_not_found',
  GLOBAL_RATE_LIMITED: 'global_rate_limited',
  GLOBAL_INTERNAL_ERROR: 'global_internal_error',
  GLOBAL_SERVICE_UNAVAILABLE: 'global_service_unavailable',
  GLOBAL_INVALID_REQUEST: 'global_invalid_request',
  GLOBAL_IDEMPOTENCY_CONFLICT: 'global_idempotency_conflict',

  // Calendar Domain Errors
  CALENDAR_EVENT_NOT_FOUND: 'calendar_event_not_found',
  CALENDAR_INVALID_DATE_RANGE: 'calendar_invalid_date_range',
  CALENDAR_EVENT_CONFLICT: 'calendar_event_conflict',
  CALENDAR_ATTENDEE_LIMIT_EXCEEDED: 'calendar_attendee_limit_exceeded',
  CALENDAR_RECURSION_LIMIT_EXCEEDED: 'calendar_recursion_limit_exceeded',

  // Drive Domain Errors
  DRIVE_FILE_NOT_FOUND: 'drive_file_not_found',
  DRIVE_QUOTA_EXCEEDED: 'drive_quota_exceeded',
  DRIVE_INVALID_FILE_TYPE: 'drive_invalid_file_type',
  DRIVE_VIRUS_DETECTED: 'drive_virus_detected',
  DRIVE_FOLDER_NOT_EMPTY: 'drive_folder_not_empty',
  DRIVE_SHARE_LINK_EXPIRED: 'drive_share_link_expired',

  // Tasks Domain Errors
  TASKS_TASK_NOT_FOUND: 'tasks_task_not_found',
  TASKS_PROJECT_NOT_FOUND: 'tasks_project_not_found',
  TASKS_CIRCULAR_DEPENDENCY: 'tasks_circular_dependency',
  TASKS_COMPLETION_CONFLICT: 'tasks_completion_conflict',
} as const;

// ============================================================================
// Base Error Class
// ============================================================================

export class AppError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly timestamp: string;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}

// ============================================================================
// Global Error Classes
// ============================================================================

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: unknown) {
    super(ERROR_CODES.GLOBAL_UNAUTHORIZED, message, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Permission denied', details?: unknown) {
    super(ERROR_CODES.GLOBAL_FORBIDDEN, message, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(ERROR_CODES.GLOBAL_NOT_FOUND, message, details);
    this.name = 'NotFoundError';
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Rate limit exceeded', details?: unknown) {
    super(ERROR_CODES.GLOBAL_RATE_LIMITED, message, details);
    this.name = 'RateLimitedError';
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error', details?: unknown) {
    super(ERROR_CODES.GLOBAL_INTERNAL_ERROR, message, details);
    this.name = 'InternalError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', details?: unknown) {
    super(ERROR_CODES.GLOBAL_SERVICE_UNAVAILABLE, message, details);
    this.name = 'ServiceUnavailableError';
  }
}

export class InvalidRequestError extends AppError {
  constructor(message = 'Invalid request', details?: unknown) {
    super(ERROR_CODES.GLOBAL_INVALID_REQUEST, message, details);
    this.name = 'InvalidRequestError';
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(message = 'Idempotency key already used with different payload', details?: unknown) {
    super(ERROR_CODES.GLOBAL_IDEMPOTENCY_CONFLICT, message, details);
    this.name = 'IdempotencyConflictError';
  }
}

// ============================================================================
// Calendar Domain Error Classes
// ============================================================================

export class CalendarEventNotFoundError extends AppError {
  constructor(message = 'Event not found', details?: unknown) {
    super(ERROR_CODES.CALENDAR_EVENT_NOT_FOUND, message, details);
    this.name = 'CalendarEventNotFoundError';
  }
}

export class CalendarInvalidDateRangeError extends AppError {
  constructor(message = 'End date must be after start date', details?: unknown) {
    super(ERROR_CODES.CALENDAR_INVALID_DATE_RANGE, message, details);
    this.name = 'CalendarInvalidDateRangeError';
  }
}

export class CalendarEventConflictError extends AppError {
  constructor(message = 'Event conflicts with existing event', details?: unknown) {
    super(ERROR_CODES.CALENDAR_EVENT_CONFLICT, message, details);
    this.name = 'CalendarEventConflictError';
  }
}

export class CalendarAttendeeLimitExceededError extends AppError {
  constructor(message = 'Attendee limit exceeded', details?: unknown) {
    super(ERROR_CODES.CALENDAR_ATTENDEE_LIMIT_EXCEEDED, message, details);
    this.name = 'CalendarAttendeeLimitExceededError';
  }
}

export class CalendarRecursionLimitExceededError extends AppError {
  constructor(message = 'Recurrence pattern too complex', details?: unknown) {
    super(ERROR_CODES.CALENDAR_RECURSION_LIMIT_EXCEEDED, message, details);
    this.name = 'CalendarRecursionLimitExceededError';
  }
}

// ============================================================================
// Drive Domain Error Classes
// ============================================================================

export class DriveFileNotFoundError extends AppError {
  constructor(message = 'File not found', details?: unknown) {
    super(ERROR_CODES.DRIVE_FILE_NOT_FOUND, message, details);
    this.name = 'DriveFileNotFoundError';
  }
}

export class DriveQuotaExceededError extends AppError {
  constructor(message = 'Storage quota exceeded', details?: unknown) {
    super(ERROR_CODES.DRIVE_QUOTA_EXCEEDED, message, details);
    this.name = 'DriveQuotaExceededError';
  }
}

export class DriveInvalidFileTypeError extends AppError {
  constructor(message = 'Invalid file type', details?: unknown) {
    super(ERROR_CODES.DRIVE_INVALID_FILE_TYPE, message, details);
    this.name = 'DriveInvalidFileTypeError';
  }
}

export class DriveVirusDetectedError extends AppError {
  constructor(message = 'Virus detected in file', details?: unknown) {
    super(ERROR_CODES.DRIVE_VIRUS_DETECTED, message, details);
    this.name = 'DriveVirusDetectedError';
  }
}

export class DriveFolderNotEmptyError extends AppError {
  constructor(message = 'Folder not empty', details?: unknown) {
    super(ERROR_CODES.DRIVE_FOLDER_NOT_EMPTY, message, details);
    this.name = 'DriveFolderNotEmptyError';
  }
}

export class DriveShareLinkExpiredError extends AppError {
  constructor(message = 'Share link expired', details?: unknown) {
    super(ERROR_CODES.DRIVE_SHARE_LINK_EXPIRED, message, details);
    this.name = 'DriveShareLinkExpiredError';
  }
}

// ============================================================================
// Tasks Domain Error Classes
// ============================================================================

export class TasksTaskNotFoundError extends AppError {
  constructor(message = 'Task not found', details?: unknown) {
    super(ERROR_CODES.TASKS_TASK_NOT_FOUND, message, details);
    this.name = 'TasksTaskNotFoundError';
  }
}

export class TasksProjectNotFoundError extends AppError {
  constructor(message = 'Project not found', details?: unknown) {
    super(ERROR_CODES.TASKS_PROJECT_NOT_FOUND, message, details);
    this.name = 'TasksProjectNotFoundError';
  }
}

export class TasksCircularDependencyError extends AppError {
  constructor(message = 'Circular dependency detected', details?: unknown) {
    super(ERROR_CODES.TASKS_CIRCULAR_DEPENDENCY, message, details);
    this.name = 'TasksCircularDependencyError';
  }
}

export class TasksCompletionConflictError extends AppError {
  constructor(message = 'Cannot complete task with incomplete dependencies', details?: unknown) {
    super(ERROR_CODES.TASKS_COMPLETION_CONFLICT, message, details);
    this.name = 'TasksCompletionConflictError';
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isNotFoundError(error: unknown): error is NotFoundError | CalendarEventNotFoundError | DriveFileNotFoundError | TasksTaskNotFoundError | TasksProjectNotFoundError {
  return isAppError(error) && (
    error.code === ERROR_CODES.GLOBAL_NOT_FOUND ||
    error.code === ERROR_CODES.CALENDAR_EVENT_NOT_FOUND ||
    error.code === ERROR_CODES.DRIVE_FILE_NOT_FOUND ||
    error.code === ERROR_CODES.TASKS_TASK_NOT_FOUND ||
    error.code === ERROR_CODES.TASKS_PROJECT_NOT_FOUND
  );
}

export function isConflictError(error: unknown): error is IdempotencyConflictError | CalendarEventConflictError | DriveFolderNotEmptyError | TasksCompletionConflictError {
  return isAppError(error) && (
    error.code === ERROR_CODES.GLOBAL_IDEMPOTENCY_CONFLICT ||
    error.code === ERROR_CODES.CALENDAR_EVENT_CONFLICT ||
    error.code === ERROR_CODES.DRIVE_FOLDER_NOT_EMPTY ||
    error.code === ERROR_CODES.TASKS_COMPLETION_CONFLICT
  );
}
