import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { QUEUES, JOB_NAMES } from '../queue.constants';

@Injectable()
export class AnalyticsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsWorker.name);
  private worker: Worker;

  onModuleInit() {
    this.worker = new Worker(
      QUEUES.ANALYTICS,
      async (job: Job) => {
        if (job.name === JOB_NAMES.TRACK_EVENT) {
          // In production: send to data warehouse (BigQuery, Snowflake, etc.)
          // For now: log structured analytics event
          this.logger.log(`Analytics event: ${job.data.event}`, {
            properties: job.data.properties,
            timestamp: job.data.timestamp,
          });
        }
      },
      {
        connection: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
        },
        concurrency: 10, // analytics can be highly parallel
      },
    );

    this.logger.log('AnalyticsWorker started');
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}