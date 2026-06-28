import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import { QUEUES, JOB_NAMES } from './queue.constants';

const redisConnection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000, // 1s, 2s, 4s
  },
  removeOnComplete: 100, // keep last 100 completed jobs for inspection
  removeOnFail: 500,     // keep last 500 failed jobs for debugging
};

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();

  onModuleInit() {
    // Initialize all queues on startup
    for (const queueName of Object.values(QUEUES)) {
      const queue = new Queue(queueName, {
        connection: redisConnection,
        defaultJobOptions,
      });
      this.queues.set(queueName, queue);
      this.logger.log(`Queue initialized: ${queueName}`);
    }
  }

  async onModuleDestroy() {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }

  private getQueue(name: string): Queue {
    const queue = this.queues.get(name);
    if (!queue) throw new Error(`Queue "${name}" not found`);
    return queue;
  }

  // Enqueue a search index job
  async enqueueSearchIndex(entityType: string, entityId: string, data: {
    title: string;
    body: string;
    metadata: Record<string, any>;
  }) {
    const queue = this.getQueue(QUEUES.SEARCH_INDEX);
    const job = await queue.add(
      JOB_NAMES.INDEX_REPOSITORY,
      { entityType, entityId, ...data },
      {
        jobId: `${entityType}-${entityId}`, // idempotency key — same entity = same job ID, prevents duplicate indexing
      },
    );
    this.logger.log(`Enqueued search index job ${job.id} for ${entityType}:${entityId}`);
    return job.id;
  }

  // Enqueue a notification job
  async enqueueNotification(userId: string, type: string, payload: Record<string, any>) {
    const queue = this.getQueue(QUEUES.NOTIFICATIONS);
    const job = await queue.add(
      JOB_NAMES.SEND_NOTIFICATION,
      { userId, type, payload },
    );
    this.logger.log(`Enqueued notification job ${job.id} for user ${userId}`);
    return job.id;
  }

  // Enqueue an analytics event
  async enqueueAnalyticsEvent(event: string, properties: Record<string, any>) {
    const queue = this.getQueue(QUEUES.ANALYTICS);
    await queue.add(JOB_NAMES.TRACK_EVENT, { event, properties, timestamp: new Date() });
  }

  // Get queue stats — useful for health checks and dashboards
  async getQueueStats(queueName: string) {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    return { queueName, waiting, active, completed, failed, delayed };
  }

  async getAllQueueStats() {
    return Promise.all(Object.values(QUEUES).map(q => this.getQueueStats(q)));
  }
}