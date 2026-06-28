import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QueueService } from '../queue/queue.service';
import {
  IssueCreatedEvent,
  IssueCommentedEvent,
  PrReviewSubmittedEvent,
} from '../events/platform.events';

@Injectable()
export class NotificationsListener {
  constructor(private readonly queueService: QueueService) {}

  @OnEvent('issue.created')
  async handleIssueCreated(event: IssueCreatedEvent) {
    if (!event.assigneeId || event.assigneeId === event.authorId) return;
    await this.queueService.enqueueNotification(event.assigneeId, 'issue_assigned', {
      issueId: event.issueId,
      title: event.title,
      assignedBy: event.authorId,
    });
  }

  @OnEvent('issue.commented')
  async handleIssueCommented(event: IssueCommentedEvent) {
    if (event.authorId === event.issueAuthorId) return;
    await this.queueService.enqueueNotification(event.issueAuthorId, 'issue_commented', {
      issueId: event.issueId,
      commentId: event.commentId,
      commentedBy: event.authorId,
    });
  }

  @OnEvent('pr.review.submitted')
  async handlePrReview(event: PrReviewSubmittedEvent) {
    if (event.reviewerId === event.prAuthorId) return;
    await this.queueService.enqueueNotification(event.prAuthorId, 'pr_review_submitted', {
      prId: event.prId,
      reviewStatus: event.reviewStatus,
      reviewedBy: event.reviewerId,
    });
  }
}