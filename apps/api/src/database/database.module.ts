import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import Redis from 'ioredis';

export const PG_POOL = 'PG_POOL';
export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () =>
        new Pool({
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          max: 10,
        }),
    },
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new Redis({
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
        }),
    },
  ],
  exports: [PG_POOL, REDIS_CLIENT],
})
export class DatabaseModule {}