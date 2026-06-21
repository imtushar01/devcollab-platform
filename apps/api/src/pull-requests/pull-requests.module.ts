import { Module } from '@nestjs/common';
import { PullRequestsController } from './pull-requests.controller';
import { PullRequestsService } from './pull-requests.service';
import { PullRequestsRepository } from './pull-requests.repository';
import { RepositoriesModule } from '../repositories/repositories.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [RepositoriesModule, OrganizationsModule],
  controllers: [PullRequestsController],
  providers: [PullRequestsService, PullRequestsRepository],
})
export class PullRequestsModule {}