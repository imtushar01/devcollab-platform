import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import express from 'express';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { CreateIssueCommentDto } from './dto/create-issue-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('orgs/:orgHandle/repos/:repoName/issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('orgHandle') orgHandle: string,
    @Param('repoName') repoName: string,
    @Body() dto: CreateIssueDto,
    @Req() req: express.Request,
  ) {
    return this.issuesService.create(orgHandle, repoName, dto, (req.user as any).userId);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  list(
    @Param('orgHandle') orgHandle: string,
    @Param('repoName') repoName: string,
    @Query('status') status: string,
    @Req() req: express.Request,
  ) {
    return this.issuesService.listByRepo(orgHandle, repoName, (req.user as any)?.userId, status);
  }

  @Get(':issueId')
  getById(@Param('issueId') issueId: string) {
    return this.issuesService.getById(issueId);
  }

  @Patch(':issueId/toggle')
  @UseGuards(JwtAuthGuard)
  toggleStatus(@Param('issueId') issueId: string, @Req() req: express.Request) {
    return this.issuesService.toggleStatus(issueId, (req.user as any).userId);
  }

  @Post(':issueId/comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @Param('issueId') issueId: string,
    @Body() dto: CreateIssueCommentDto,
    @Req() req: express.Request,
  ) {
    return this.issuesService.addComment(issueId, dto, (req.user as any).userId);
  }

  @Get(':issueId/comments')
  getComments(@Param('issueId') issueId: string) {
    return this.issuesService.getComments(issueId);
  }
}