import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import express from 'express';
import { PullRequestsService } from './pull-requests.service';
import { CreatePrDto } from './dto/create-pr.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import * as prStateMachine from './pr-state-machine';

@Controller('orgs/:orgHandle/repos/:repoName/pulls')
export class PullRequestsController {
  constructor(private readonly prsService: PullRequestsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('orgHandle') orgHandle: string,
    @Param('repoName') repoName: string,
    @Body() dto: CreatePrDto,
    @Req() req: express.Request,
  ) {
    return this.prsService.create(orgHandle, repoName, dto, (req.user as any).userId);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  list(
    @Param('orgHandle') orgHandle: string,
    @Param('repoName') repoName: string,
    @Query('status') status: string,
    @Req() req: express.Request,
  ) {
    return this.prsService.listByRepo(orgHandle, repoName, (req.user as any)?.userId, status);
  }

  @Get(':prId')
  getById(@Param('prId') prId: string) {
    return this.prsService.getById(prId);
  }

  @Patch(':prId/status')
  @UseGuards(JwtAuthGuard)
  transition(
    @Param('prId') prId: string,
    @Body('status') status: prStateMachine.PrStatus,
    @Req() req: express.Request,
  ) {
    return this.prsService.transition(prId, status, (req.user as any).userId);
  }

  @Post(':prId/reviews')
  @UseGuards(JwtAuthGuard)
  submitReview(
    @Param('prId') prId: string,
    @Body() dto: SubmitReviewDto,
    @Req() req: express.Request,
  ) {
    return this.prsService.submitReview(prId, dto, (req.user as any).userId);
  }

  @Get(':prId/reviews')
  getReviews(@Param('prId') prId: string) {
    return this.prsService.getReviews(prId);
  }

  @Post(':prId/comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @Param('prId') prId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: express.Request,
  ) {
    return this.prsService.addComment(prId, dto, (req.user as any).userId);
  }

  @Get(':prId/comments')
  getComments(@Param('prId') prId: string) {
    return this.prsService.getComments(prId);
  }
}