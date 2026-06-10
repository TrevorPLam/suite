/**
 * Metrics Collector for Database Observability
 * 
 * Collects and exports Prometheus-style metrics for database operations.
 * Tracks query duration percentiles, connection pool utilization,
 * transaction success/failure rates, and slow query counts.
 */

/**
 * Metric types for Prometheus export
 */
export interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  value: number;
  labels?: Record<string, string>;
}

/**
 * In-memory metrics store
 * Note: In Cloudflare Workers, this resets per invocation. For production,
 * consider using a metrics aggregation service or Workers Analytics Engine.
 */
class MetricsStore {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  incrementCounter(name: string, value = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  observeHistogram(name: string, value: number): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    this.histograms.set(name, values);
  }

  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  getGauge(name: string): number {
    return this.gauges.get(name) || 0;
  }

  getHistogram(name: string): number[] {
    return this.histograms.get(name) || [];
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  getAllMetrics(): Metric[] {
    const metrics: Metric[] = [];

    // Counters
    for (const [name, value] of this.counters.entries()) {
      metrics.push({ name, type: 'counter', help: `Counter metric: ${name}`, value });
    }

    // Gauges
    for (const [name, value] of this.gauges.entries()) {
      metrics.push({ name, type: 'gauge', help: `Gauge metric: ${name}`, value });
    }

    // Histograms (export as summary with percentiles)
    for (const [name, values] of this.histograms.entries()) {
      if (values.length === 0) continue;

      const sorted = [...values].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

      metrics.push({ name: `${name}_p50`, type: 'gauge', help: `50th percentile: ${name}`, value: p50 });
      metrics.push({ name: `${name}_p95`, type: 'gauge', help: `95th percentile: ${name}`, value: p95 });
      metrics.push({ name: `${name}_p99`, type: 'gauge', help: `99th percentile: ${name}`, value: p99 });
      metrics.push({ name: `${name}_count`, type: 'counter', help: `Count: ${name}`, value: values.length });
    }

    return metrics;
  }
}

const store = new MetricsStore();

/**
 * Record a query duration for histogram metrics
 */
export function recordQueryDuration(duration: number, operation?: string): void {
  const metricName = operation ? `db_query_duration_${operation.toLowerCase()}` : 'db_query_duration';
  store.observeHistogram(metricName, duration);
}

/**
 * Increment query counter
 */
export function incrementQueryCount(operation?: string): void {
  const metricName = operation ? `db_query_count_${operation.toLowerCase()}` : 'db_query_count';
  store.incrementCounter(metricName);
}

/**
 * Increment error counter
 */
export function incrementErrorCount(errorType?: string): void {
  const metricName = errorType ? `db_error_count_${errorType}` : 'db_error_count';
  store.incrementCounter(metricName);
}

/**
 * Set connection pool utilization gauge
 */
export function setPoolUtilization(active: number, max: number): void {
  const utilization = max > 0 ? (active / max) * 100 : 0;
  store.setGauge('db_pool_utilization_percent', utilization);
  store.setGauge('db_pool_active_connections', active);
  store.setGauge('db_pool_max_connections', max);
}

/**
 * Increment transaction counter
 */
export function incrementTransactionCount(success: boolean): void {
  const metricName = success ? 'db_transaction_success' : 'db_transaction_failure';
  store.incrementCounter(metricName);
}

/**
 * Increment slow query counter
 */
export function incrementSlowQueryCount(threshold: number): void {
  store.incrementCounter('db_slow_query_count');
  store.setGauge('db_slow_query_threshold_ms', threshold);
}

/**
 * Export metrics in Prometheus text format
 */
export function exportMetrics(): string {
  const metrics = store.getAllMetrics();
  const lines: string[] = [];

  for (const metric of metrics) {
    lines.push(`# HELP ${metric.name} ${metric.help}`);
    lines.push(`# TYPE ${metric.name} ${metric.type}`);
    
    if (metric.labels) {
      const labelStr = Object.entries(metric.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      lines.push(`${metric.name}{${labelStr}} ${metric.value}`);
    } else {
      lines.push(`${metric.name} ${metric.value}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get all metrics as JSON (for API endpoints)
 */
export function getMetricsAsJson(): Metric[] {
  return store.getAllMetrics();
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  store.reset();
}
