import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { MetricsService } from './metrics.service';
import { Request, Response } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const method = request.method;
    // Normalize path — replace UUIDs and IDs with placeholders
    // so "/orgs/acme-corp/repos/123" and "/orgs/vercel/repos/456"
    // collapse into one metric instead of cardinality explosion
    const path = request.route?.path ?? request.path;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.metricsService.recordHttpRequest(
          method, path, response.statusCode, duration,
        );
      }),
      catchError(err => {
        const duration = Date.now() - start;
        const statusCode = err.status ?? 500;
        this.metricsService.recordHttpRequest(method, path, statusCode, duration);
        this.metricsService.recordError(path, err.constructor.name);
        return throwError(() => err);
      }),
    );
  }
}