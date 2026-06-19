import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import express from 'express';
import { RepositoriesService } from './repositories.service';
import { CreateRepoDto } from './dto/create-repo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('orgs/:orgHandle/repos')
export class RepositoriesController {
  constructor(private readonly reposService: RepositoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('orgHandle') orgHandle: string,
    @Body() dto: CreateRepoDto,
    @Req() req: express.Request,
  ) {
    return this.reposService.create(orgHandle, dto, (req.user as any).userId);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  listOrgRepos(@Param('orgHandle') orgHandle: string, @Req() req: express.Request) {
    return this.reposService.listOrgRepos(orgHandle, (req.user as any)?.userId);
  }

  @Get(':repoName')
  @UseGuards(OptionalJwtAuthGuard)
  getRepo(
    @Param('orgHandle') orgHandle: string,
    @Param('repoName') repoName: string,
    @Req() req: express.Request,
  ) {
    return this.reposService.getRepo(orgHandle, repoName, (req.user as any)?.userId);
  }
}