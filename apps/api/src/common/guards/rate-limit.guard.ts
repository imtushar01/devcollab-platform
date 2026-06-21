import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../database/database.module';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  windowMs: number;   // sliding window size in milliseconds
  max: number;        // max requests allowed per window
  keyPrefix?: string; // namespace for this specific limit
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!options) return true; // no rate limit configured for this route

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const identifier = this.getIdentifier(request);
    const prefix = options.keyPrefix ?? context.getHandler().name;
    const key = `rate_limit:${prefix}:${identifier}`;

    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Sliding window using a sorted set:
    // - Score = timestamp (milliseconds)
    // - Member = unique request ID (timestamp:random)
    // 1. Remove all entries older than the window
    // 2. Count remaining entries
    // 3. If under limit, add this request
    // 4. Set TTL so keys self-clean

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    pipeline.zcard(key);
    pipeline.zadd(key, now, `${now}:${Math.random()}`);
    pipeline.pexpire(key, options.windowMs);

    const results = await pipeline.exec();
    const currentCount = results![1][1] as number;

    response.setHeader('X-RateLimit-Limit', options.max);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - currentCount - 1));
    response.setHeader('X-RateLimit-Reset', new Date(now + options.windowMs).toISOString());

    if (currentCount >= options.max) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests — please slow down',
          retryAfter: Math.ceil(options.windowMs / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getIdentifier(request: Request): string {
    // Authenticated users: rate limit by user ID (fair per-user limits)
    // Unauthenticated: rate limit by IP (best we can do without identity)
    const user = (request as any).user;
    if (user?.userId) return `user:${user.userId}`;

    const forwarded = request.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? request.ip;
    return `ip:${ip}`;
  }
}