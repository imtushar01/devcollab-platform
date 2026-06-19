import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import express from 'express';
import { OrganizationsService } from './organizations.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orgs')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateOrgDto, @Req() req: express.Request) {
    return this.orgsService.create(dto, (req.user as any).userId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyOrgs(@Req() req: express.Request) {
    return this.orgsService.getMyOrgs((req.user as any).userId);
  }

  @Get(':handle')
  getByHandle(@Param('handle') handle: string) {
    return this.orgsService.getByHandle(handle);
  }
}