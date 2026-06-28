import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { SearchIndexWorker } from './workers/search-index.worker';
import { NotificationWorker } from './workers/notification.worker';
import { AnalyticsWorker } from './workers/analytics.worker';
import { SearchModule } from '../search/search.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [SearchModule, NotificationsModule],
  controllers: [QueueController],
  providers: [
    QueueService,
    SearchIndexWorker,
    NotificationWorker,
    AnalyticsWorker,
  ],
  exports: [QueueService],
})
export class QueueModule {}