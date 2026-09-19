import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../rbac/rbac.types.js';
import { Permissions } from '../rbac/rbac.constants.js';
import type {
  PaginatedReferenceListEnvelopeDto,
  ReferenceOptionDto,
  ReferenceResponseDto,
  StoreReferenceDto,
  UpdateReferenceDto,
} from './reference.dto.js';
import {
  DuplicateReferenceError,
  ReferenceRepository,
  ReferenceTenantMismatchError,
} from './reference.repository.js';
import type {
  ReferenceQueryOptions,
  ReferenceSortKey,
} from './reference.repository.js';
import type { Reference, ReferenceValue } from './reference.type.js';

type ReferenceQuery = Record<
  string,
  string | string[] | Record<string, unknown> | undefined
>;

@Injectable()
export class ReferenceService {
  constructor(private readonly referenceRepository: ReferenceRepository) {}

  async findReferences(
    tenantId: string,
    query: ReferenceQuery,
    baseUrl = 'http://localhost/api/v1/references',
  ): Promise<PaginatedReferenceListEnvelopeDto> {
    const page = this.positiveInt(this.single(query.page), 1);
    const perPage = Math.min(
      this.positiveInt(this.single(query.per_page), 15),
      100,
    );
    const sort = this.sortKey(this.single(query.sort));
    const direction = this.sortDirection(
      this.single(query.direction),
      sort.requested,
    );
    const options: ReferenceQueryOptions = {
      tenantId,
      search: this.single(query.search),
      group: this.filter(query, 'group') ?? this.single(query.group),
      type: this.filter(query, 'type') ?? this.single(query.type),
      status: this.filter(query, 'status') ?? this.single(query.status),
      scope: this.filter(query, 'scope') ?? this.single(query.scope),
      sort: sort.key,
      direction,
      page,
      perPage,
    };
    const result = await this.referenceRepository.find(options);
    const data = result.data.map((reference) =>
      this.toReferenceResponse(reference),
    );
    const total = result.total;
    const pageCount = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;

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

  async referenceTypeOptions(tenantId: string): Promise<ReferenceOptionDto[]> {
    return this.referenceRepository.referenceTypeOptions(tenantId);
  }

  async groupOptions(tenantId: string): Promise<ReferenceOptionDto[]> {
    return this.referenceRepository.groupOptions(tenantId);
  }

  async findReference(
    tenantId: string,
    referenceId: string,
  ): Promise<ReferenceResponseDto> {
    const reference = await this.referenceRepository.findById(
      tenantId,
      referenceId,
    );

    if (!reference) {
      throw new NotFoundException('Reference not found.');
    }

    return this.toReferenceResponse(reference);
  }

  async createReference(
    tenantId: string,
    user: AuthenticatedUser,
    dto: StoreReferenceDto,
  ): Promise<ReferenceResponseDto> {
    if (this.requestsSystemScope(dto) && !this.canManageSystem(user)) {
      this.throwSystemScopeValidation('create');
    }

    try {
      return this.toReferenceResponse(
        await this.referenceRepository.create({
          currentTenantId: tenantId,
          tenantId: dto.tenant_id,
          group: dto.group,
          key: dto.key,
          value: dto.value,
          type: dto.type,
          meta: dto.meta,
          status: dto.status,
        }),
      );
    } catch (error) {
      this.rethrowKnownWriteError(error);
      throw error;
    }
  }

  async updateReference(
    tenantId: string,
    user: AuthenticatedUser,
    referenceId: string,
    dto: UpdateReferenceDto,
  ): Promise<ReferenceResponseDto> {
    const existing = await this.referenceRepository.findById(
      tenantId,
      referenceId,
    );

    if (!existing) {
      throw new NotFoundException('Reference not found.');
    }

    if (!this.canUpdateReference(user, existing, dto)) {
      throw new ForbiddenException();
    }

    try {
      const updated = await this.referenceRepository.update(
        tenantId,
        referenceId,
        {
          tenantId: dto.tenant_id,
          group: dto.group,
          key: dto.key,
          value: dto.value,
          type: dto.type,
          meta: dto.meta,
          status: dto.status,
        },
      );

      if (!updated) {
        throw new NotFoundException('Reference not found.');
      }

      return this.toReferenceResponse(updated);
    } catch (error) {
      this.rethrowKnownWriteError(error);
      throw error;
    }
  }

  async deleteReference(
    tenantId: string,
    user: AuthenticatedUser,
    referenceId: string,
  ): Promise<void> {
    const existing = await this.referenceRepository.findById(
      tenantId,
      referenceId,
    );

    if (!existing) {
      throw new NotFoundException('Reference not found.');
    }

    if (!this.canDeleteReference(user, existing)) {
      throw new ForbiddenException();
    }

    if (!(await this.referenceRepository.delete(tenantId, referenceId))) {
      throw new NotFoundException('Reference not found.');
    }
  }

  private toReferenceResponse(reference: Reference): ReferenceResponseDto {
    return {
      id: reference.id,
      tenant_id: reference.tenantId,
      is_system: reference.tenantId === null,
      group: reference.group,
      key: reference.referenceKey,
      value: this.castValue(reference.value, reference.type),
      type: reference.type,
      meta: reference.meta,
      status: reference.status,
      created_at: new Date(reference.createdAt).toISOString(),
      updated_at: new Date(reference.updatedAt).toISOString(),
    };
  }

  private castValue(value: string | null, type: string): ReferenceValue {
    if (value === null || type === 'null') {
      return null;
    }

    if (type === 'int' || type === 'integer') {
      return Number.parseInt(value, 10);
    }

    if (type === 'float' || type === 'double') {
      return Number.parseFloat(value);
    }

    if (type === 'bool' || type === 'boolean') {
      const normalized = value.trim().toLowerCase();

      if (['1', 'true', 'on', 'yes'].includes(normalized)) {
        return true;
      }

      if (['0', 'false', 'off', 'no'].includes(normalized)) {
        return false;
      }

      return Boolean(value);
    }

    if (type === 'array') {
      const decoded: unknown = this.parseJson(value, []);

      return Array.isArray(decoded) ? (decoded as unknown[]) : [];
    }

    if (type === 'object') {
      const decoded: unknown = this.parseJson(value, {});

      return decoded !== null &&
        typeof decoded === 'object' &&
        !Array.isArray(decoded)
        ? (decoded as Record<string, unknown>)
        : {};
    }

    return value;
  }

  private parseJson(value: string, fallback: unknown): unknown {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return fallback;
    }
  }

  private rethrowKnownWriteError(error: unknown): void {
    if (error instanceof DuplicateReferenceError) {
      throw new UnprocessableEntityException({
        message: 'The given data was invalid.',
        errors: {
          group: [
            'The group and key pair already exists for this reference scope.',
          ],
          key: [
            'The group and key pair already exists for this reference scope.',
          ],
        },
      });
    }

    if (error instanceof ReferenceTenantMismatchError) {
      throw new ForbiddenException(
        'Reference tenant does not match the current tenant context.',
      );
    }
  }

  private throwSystemScopeValidation(action: 'create' | 'update'): never {
    throw new UnprocessableEntityException({
      message: 'The given data was invalid.',
      errors: {
        tenant_id: [`Only System Admin can ${action} system references.`],
      },
    });
  }

  private requestsSystemScope(dto: { tenant_id?: string | null }): boolean {
    const hasTenantId =
      Object.prototype.hasOwnProperty.call(dto, 'tenant_id') === true;
    const tenantId = dto.tenant_id;

    return hasTenantId && tenantId === null;
  }

  private canManageSystem(user: AuthenticatedUser): boolean {
    return this.can(user, Permissions.REFERENCES_MANAGE_SYSTEM);
  }

  private canUpdateReference(
    user: AuthenticatedUser,
    reference: Reference,
    dto: UpdateReferenceDto,
  ): boolean {
    if (reference.tenantId === null) {
      return this.canManageSystem(user);
    }

    if (!this.can(user, Permissions.REFERENCES_UPDATE)) {
      return false;
    }

    return !this.requestsSystemScope(dto) || this.canManageSystem(user);
  }

  private canDeleteReference(
    user: AuthenticatedUser,
    reference: Reference,
  ): boolean {
    return reference.tenantId === null
      ? this.canManageSystem(user)
      : this.can(user, Permissions.REFERENCES_DELETE);
  }

  private can(user: AuthenticatedUser, permission: string): boolean {
    return (
      user.permissions.includes(Permissions.SYSTEM_BYPASS) ||
      user.permissions.includes(permission)
    );
  }

  private filter(query: ReferenceQuery, key: string): string | undefined {
    const nestedFilter = query.filter as unknown;

    if (
      nestedFilter &&
      typeof nestedFilter === 'object' &&
      !Array.isArray(nestedFilter)
    ) {
      const value = (nestedFilter as Record<string, unknown>)[key];

      if (typeof value === 'string' && value.trim() !== '' && value !== 'all') {
        return value.trim();
      }
    }

    const value = this.single(query[`filter[${key}]`]);

    return value !== undefined && value.trim() !== '' && value !== 'all'
      ? value.trim()
      : undefined;
  }

  private sortKey(value: string | undefined): {
    key: ReferenceSortKey;
    requested: boolean;
  } {
    const sortableKeys: ReferenceSortKey[] = [
      'reference',
      'key',
      'group',
      'value',
      'type',
      'status',
      'updated',
      'updated_at',
      'created_at',
    ];

    return value !== undefined &&
      sortableKeys.includes(value as ReferenceSortKey)
      ? { key: value as ReferenceSortKey, requested: true }
      : { key: 'group', requested: false };
  }

  private sortDirection(
    value: string | undefined,
    hasRequestedSort: boolean,
  ): 'asc' | 'desc' {
    const normalizedDirection =
      value?.toLowerCase() === 'desc' ? 'desc' : 'asc';

    return hasRequestedSort ? normalizedDirection : 'asc';
  }

  private positiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private single(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      return this.single(value[0]);
    }

    return typeof value === 'string' ? value : undefined;
  }

  private pageUrl(
    baseUrl: string,
    query: ReferenceQuery,
    page: number,
  ): string {
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

      if (typeof value === 'object') {
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (typeof nestedValue === 'string' && nestedValue !== '') {
            params.set(`${key}[${nestedKey}]`, nestedValue);
          }
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
    query: ReferenceQuery,
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
