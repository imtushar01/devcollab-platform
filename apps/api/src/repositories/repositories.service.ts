import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RepositoriesRepository } from './repositories.repository';
import { OrganizationsService } from '../organizations/organizations.service';
import { CreateRepoDto } from './dto/create-repo.dto';

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly reposRepo: RepositoriesRepository,
    private readonly orgsService: OrganizationsService,
  ) {}

  async create(orgHandle: string, dto: CreateRepoDto, userId: string) {
    const org = await this.orgsService.getByHandle(orgHandle);
    await this.orgsService.assertMembership(org.id, userId, 'member');

    try {
      return await this.reposRepo.create(org.id, dto.name, dto.description, dto.visibility ?? 'public');
    } catch (err: any) {
      if (err.code === '23505') throw new ConflictException(`Repository "${dto.name}" already exists in this organization`);
      throw err;
    }
  }

  async getRepo(orgHandle: string, repoName: string, userId?: string) {
    const repo = await this.reposRepo.findByOrgAndName(orgHandle, repoName);
    if (!repo) throw new NotFoundException(`Repository ${orgHandle}/${repoName} not found`);

    if (repo.visibility === 'private') {
      if (!userId) throw new ForbiddenException('Authentication required to view private repositories');
      await this.orgsService.assertMembership(repo.org_id, userId, 'member');
    }

    return repo;
  }

  async listOrgRepos(orgHandle: string, userId?: string) {
    const org = await this.orgsService.getByHandle(orgHandle);
    const repos = await this.reposRepo.findByOrg(org.id);

    if (!userId) return repos.filter(r => r.visibility === 'public');

    const membership = await this.orgsService['orgsRepo']
      .getMembership(org.id, userId)
      .catch(() => null);

    return membership ? repos : repos.filter(r => r.visibility === 'public');
  }
}