import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PullRequestsRepository } from './pull-requests.repository';
import { RepositoriesService } from '../repositories/repositories.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { assertMergeable, assertValidTransition, PrStatus } from './pr-state-machine';
import { CreatePrDto } from './dto/create-pr.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrReviewSubmittedEvent } from '../events/platform.events';

@Injectable()
export class PullRequestsService {
  constructor(
    private readonly prsRepo: PullRequestsRepository,
    private readonly reposService: RepositoriesService,
    private readonly orgsService: OrganizationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(orgHandle: string, repoName: string, dto: CreatePrDto, userId: string) {
    const repo = await this.reposService.getRepo(orgHandle, repoName, userId);
    await this.orgsService.assertMembership(repo.org_id, userId, 'member');

    return this.prsRepo.create(
      repo.id, userId, dto.title, dto.description,
      dto.sourceBranch, dto.targetBranch ?? 'main', dto.status ?? 'open',
    );
  }

  async getById(id: string) {
    const pr = await this.prsRepo.findById(id);
    if (!pr) throw new NotFoundException(`Pull request ${id} not found`);
    return pr;
  }

  async listByRepo(orgHandle: string, repoName: string, userId: string | undefined, status?: string) {
    const repo = await this.reposService.getRepo(orgHandle, repoName, userId);
    return this.prsRepo.findByRepo(repo.id, status);
  }

  async transition(prId: string, toStatus: PrStatus, userId: string) {
    const pr = await this.getById(prId);
    await this.orgsService.assertMembership(pr.org_id, userId, 'member');

    assertValidTransition(pr.status as PrStatus, toStatus);

    const extra: Record<string, any> = {};

    if (toStatus === 'merged') {
      const reviews = await this.prsRepo.getReviews(prId);
      assertMergeable(reviews, pr.status as PrStatus);
      extra['merged_at'] = new Date();
    }

    if (toStatus === 'closed') {
      extra['closed_at'] = new Date();
    }

    return this.prsRepo.updateStatus(prId, toStatus, extra);
  }

  async submitReview(prId: string, dto: SubmitReviewDto, userId: string) {
    const pr = await this.getById(prId);

    if (pr.author_id === userId) {
      throw new ForbiddenException('You cannot review your own pull request');
    }

    if (pr.status !== 'open') {
      throw new ForbiddenException('Reviews can only be submitted on open pull requests');
    }

    const review = await this.prsRepo.upsertReview(prId, userId, dto.status, dto.body);

    this.eventEmitter.emit(
      'pr.review.submitted',
      new PrReviewSubmittedEvent(prId, userId, pr.author_id, dto.status),
    );

    return review;
  }

  async addComment(prId: string, dto: CreateCommentDto, userId: string) {
    const pr = await this.getById(prId);
    if (pr.status === 'merged' || pr.status === 'closed') {
      throw new ForbiddenException('Cannot comment on merged or closed pull requests');
    }
    return this.prsRepo.addComment(prId, userId, dto.body, dto.filePath, dto.lineNumber);
  }

  async getReviews(prId: string) {
    await this.getById(prId);
    return this.prsRepo.getReviews(prId);
  }

  async getComments(prId: string) {
    await this.getById(prId);
    return this.prsRepo.getComments(prId);
  }
}