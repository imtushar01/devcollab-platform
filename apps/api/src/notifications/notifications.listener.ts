import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsRepository } from './notifications.repository';
import {
  IssueCreatedEvent,
  IssueCommentedEvent,
  PrReviewSubmittedEvent,
} from '../events/platform.events';

@Injectable()
export class NotificationsListener {
  constructor(private readonly notificationsRepo: NotificationsRepository) {}

  @OnEvent('issue.created')
  async handleIssueCreated(event: IssueCreatedEvent) {
    if (!event.assigneeId) return;
    if (event.assigneeId === event.authorId) return; // don't notify yourself

    await this.notificationsRepo.create(event.assigneeId, 'issue_assigned', {
      issueId: event.issueId,
      title: event.title,
      assignedBy: event.authorId,
    });
  }

  @OnEvent('issue.commented')
  async handleIssueCommented(event: IssueCommentedEvent) {
    if (event.authorId === event.issueAuthorId) return; // don't notify yourself

    await this.notificationsRepo.create(event.issueAuthorId, 'issue_commented', {
      issueId: event.issueId,
      commentId: event.commentId,
      commentedBy: event.authorId,
    });
  }

  @OnEvent('pr.review.submitted')
  async handlePrReview(event: PrReviewSubmittedEvent) {
    if (event.reviewerId === event.prAuthorId) return;

    await this.notificationsRepo.create(event.prAuthorId, 'pr_review_submitted', {
      prId: event.prId,
      reviewStatus: event.reviewStatus,
      reviewedBy: event.reviewerId,
    });
  }
}