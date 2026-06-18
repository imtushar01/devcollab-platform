import { Controller, Get } from '@nestjs/common';
import { Pool } from 'pg';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  private pgPool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'devcollab',
    password: 'devcollab',
    database: 'devcollab',
  });

  private redisClient = new Redis({
    host: 'localhost',
    port: 6379,
  });

  @Get()
  async check() {
    const status = { postgres: 'unknown', redis: 'unknown' };

    try {
      await this.pgPool.query('SELECT 1');
      status.postgres = 'ok';
    } catch (err) {
      status.postgres = 'down';
    }

    try {
      const pong = await this.redisClient.ping();
      status.redis = pong === 'PONG' ? 'ok' : 'down';
    } catch (err) {
      status.redis = 'down';
    }

    return status;
  }
}