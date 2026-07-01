import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../database/database.module';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly inflightRequests = new Map<string, Promise<any>>();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async deleteByPattern(pattern: string): Promise<void> {
    // SCAN is non-blocking unlike KEYS — safe to use in production
    // KEYS blocks Redis's single thread and can cause latency spikes
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, found] = await this.redis.scan(
        cursor, 'MATCH', pattern, 'COUNT', 100,
      );
      cursor = nextCursor;
      keys.push(...found);
    } while (cursor !== '0');

    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(`Invalidated ${keys.length} cache keys matching ${pattern}`);
    }
  }

  // Cache-aside with stampede prevention using in-process deduplication
  // If 500 concurrent requests all miss the cache simultaneously,
  // only ONE actually hits the database — the other 499 wait for that
  // one promise to resolve, then all get the same result
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    // Check cache first
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    // Check if there's already an in-flight request for this key
    const existing = this.inflightRequests.get(key);
    if (existing) {
      this.logger.debug(`Stampede prevented for key: ${key}`);
      return existing;
    }

    // We're the first — do the work
    const promise = factory()
      .then(async value => {
        await this.set(key, value, ttlSeconds);
        this.inflightRequests.delete(key);
        return value;
      })
      .catch(err => {
        this.inflightRequests.delete(key);
        throw err;
      });

    this.inflightRequests.set(key, promise);
    return promise;
  }
}