import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry: Registry;

  private readonly httpRequestDuration: Histogram;
  private readonly httpRequestTotal: Counter;
  private readonly errorTotal: Counter;

  constructor() {
    this.registry = new Registry();

    // Collect default Node.js metrics (memory, CPU, event loop lag)
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_ms',
      help: 'Duration of HTTP requests in milliseconds',
      labelNames: ['method', 'path', 'status_code'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500],
      registers: [this.registry],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status_code', 'status_class'],
      registers: [this.registry],
    });

    this.errorTotal = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['context', 'error_type'],
      registers: [this.registry],
    });
  }

  recordHttpRequest(method: string, path: string, statusCode: number, durationMs: number) {
    const labels = {
      method,
      path,
      status_code: String(statusCode),
    };
    this.httpRequestDuration.observe(labels, durationMs);
    this.httpRequestTotal.inc({
      ...labels,
      status_class: `${Math.floor(statusCode / 100)}xx`,
    });
  }

  recordError(context: string, errorType: string) {
    this.errorTotal.inc({ context, error_type: errorType });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}