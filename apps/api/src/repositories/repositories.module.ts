import { Module } from '@nestjs/common';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { RepositoriesRepository } from './repositories.repository';
import { OrganizationsModule } from '../organizations/organizations.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [OrganizationsModule, SearchModule],
  controllers: [RepositoriesController],
  providers: [RepositoriesService, RepositoriesRepository],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}