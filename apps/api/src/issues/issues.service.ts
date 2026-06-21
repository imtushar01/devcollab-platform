import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IssuesRepository } from './issues.repository';
import { RepositoriesService } from '../repositories/repositories.service';
import { OrganizationsService } from '../organizations/organizations.service';
import {
  IssueCommentedEvent,
  IssueCreatedEvent,
  IssueStatusChangedEvent,
} from '../events/platform.events';
import { CreateIssueDto } from './dto/create-issue.dto';
import { CreateIssueCommentDto } from './dto/create-issue-comment.dto';

@Injectable()
export class IssuesService {
  constructor(
    private readonly issuesRepo: IssuesRepository,
    private readonly reposService: RepositoriesService,
    private readonly orgsService: OrganizationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(orgHandle: string, repoName: string, dto: CreateIssueDto, userId: string) {
    const repo = await this.reposService.getRepo(orgHandle, repoName, userId);
    await this.orgsService.assertMembership(repo.org_id, userId, 'member');

    const issue = await this.issuesRepo.create(
      repo.id, userId, dto.title, dto.description, dto.assigneeId,
    );

    this.eventEmitter.emit(
      'issue.created',
      new IssueCreatedEvent(issue.id, repo.id, userId, dto.assigneeId ?? null, dto.title),
    );

    return issue;
  }

  async getById(id: string) {
    const issue = await this.issuesRepo.findById(id);
    if (!issue) throw new NotFoundException(`Issue ${id} not found`);
    return issue;
  }

  async listByRepo(orgHandle: string, repoName: string, userId: string | undefined, status?: string) {
    const repo = await this.reposService.getRepo(orgHandle, repoName, userId);
    return this.issuesRepo.findByRepo(repo.id, status);
  }

  async toggleStatus(issueId: string, userId: string) {
    const issue = await this.getById(issueId);
    await this.orgsService.assertMembership(issue.org_id, userId, 'member');

    const newStatus = issue.status === 'open' ? 'closed' : 'open';
    const updated = await this.issuesRepo.updateStatus(issueId, newStatus);

    this.eventEmitter.emit(
      'issue.status_changed',
      new IssueStatusChangedEvent(issueId, newStatus, userId),
    );

    return updated;
  }

  async addComment(issueId: string, dto: CreateIssueCommentDto, userId: string) {
    const issue = await this.getById(issueId);

    const comment = await this.issuesRepo.addComment(issueId, userId, dto.body);

    this.eventEmitter.emit(
      'issue.commented',
      new IssueCommentedEvent(issueId, comment.id, userId, issue.author_id, dto.body),
    );

    return comment;
  }

  async getComments(issueId: string) {
    await this.getById(issueId);
    return this.issuesRepo.getComments(issueId);
  }
}