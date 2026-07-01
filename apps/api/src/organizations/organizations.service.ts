import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationsRepository } from './organizations.repository';
import { CreateOrgDto } from './dto/create-org.dto';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CachePatterns } from '../cache/cache-keys';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly orgsRepo: OrganizationsRepository,
    private readonly cacheService: CacheService,
  ) {}

  async create(dto: CreateOrgDto, userId: string) {
    try {
      const org = await this.orgsRepo.create(dto.handle, dto.displayName, dto.description, userId);
      // No need to populate cache on create — lazy loading handles it
      return org;
    } catch (err: any) {
      if (err.code === '23505') throw new ConflictException('Organization handle already taken');
      throw err;
    }
  }

  async getByHandle(handle: string) {
    return this.cacheService.getOrSet(
      CacheKeys.org(handle),
      async () => {
        const org = await this.orgsRepo.findByHandle(handle);
        if (!org) throw new NotFoundException(`Organization @${handle} not found`);
        return org;
      },
      300, // 5 minutes
    );
  }

  async getMyOrgs(userId: string) {
    return this.cacheService.getOrSet(
      CacheKeys.userOrgs(userId),
      () => this.orgsRepo.findUserOrgs(userId),
      120, // 2 minutes
    );
  }

  async assertMembership(orgId: string, userId: string, minimumRole: 'member' | 'admin' | 'owner' = 'member') {
    // Deliberately NOT cached — membership checks must always be fresh
    // A revoked membership that's still in cache = security bug
    const membership = await this.orgsRepo.getMembership(orgId, userId);
    if (!membership) throw new ForbiddenException('You are not a member of this organization');

    const roleHierarchy = { member: 0, admin: 1, owner: 2 };
    if (roleHierarchy[membership.role] < roleHierarchy[minimumRole]) {
      throw new ForbiddenException(`This action requires at least ${minimumRole} role`);
    }
    return membership;
  }
}