import { Controller, Get, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { PG_POOL, REDIS_CLIENT } from '../database/database.module';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(PG_POOL) private readonly pgPool: Pool,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  @Get()
  async check() {
    const status = { postgres: 'unknown', redis: 'unknown' };
    try {
      await this.pgPool.query('SELECT 1');
      status.postgres = 'ok';
    } catch {
      status.postgres = 'down';
    }
    try {
      status.redis = (await this.redisClient.ping()) === 'PONG' ? 'ok' : 'down';
    } catch {
      status.redis = 'down';
    }
    return status;
  }
}