/**
 * Slow Query Detector for Database Observability
 * 
 * Detects and logs slow queries based on configurable thresholds.
 * Queries exceeding thresholds are logged as warnings, and very slow
 * queries trigger alerts.
 */

import { logQuery } from './query-logger.js';
import { incrementSlowQueryCount } from './metrics.js';

/**
 * Slow query thresholds (in milliseconds)
 */
export interface SlowQueryThresholds {
  warning: number; // Log as warning
  alert: number; // Log as error and alert
}

/**
 * Default thresholds: 1s warning, 5s alert
 */
const DEFAULT_THRESHOLDS: SlowQueryThresholds = {
  warning: 1000,
  alert: 5000,
};

/**
 * Detect if a query is slow and log accordingly
 * 
 * @param sql - SQL query string
 * @param duration - Query duration in milliseconds
 * @param thresholds - Optional custom thresholds
 * @param context - Optional query context
 * @returns true if query was slow (exceeded warning threshold)
 */
export function detectSlowQuery(
  sql: string,
  duration: number,
  thresholds: SlowQueryThresholds = DEFAULT_THRESHOLDS,
  context?: Parameters<typeof logQuery>[2]
): boolean {
  if (duration >= thresholds.alert) {
    // Very slow query - alert
    const error = new Error(`Slow query alert: ${duration}ms exceeds threshold of ${thresholds.alert}ms`);
    logQuery(sql, duration, context, error);
    incrementSlowQueryCount(thresholds.alert);
    return true;
  }

  if (duration >= thresholds.warning) {
    // Slow query - warning
    logQuery(sql, duration, context);
    incrementSlowQueryCount(thresholds.warning);
    return true;
  }

  return false;
}

/**
 * Check if duration exceeds alert threshold
 */
export function isAlertThresholdExceeded(
  duration: number,
  thresholds: SlowQueryThresholds = DEFAULT_THRESHOLDS
): boolean {
  return duration >= thresholds.alert;
}

/**
 * Check if duration exceeds warning threshold
 */
export function isWarningThresholdExceeded(
  duration: number,
  thresholds: SlowQueryThresholds = DEFAULT_THRESHOLDS
): boolean {
  return duration >= thresholds.warning;
}

/**
 * Get severity level for a query duration
 */
export function getQuerySeverity(
  duration: number,
  thresholds: SlowQueryThresholds = DEFAULT_THRESHOLDS
): 'normal' | 'warning' | 'alert' {
  if (duration >= thresholds.alert) return 'alert';
  if (duration >= thresholds.warning) return 'warning';
  return 'normal';
}
