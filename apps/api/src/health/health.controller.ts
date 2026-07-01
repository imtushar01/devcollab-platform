import { Controller, Get, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { PG_POOL, REDIS_CLIENT } from '../database/database.module';
import { RateLimit } from '../common/guards/rate-limit.guard';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(PG_POOL) private readonly pgPool: Pool,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

 @Get()
  @RateLimit({ windowMs: 10 * 1000, max: 5, keyPrefix: 'health' })
  async check() {
    const status: Record<string, any> = {
      postgres: 'unknown',
      redis: 'unknown',
      cache: 'unknown',
    };

    try {
      await this.pgPool.query('SELECT 1');
      status.postgres = 'ok';
    } catch {
      status.postgres = 'down';
    }

    try {
      const pong = await this.redisClient.ping();
      status.redis = pong === 'PONG' ? 'ok' : 'down';

      // Get Redis memory info for cache health
      const info = await this.redisClient.info('memory');
      const memMatch = info.match(/used_memory_human:(\S+)/);
      status.cache = {
        status: 'ok',
        memoryUsed: memMatch?.[1] ?? 'unknown',
      };
    } catch {
      status.redis = 'down';
      status.cache = 'down';
    }

    return status;
  }
}