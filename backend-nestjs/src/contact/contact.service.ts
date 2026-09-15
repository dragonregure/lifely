import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserRepository } from '../user/user.repository.js';
import {
  ContactCreateInput,
  ContactQueryOptions,
  ContactRepository,
  ContactSortKey,
  ContactUpdateInput,
  sourceLabel,
} from './contact.repository.js';
import {
  ContactResponseDto,
  PaginatedContactListEnvelopeDto,
  StoreContactDto,
  UpdateContactDto,
} from './contact.dto.js';
import { Contact } from './contact.type.js';

type ContactQuery = Record<
  string,
  string | string[] | Record<string, unknown> | undefined
>;

@Injectable()
export class ContactService {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async findContacts(
    tenantId: string,
    query: ContactQuery,
    baseUrl = 'http://localhost/api/v1/contacts',
  ): Promise<PaginatedContactListEnvelopeDto> {
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
    const options: ContactQueryOptions = {
      tenantId,
      search: this.single(query.search),
      status: this.filter(query, 'status'),
      source: this.filter(query, 'source'),
      ownerId: this.filter(query, 'owner_id'),
      sort: sort.key,
      direction,
      page,
      perPage,
    };
    const result = await this.contactRepository.find(options);
    const data = result.data.map((contact) => this.toContactResponse(contact));
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

  async findContact(
    tenantId: string,
    contactId: string,
  ): Promise<ContactResponseDto> {
    const contact = await this.contactRepository.findById(tenantId, contactId);

    if (!contact) {
      throw new NotFoundException('Contact not found.');
    }

    return this.toContactResponse(contact);
  }

  async createContact(
    tenantId: string,
    dto: StoreContactDto,
  ): Promise<ContactResponseDto> {
    await this.ensureTenantOwner(tenantId, dto.owner_id);

    return this.toContactResponse(
      await this.contactRepository.create(this.toCreateInput(tenantId, dto)),
    );
  }

  async updateContact(
    tenantId: string,
    contactId: string,
    dto: UpdateContactDto,
  ): Promise<ContactResponseDto> {
    await this.ensureTenantOwner(tenantId, dto.owner_id);

    const contact = await this.contactRepository.update(
      tenantId,
      contactId,
      this.toUpdateInput(dto),
    );

    if (!contact) {
      throw new NotFoundException('Contact not found.');
    }

    return this.toContactResponse(contact);
  }

  async deleteContact(tenantId: string, contactId: string): Promise<void> {
    if (!(await this.contactRepository.delete(tenantId, contactId))) {
      throw new NotFoundException('Contact not found.');
    }
  }

  private async ensureTenantOwner(
    tenantId: string,
    ownerId?: string | null,
  ): Promise<void> {
    if (!ownerId) {
      return;
    }

    const owner = await this.userRepository.findById(ownerId);

    if (!owner || owner.tenantId !== tenantId) {
      throw new UnprocessableEntityException({
        message: 'The selected owner id is invalid.',
        errors: {
          owner_id: ['The selected owner id is invalid.'],
        },
      });
    }
  }

  private toCreateInput(
    tenantId: string,
    dto: StoreContactDto,
  ): ContactCreateInput {
    return {
      tenantId,
      ownerId: dto.owner_id,
      firstName: dto.first_name,
      lastName: dto.last_name,
      email: dto.email,
      phone: dto.phone,
      status: dto.status,
      budget: dto.budget,
      source: dto.source,
      lastContactedAt: this.dateValue(dto.last_contacted_at),
    };
  }

  private toUpdateInput(dto: UpdateContactDto): ContactUpdateInput {
    return {
      ...(Object.prototype.hasOwnProperty.call(dto, 'owner_id')
        ? { ownerId: dto.owner_id }
        : {}),
      ...(dto.first_name !== undefined ? { firstName: dto.first_name } : {}),
      ...(dto.last_name !== undefined ? { lastName: dto.last_name } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, 'phone')
        ? { phone: dto.phone }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, 'budget')
        ? { budget: dto.budget }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, 'source')
        ? { source: dto.source }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, 'last_contacted_at')
        ? { lastContactedAt: this.dateValue(dto.last_contacted_at) }
        : {}),
    };
  }

  private toContactResponse(contact: Contact): ContactResponseDto {
    const sourceId =
      contact.source === null || Number.isNaN(Number(contact.source))
        ? null
        : Number(contact.source);

    return {
      id: contact.id,
      tenant_id: contact.tenantId,
      owner_id: contact.ownerId,
      first_name: contact.firstName,
      last_name: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      status: contact.status,
      status_label: contact.status ? 'Active' : 'Inactive',
      budget: contact.budget === null ? null : Number(contact.budget),
      source_id: sourceId,
      source: sourceLabel(sourceId),
      last_contacted_at: this.isoValue(contact.lastContactedAt),
      created_at: this.isoValue(contact.createdAt) ?? contact.createdAt,
    };
  }

  private filter(query: ContactQuery, key: string): string | undefined {
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

    const value =
      this.single(query[`filter[${key}]`]) ?? this.single(query[key]);

    return value !== undefined && value.trim() !== '' && value !== 'all'
      ? value.trim()
      : undefined;
  }

  private sortKey(value: string | undefined): {
    key: ContactSortKey;
    requested: boolean;
  } {
    const sortableKeys: ContactSortKey[] = [
      'contact',
      'first_name',
      'last_name',
      'email',
      'status',
      'owner',
      'budget',
      'source',
      'last-contacted',
      'created_at',
    ];

    return value !== undefined && sortableKeys.includes(value as ContactSortKey)
      ? { key: value as ContactSortKey, requested: true }
      : { key: 'created_at', requested: false };
  }

  private sortDirection(
    value: string | undefined,
    hasRequestedSort: boolean,
  ): 'asc' | 'desc' {
    const normalizedDirection = value?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    return hasRequestedSort ? normalizedDirection : 'desc';
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

  private dateValue(
    value: string | null | undefined,
  ): string | null | undefined {
    return value === undefined
      ? undefined
      : value === null
        ? null
        : new Date(value).toISOString();
  }

  private isoValue(value: string | null): string | null {
    return value === null ? null : new Date(value).toISOString();
  }

  private pageUrl(baseUrl: string, query: ContactQuery, page: number): string {
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
    query: ContactQuery,
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
