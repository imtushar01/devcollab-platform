import { Module } from '@nestjs/common';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { RepositoriesRepository } from './repositories.repository';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OrganizationsModule],
  controllers: [RepositoriesController],
  providers: [RepositoriesService, RepositoriesRepository],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}