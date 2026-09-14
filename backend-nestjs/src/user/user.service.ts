import { Injectable, NotFoundException } from '@nestjs/common';
import { RbacService } from '../rbac/rbac.service.js';
import {
  PaginatedMemberListEnvelopeDto,
  TenantResponseDto,
  UserAccessDto,
  UserResponseDto,
} from './user.dto.js';
import { UserRepository } from './user.repository.js';

type MemberQuery = Record<string, string | string[] | undefined>;

const PAGINATION_TRIGGER_KEYS = [
  'page',
  'per_page',
  'search',
  'sort',
  'direction',
] as const;

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rbacService: RbacService,
  ) {}

  findAll(): Promise<UserResponseDto[]> {
    return this.userRepository.findAll();
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async findTenant(tenantId: string): Promise<TenantResponseDto> {
    const tenant = await this.userRepository.findTenantById(tenantId);

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    return {
      id: tenant.id,
      name: tenant.name,
      created_at: tenant.createdAt,
    };
  }

  async findMembers(
    tenantId: string,
    query: MemberQuery,
  ): Promise<UserResponseDto[] | PaginatedMemberListEnvelopeDto> {
    const members = await this.userRepository.findByTenantId(tenantId);

    if (!this.shouldPaginate(query)) {
      return members;
    }

    const filtered = this.filterMembers(members, this.single(query.search));
    const sorted = this.sortMembers(
      filtered,
      this.single(query.sort),
      this.single(query.direction),
    );
    const page = this.positiveInt(this.single(query.page), 1);
    const perPage = this.positiveInt(this.single(query.per_page), 15);
    const total = sorted.length;
    const pageCount = Math.max(1, Math.ceil(total / perPage));
    const currentPage = Math.min(page, pageCount);
    const start = (currentPage - 1) * perPage;
    const data = sorted.slice(start, start + perPage);

    return {
      data,
      meta: {
        current_page: currentPage,
        from: data.length > 0 ? start + 1 : null,
        last_page: pageCount,
        per_page: perPage,
        to: data.length > 0 ? start + data.length : null,
        total,
      },
    };
  }

  async findUserAccess(userId: string): Promise<UserAccessDto> {
    const access = await this.rbacService.getUserAccess(userId);

    return {
      user_id: userId,
      roles: access.roles,
      direct_permissions: access.directPermissions,
      permissions: this.rbacService.permissionNames(access),
    };
  }

  private shouldPaginate(query: MemberQuery): boolean {
    return PAGINATION_TRIGGER_KEYS.some(
      (key) => query[key] !== undefined && query[key] !== '',
    );
  }

  private filterMembers(
    members: UserResponseDto[],
    search?: string,
  ): UserResponseDto[] {
    const needle = search?.trim().toLowerCase();

    if (!needle) {
      return members;
    }

    return members.filter((member) =>
      [member.name, member.email, member.role]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }

  private sortMembers(
    members: UserResponseDto[],
    sort?: string,
    direction?: string,
  ): UserResponseDto[] {
    const key =
      sort && this.sortValue(members[0], sort) !== undefined ? sort : 'name';
    const multiplier = direction === 'desc' ? -1 : 1;

    return [...members].sort((left, right) => {
      const leftValue = String(this.sortValue(left, key) ?? '').toLowerCase();
      const rightValue = String(this.sortValue(right, key) ?? '').toLowerCase();

      return leftValue.localeCompare(rightValue) * multiplier;
    });
  }

  private sortValue(member: UserResponseDto | undefined, key: string) {
    if (!member) {
      return undefined;
    }

    const sortable: Record<string, string> = {
      name: member.name,
      email: member.email,
      role: member.role,
      created_at: member.created_at,
    };

    return sortable[key];
  }

  private positiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private single(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }
}
