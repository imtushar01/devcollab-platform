import { Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import express from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsRepository } from './notifications.repository';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsRepo: NotificationsRepository) {}

  @Get()
  getMyNotifications(
    @Req() req: express.Request,
    @Query('unread') unread: string,
  ) {
    const userId = (req.user as any).userId;
    return this.notificationsRepo.findForUser(userId, unread === 'true');
  }

  @Patch('read-all')
  markAllRead(@Req() req: express.Request) {
    return this.notificationsRepo.markAllRead((req.user as any).userId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: express.Request) {
    return this.notificationsRepo.markRead(id, (req.user as any).userId);
  }
}