import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationsRepository } from './organizations.repository';
import { CreateOrgDto } from './dto/create-org.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly orgsRepo: OrganizationsRepository) {}

  async create(dto: CreateOrgDto, userId: string) {
    try {
      return await this.orgsRepo.create(dto.handle, dto.displayName, dto.description, userId);
    } catch (err: any) {
      if (err.code === '23505') throw new ConflictException('Organization handle already taken');
      throw err;
    }
  }

  async getByHandle(handle: string) {
    const org = await this.orgsRepo.findByHandle(handle);
    if (!org) throw new NotFoundException(`Organization @${handle} not found`);
    return org;
  }

  async getMyOrgs(userId: string) {
    return this.orgsRepo.findUserOrgs(userId);
  }

  async assertMembership(orgId: string, userId: string, minimumRole: 'member' | 'admin' | 'owner' = 'member') {
    const membership = await this.orgsRepo.getMembership(orgId, userId);
    if (!membership) throw new ForbiddenException('You are not a member of this organization');

    const roleHierarchy = { member: 0, admin: 1, owner: 2 };
    if (roleHierarchy[membership.role] < roleHierarchy[minimumRole]) {
      throw new ForbiddenException(`This action requires at least ${minimumRole} role`);
    }
    return membership;
  }
}