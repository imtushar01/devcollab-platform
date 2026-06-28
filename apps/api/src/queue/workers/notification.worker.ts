import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { NotificationsRepository } from '../../notifications/notifications.repository';
import { QUEUES, JOB_NAMES } from '../queue.constants';

@Injectable()
export class NotificationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationWorker.name);
  private worker: Worker;

  constructor(private readonly notificationsRepo: NotificationsRepository) {}

  onModuleInit() {
    this.worker = new Worker(
      QUEUES.NOTIFICATIONS,
      async (job: Job) => {
        if (job.name === JOB_NAMES.SEND_NOTIFICATION) {
          await this.notificationsRepo.create(
            job.data.userId,
            job.data.type,
            job.data.payload,
          );
          this.logger.log(`Notification delivered to user ${job.data.userId}`);
        }
      },
      {
        connection: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
        },
        concurrency: 5,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Notification job ${job?.id} failed after all retries: ${err.message}`);
      // In production: send to dead letter queue, alert on-call engineer
    });

    this.logger.log('NotificationWorker started');
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}