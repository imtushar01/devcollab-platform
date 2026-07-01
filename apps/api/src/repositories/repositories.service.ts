import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RepositoriesRepository } from './repositories.repository';
import { OrganizationsService } from '../organizations/organizations.service';
import { CreateRepoDto } from './dto/create-repo.dto';
import { QueueService } from '../queue/queue.service';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CachePatterns } from '../cache/cache-keys';

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly reposRepo: RepositoriesRepository,
    private readonly orgsService: OrganizationsService,
    private readonly queueService: QueueService,
    private readonly cacheService: CacheService,
  ) {}

  async create(orgHandle: string, dto: CreateRepoDto, userId: string) {
    const org = await this.orgsService.getByHandle(orgHandle);
    await this.orgsService.assertMembership(org.id, userId, 'member');

    try {
      const repo = await this.reposRepo.create(org.id, dto.name, dto.description, dto.visibility ?? 'public');

      // Invalidate org repos cache — list is now stale 
      await this.cacheService.delete(CacheKeys.orgRepos(orgHandle));

      this.queueService.enqueueSearchIndex('repository', repo.id, {
        title: repo.name,
        body: `${dto.description ?? ''} ${orgHandle}`,
        metadata: { orgHandle, repoName: repo.name, visibility: dto.visibility ?? 'public' },
      }).catch(err => console.error('Failed to enqueue search index job:', err));

      return repo;
    } catch (err: any) {
      if (err.code === '23505') throw new ConflictException(`Repository "${dto.name}" already exists in this organization`);
      throw err;
    }
  }

  async getRepo(orgHandle: string, repoName: string, userId?: string) {
    const repo = await this.cacheService.getOrSet(
      CacheKeys.repo(orgHandle, repoName),
      async () => {
        const r = await this.reposRepo.findByOrgAndName(orgHandle, repoName);
        if (!r) throw new NotFoundException(`Repository ${orgHandle}/${repoName} not found`);
        return r;
      },
      300,
    );
    
    if (repo.visibility === 'private') {
      if (!userId) throw new ForbiddenException('Authentication required to view private repositories');
      await this.orgsService.assertMembership(repo.org_id, userId, 'member');
    }

    return repo;
  }

  async listOrgRepos(orgHandle: string, userId?: string) {
    const org = await this.orgsService.getByHandle(orgHandle);
    const repos = await this.cacheService.getOrSet(
      CacheKeys.orgRepos(orgHandle),
      () => this.reposRepo.findByOrg(org.id),
      120,
    );

    if (!userId) return repos.filter(r => r.visibility === 'public');

    const membership = await this.orgsService['orgsRepo']
      .getMembership(org.id, userId)
      .catch(() => null);

    return membership ? repos : repos.filter(r => r.visibility === 'public');
  }
}