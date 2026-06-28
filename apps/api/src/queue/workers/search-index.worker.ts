import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { SearchService } from '../../search/search.service';
import { QUEUES, JOB_NAMES } from '../queue.constants';

@Injectable()
export class SearchIndexWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchIndexWorker.name);
  private worker: Worker;

  constructor(private readonly searchService: SearchService) {}

  onModuleInit() {
    this.worker = new Worker(
      QUEUES.SEARCH_INDEX,
      async (job: Job) => {
        this.logger.log(`Processing job ${job.id}: ${job.name}`);

        if (job.name === JOB_NAMES.INDEX_REPOSITORY) {
          await this.searchService.indexDocument(
            job.data.entityType,
            job.data.entityId,
            job.data.title,
            job.data.body,
            job.data.metadata,
          );
          this.logger.log(`Indexed ${job.data.entityType}:${job.data.entityId}`);
        }
      },
      {
        connection: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
        },
        concurrency: 3, // process up to 3 index jobs simultaneously
      },
    );

    this.worker.on('completed', job => {
      this.logger.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`, err.stack);
    });

    this.worker.on('error', err => {
      this.logger.error('Worker error:', err.message);
    });

    this.logger.log('SearchIndexWorker started');
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}