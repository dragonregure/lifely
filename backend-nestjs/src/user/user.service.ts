import { Injectable, NotFoundException } from '@nestjs/common';
import { RbacService } from '../rbac/rbac.service.js';
import {
  MemberResponseDto,
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

  async findUsersByTenant(tenantId: string): Promise<UserResponseDto[]> {
    return this.sortUsers(await this.userRepository.findByTenantId(tenantId));
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
    baseUrl = 'http://localhost/api/v1/members',
  ): Promise<MemberResponseDto[] | PaginatedMemberListEnvelopeDto> {
    const members = (await this.userRepository.findByTenantId(tenantId)).map(
      (member) => this.toMemberResponse(member),
    );

    if (!this.shouldPaginate(query)) {
      return this.sortMembers(members);
    }

    const filtered = this.filterMembers(members, this.single(query.search));
    const sorted = this.sortMembers(
      filtered,
      this.single(query.sort),
      this.single(query.direction),
    );
    const page = this.positiveInt(this.single(query.page), 1);
    const perPage = Math.min(
      this.positiveInt(this.single(query.per_page), 15),
      100,
    );
    const total = sorted.length;
    const pageCount = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;
    const data = sorted.slice(start, start + perPage);

    return {
      data,
      links: {
        first: this.pageUrl(baseUrl, query, 1),
        last: this.pageUrl(baseUrl, query, pageCount),
        prev: page > 1 ? this.pageUrl(baseUrl, query, page - 1) : null,
        next: page < pageCount ? this.pageUrl(baseUrl, query, page + 1) : null,
      },
      meta: {
        current_page: page,
        from: data.length > 0 ? start + 1 : null,
        last_page: pageCount,
        links: this.metaLinks(baseUrl, query, page, pageCount),
        path: baseUrl,
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
    members: MemberResponseDto[],
    search?: string,
  ): MemberResponseDto[] {
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
    members: MemberResponseDto[],
    sort?: string,
    direction?: string,
  ): MemberResponseDto[] {
    const sortableKeys = ['name', 'email', 'role', 'created_at'];
    const hasRequestedSort = sort !== undefined && sortableKeys.includes(sort);
    const key = hasRequestedSort ? sort : 'name';
    const normalizedDirection =
      direction?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const multiplier =
      hasRequestedSort && normalizedDirection === 'desc' ? -1 : 1;

    return [...members].sort((left, right) => {
      const leftValue = String(this.sortValue(left, key) ?? '').toLowerCase();
      const rightValue = String(this.sortValue(right, key) ?? '').toLowerCase();

      return leftValue.localeCompare(rightValue) * multiplier;
    });
  }

  private sortUsers(users: UserResponseDto[]): UserResponseDto[] {
    return [...users].sort((left, right) =>
      left.name.toLowerCase().localeCompare(right.name.toLowerCase()),
    );
  }

  private sortValue(member: MemberResponseDto | undefined, key: string) {
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

  private toMemberResponse(user: UserResponseDto): MemberResponseDto {
    return {
      id: user.id,
      tenant_id: user.tenant_id,
      role: user.role,
      roles: user.roles,
      direct_permissions: user.direct_permissions,
      name: user.name,
      email: user.email,
      ...(user.is_primary_owner === undefined
        ? {}
        : { is_primary_owner: user.is_primary_owner }),
      created_at: user.created_at,
    };
  }

  private pageUrl(baseUrl: string, query: MemberQuery, page: number): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (key === 'page' || value === undefined || value === '') {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, item);
        }

        continue;
      }

      params.set(key, value);
    }

    params.set('page', String(page));

    return `${baseUrl}?${params.toString()}`;
  }

  private metaLinks(
    baseUrl: string,
    query: MemberQuery,
    page: number,
    pageCount: number,
  ) {
    return [
      {
        url: page > 1 ? this.pageUrl(baseUrl, query, page - 1) : null,
        label: '&laquo; Previous',
        active: false,
      },
      ...Array.from({ length: pageCount }, (_, index) => {
        const linkPage = index + 1;

        return {
          url: this.pageUrl(baseUrl, query, linkPage),
          label: String(linkPage),
          active: linkPage === page,
        };
      }),
      {
        url: page < pageCount ? this.pageUrl(baseUrl, query, page + 1) : null,
        label: 'Next &raquo;',
        active: false,
      },
    ];
  }
}
