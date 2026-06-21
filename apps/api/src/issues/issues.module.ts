import { Module } from '@nestjs/common';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';
import { IssuesRepository } from './issues.repository';
import { RepositoriesModule } from '../repositories/repositories.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [RepositoriesModule, OrganizationsModule],
  controllers: [IssuesController],
  providers: [IssuesService, IssuesRepository],
})
export class IssuesModule {}