import { Controller, Get, Param } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QUEUES } from './queue.constants';

@Controller('admin/queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  getAllStats() {
    return this.queueService.getAllQueueStats();
  }

  @Get(':name')
  getStats(@Param('name') name: string) {
    return this.queueService.getQueueStats(name);
  }
}