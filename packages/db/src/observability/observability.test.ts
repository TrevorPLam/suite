/**
 * Tests for database observability components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logQuery, extractOperation, extractTableName } from './query-logger.js';
import {
  recordQueryDuration,
  incrementQueryCount,
  incrementErrorCount,
  setPoolUtilization,
  incrementTransactionCount,
  incrementSlowQueryCount,
  exportMetrics,
  getMetricsAsJson,
  resetMetrics,
} from './metrics.js';
import { detectSlowQuery, isAlertThresholdExceeded, isWarningThresholdExceeded, getQuerySeverity } from './slow-query-detector.js';

describe('Query Logger', () => {
  beforeEach(() => {
    // Clear console logs to avoid noise in test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should log query with duration', () => {
    logQuery('SELECT * FROM users', 100);
    expect(console.log).toHaveBeenCalled();
  });

  it('should log slow query as warning', () => {
    logQuery('SELECT * FROM users', 1500);
    expect(console.warn).toHaveBeenCalled();
  });

  it('should log failed query as error', () => {
    const error = new Error('Connection failed');
    logQuery('SELECT * FROM users', 100, undefined, error);
    expect(console.error).toHaveBeenCalled();
  });

  it('should extract operation from SQL', () => {
    expect(extractOperation('SELECT * FROM users')).toBe('SELECT');
    expect(extractOperation('INSERT INTO users VALUES (1)')).toBe('INSERT');
    expect(extractOperation('UPDATE users SET name = "test"')).toBe('UPDATE');
    expect(extractOperation('DELETE FROM users')).toBe('DELETE');
    expect(extractOperation('CREATE TABLE test')).toBe('CREATE');
  });

  it('should extract table name from SQL', () => {
    expect(extractTableName('SELECT * FROM users')).toBe('users');
    expect(extractTableName('INSERT INTO users VALUES (1)')).toBe('users');
    expect(extractTableName('UPDATE users SET name = "test"')).toBe('users');
    expect(extractTableName('DELETE FROM users')).toBe('users');
  });
});

describe('Metrics Collector', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('should record query duration', () => {
    recordQueryDuration(100, 'SELECT');
    const metrics = getMetricsAsJson();
    // Histogram metrics are exported as percentiles
    expect(metrics.some(m => m.name === 'db_query_duration_select_p50')).toBe(true);
  });

  it('should increment query count', () => {
    incrementQueryCount('SELECT');
    incrementQueryCount('SELECT');
    const metrics = getMetricsAsJson();
    const selectCount = metrics.find(m => m.name === 'db_query_count_select');
    expect(selectCount?.value).toBe(2);
  });

  it('should increment error count', () => {
    incrementErrorCount('connection');
    const metrics = getMetricsAsJson();
    const errorCount = metrics.find(m => m.name === 'db_error_count_connection');
    expect(errorCount?.value).toBe(1);
  });

  it('should set pool utilization', () => {
    setPoolUtilization(10, 20);
    const metrics = getMetricsAsJson();
    const utilization = metrics.find(m => m.name === 'db_pool_utilization_percent');
    expect(utilization?.value).toBe(50);
  });

  it('should increment transaction count', () => {
    incrementTransactionCount(true);
    incrementTransactionCount(false);
    const metrics = getMetricsAsJson();
    expect(metrics.some(m => m.name === 'db_transaction_success')).toBe(true);
    expect(metrics.some(m => m.name === 'db_transaction_failure')).toBe(true);
  });

  it('should increment slow query count', () => {
    incrementSlowQueryCount(1000);
    const metrics = getMetricsAsJson();
    const slowCount = metrics.find(m => m.name === 'db_slow_query_count');
    expect(slowCount?.value).toBe(1);
  });

  it('should export metrics in Prometheus format', () => {
    recordQueryDuration(100, 'SELECT');
    const exported = exportMetrics();
    expect(exported).toContain('# HELP');
    expect(exported).toContain('# TYPE');
    expect(exported).toContain('db_query_duration_select');
  });

  it('should calculate percentiles from histogram', () => {
    recordQueryDuration(100, 'SELECT');
    recordQueryDuration(200, 'SELECT');
    recordQueryDuration(300, 'SELECT');
    const metrics = getMetricsAsJson();
    expect(metrics.some(m => m.name === 'db_query_duration_select_p50')).toBe(true);
    expect(metrics.some(m => m.name === 'db_query_duration_select_p95')).toBe(true);
    expect(metrics.some(m => m.name === 'db_query_duration_select_p99')).toBe(true);
  });

  it('should reset metrics', () => {
    incrementQueryCount('SELECT');
    resetMetrics();
    const metrics = getMetricsAsJson();
    expect(metrics.length).toBe(0);
  });
});

describe('Slow Query Detector', () => {
  it('should detect slow query above warning threshold', () => {
    const result = detectSlowQuery('SELECT * FROM users', 1500);
    expect(result).toBe(true);
  });

  it('should detect slow query above alert threshold', () => {
    const result = detectSlowQuery('SELECT * FROM users', 6000);
    expect(result).toBe(true);
  });

  it('should not detect fast query as slow', () => {
    const result = detectSlowQuery('SELECT * FROM users', 100);
    expect(result).toBe(false);
  });

  it('should check alert threshold exceeded', () => {
    expect(isAlertThresholdExceeded(6000)).toBe(true);
    expect(isAlertThresholdExceeded(1000)).toBe(false);
  });

  it('should check warning threshold exceeded', () => {
    expect(isWarningThresholdExceeded(1500)).toBe(true);
    expect(isWarningThresholdExceeded(500)).toBe(false);
  });

  it('should return query severity', () => {
    expect(getQuerySeverity(100)).toBe('normal');
    expect(getQuerySeverity(1500)).toBe('warning');
    expect(getQuerySeverity(6000)).toBe('alert');
  });

  it('should use custom thresholds', () => {
    const customThresholds = { warning: 500, alert: 2000 };
    expect(getQuerySeverity(600, customThresholds)).toBe('warning');
    expect(getQuerySeverity(2500, customThresholds)).toBe('alert');
  });
});
