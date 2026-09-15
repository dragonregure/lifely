import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityEvents } from '../activity/activity.events.js';
import { ContactResponseDto } from '../contact/contact.dto.js';
import { ContactService } from '../contact/contact.service.js';
import { MemberResponseDto } from '../user/user.dto.js';
import { UserService } from '../user/user.service.js';
import {
  ListingDocumentResponseDto,
  ListingResponseDto,
  PaginatedListingListEnvelopeDto,
  StoreListingDto,
  UpdateListingDto,
} from './listing.dto.js';
import {
  ListingCreateInput,
  ListingInclude,
  ListingQueryOptions,
  ListingRepository,
  ListingSortKey,
  ListingUpdateInput,
} from './listing.repository.js';
import { Listing, ListingDocument, ListingUserLink } from './listing.type.js';

type ListingQuery = Record<
  string,
  string | string[] | Record<string, unknown> | undefined
>;

const ALLOWED_INCLUDES: ListingInclude[] = ['documents', 'contacts', 'users'];

@Injectable()
export class ListingService {
  constructor(
    private readonly listingRepository: ListingRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly contactService: ContactService,
    private readonly userService: UserService,
  ) {}

  async findListings(
    tenantId: string,
    query: ListingQuery,
    baseUrl = 'http://localhost/api/v1/listings',
  ): Promise<PaginatedListingListEnvelopeDto> {
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
    const includes = this.includes(query);
    const options: ListingQueryOptions = {
      tenantId,
      search: this.single(query.search),
      status: this.filter(query, 'status'),
      propertyType: this.filter(query, 'property_type'),
      includes,
      sort: sort.key,
      direction,
      page,
      perPage,
    };
    const result = await this.listingRepository.find(options);
    const data = await Promise.all(
      result.data.map((listing) => this.toListingResponse(tenantId, listing)),
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

  async findListing(
    tenantId: string,
    listingId: string,
    query: ListingQuery = {},
  ): Promise<ListingResponseDto> {
    const listing = await this.listingRepository.findById(
      tenantId,
      listingId,
      this.includes(query),
    );

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return this.toListingResponse(tenantId, listing);
  }

  async findListingsByIds(
    tenantId: string,
    listingIds: string[],
  ): Promise<ListingResponseDto[]> {
    const listings = await this.listingRepository.findByIds(
      tenantId,
      listingIds,
    );
    const byId = new Map(listings.map((listing) => [listing.id, listing]));
    const orderedListings = listingIds
      .map((listingId) => byId.get(listingId))
      .filter((listing): listing is Listing => listing !== undefined);

    return Promise.all(
      orderedListings.map((listing) =>
        this.toListingResponse(tenantId, listing),
      ),
    );
  }

  async listingsBelongToTenant(
    tenantId: string,
    listingIds: string[],
  ): Promise<boolean> {
    const uniqueIds = [...new Set(listingIds)];

    return (
      uniqueIds.length === 0 ||
      (await this.listingRepository.findByIds(tenantId, uniqueIds)).length ===
        uniqueIds.length
    );
  }

  async markListingSold(tenantId: string, listingId: string): Promise<void> {
    const listing = await this.listingRepository.findById(tenantId, listingId);

    if (!listing || Number(listing.status) === 4) {
      return;
    }

    const updated = await this.listingRepository.update(tenantId, listingId, {
      status: 4,
    });

    if (updated) {
      await this.eventEmitter.emitAsync(ActivityEvents.LISTING_UPDATED, {
        before: listing,
        after: updated,
      });
    }
  }

  async createListing(
    tenantId: string,
    dto: StoreListingDto,
  ): Promise<ListingResponseDto> {
    await this.ensureTenantAssignments(tenantId, dto, false);

    const listing = await this.listingRepository.create(
      this.toCreateInput(tenantId, dto),
    );
    await this.eventEmitter.emitAsync(ActivityEvents.LISTING_CREATED, {
      listing,
    });

    return this.toListingResponse(tenantId, listing);
  }

  async updateListing(
    tenantId: string,
    listingId: string,
    dto: UpdateListingDto,
  ): Promise<ListingResponseDto> {
    await this.ensureTenantAssignments(tenantId, dto, true);

    const existing = await this.listingRepository.findById(tenantId, listingId);

    if (!existing) {
      throw new NotFoundException('Listing not found.');
    }

    const listing = await this.listingRepository.update(
      tenantId,
      listingId,
      this.toUpdateInput(dto),
    );

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    await this.eventEmitter.emitAsync(ActivityEvents.LISTING_UPDATED, {
      before: existing,
      after: listing,
    });

    return this.toListingResponse(tenantId, listing);
  }

  private async ensureTenantAssignments(
    tenantId: string,
    dto: StoreListingDto | UpdateListingDto,
    requireUserIdsWhenSettingPrimaryOwner: boolean,
  ): Promise<void> {
    const contactIds = dto.contact_ids ?? [];
    const userIds = dto.user_ids ?? [];
    const errors: Record<string, string[]> = {};

    if (
      contactIds.length > 0 &&
      !(await this.contactService.contactsBelongToTenant(tenantId, contactIds))
    ) {
      errors.contact_ids = ['The selected contact ids are invalid.'];
    }

    if (
      userIds.length > 0 &&
      !(await this.userService.usersBelongToTenant(tenantId, userIds))
    ) {
      errors.user_ids = ['The selected user ids are invalid.'];
    }

    if (!Object.prototype.hasOwnProperty.call(dto, 'primary_owner_user_id')) {
      this.throwValidationErrors(errors);
      return;
    }

    if (
      requireUserIdsWhenSettingPrimaryOwner &&
      !Object.prototype.hasOwnProperty.call(dto, 'user_ids')
    ) {
      errors.primary_owner_user_id = [
        'Provide user_ids when setting the primary owner.',
      ];
      this.throwValidationErrors(errors);
      return;
    }

    if (
      dto.primary_owner_user_id &&
      !(await this.userService.userBelongsToTenant(
        dto.primary_owner_user_id,
        tenantId,
      ))
    ) {
      errors.primary_owner_user_id = [
        'The selected primary owner user id is invalid.',
      ];
    }

    if (
      dto.primary_owner_user_id &&
      !userIds.includes(dto.primary_owner_user_id)
    ) {
      errors.primary_owner_user_id = [
        'The primary owner must be one of the assigned users.',
      ];
    }

    this.throwValidationErrors(errors);
  }

  private throwValidationErrors(errors: Record<string, string[]>): void {
    const keys = Object.keys(errors);

    if (keys.length === 0) {
      return;
    }

    throw new UnprocessableEntityException({
      message: errors[keys[0]][0],
      errors,
    });
  }

  private toCreateInput(
    tenantId: string,
    dto: StoreListingDto,
  ): ListingCreateInput {
    return {
      tenantId,
      title: dto.title,
      address: dto.address,
      price: dto.price,
      status: dto.status,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      propertyType: dto.property_type,
      contactIds: dto.contact_ids,
      userIds: dto.user_ids,
      primaryOwnerUserId: dto.primary_owner_user_id,
    };
  }

  private toUpdateInput(dto: UpdateListingDto): ListingUpdateInput {
    return {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.price !== undefined ? { price: dto.price } : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, 'status')
        ? { status: dto.status }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, 'bedrooms')
        ? { bedrooms: dto.bedrooms }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, 'bathrooms')
        ? { bathrooms: dto.bathrooms }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, 'property_type')
        ? { propertyType: dto.property_type }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, 'contact_ids')
        ? { contactIds: dto.contact_ids }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, 'user_ids')
        ? { userIds: dto.user_ids }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, 'primary_owner_user_id')
        ? { primaryOwnerUserId: dto.primary_owner_user_id }
        : {}),
    };
  }

  private async toListingResponse(
    tenantId: string,
    listing: Listing,
  ): Promise<ListingResponseDto> {
    return {
      id: listing.id,
      tenant_id: listing.tenantId,
      title: listing.title,
      address: listing.address,
      price: Number(listing.price),
      status: Number(listing.status),
      bedrooms: Number(listing.bedrooms),
      bathrooms: Number(listing.bathrooms),
      property_type: Number(listing.propertyType),
      ...(listing.documents !== undefined
        ? { documents: this.toDocumentResponses(listing.documents) }
        : {}),
      ...(listing.contactIds !== undefined
        ? {
            contacts: await this.contactResponses(tenantId, listing.contactIds),
          }
        : {}),
      ...(listing.userLinks !== undefined
        ? { users: await this.userResponses(tenantId, listing.userLinks) }
        : {}),
      created_at: this.isoValue(listing.createdAt) ?? listing.createdAt,
    };
  }

  private toDocumentResponses(
    documents: ListingDocument[],
  ): ListingDocumentResponseDto[] {
    return documents.map((document) => ({
      id: document.id,
      tenant_id: document.tenantId,
      model: document.model,
      model_id: document.modelId,
      type: document.type,
      subtype: document.subtype,
      file_name: document.fileName,
      order: document.order,
      url: document.url,
      created_at: this.isoValue(document.createdAt) ?? document.createdAt,
      updated_at: this.isoValue(document.updatedAt) ?? document.updatedAt,
    }));
  }

  private async contactResponses(
    tenantId: string,
    contactIds: string[],
  ): Promise<ContactResponseDto[]> {
    const contacts = await this.contactService.findContactsByIds(
      tenantId,
      contactIds,
    );

    return contacts.sort((left, right) =>
      `${left.first_name} ${left.last_name}`.localeCompare(
        `${right.first_name} ${right.last_name}`,
      ),
    );
  }

  private async userResponses(
    tenantId: string,
    links: ListingUserLink[],
  ): Promise<Array<MemberResponseDto & { is_primary_owner?: boolean | null }>> {
    const members = await this.userService.findMembersByIds(
      tenantId,
      links.map((link) => link.userId),
    );
    const primaryByUserId = new Map(
      links.map((link) => [link.userId, link.isPrimaryOwner]),
    );

    return members
      .map((member) => ({
        ...member,
        is_primary_owner: Boolean(primaryByUserId.get(member.id)),
      }))
      .sort((left, right) => {
        const primarySort =
          Number(Boolean(right.is_primary_owner)) -
          Number(Boolean(left.is_primary_owner));

        return primarySort !== 0
          ? primarySort
          : left.name.localeCompare(right.name);
      });
  }

  private includes(query: ListingQuery): ListingInclude[] {
    const requested = [
      ...this.values(query.include),
      ...this.values(query['include[]']),
    ];
    const includes: ListingInclude[] = [];

    for (const item of requested) {
      for (const relation of item.split(',')) {
        const include = relation.trim();

        if (
          ALLOWED_INCLUDES.includes(include as ListingInclude) &&
          !includes.includes(include as ListingInclude)
        ) {
          includes.push(include as ListingInclude);
        }
      }
    }

    return includes;
  }

  private filter(query: ListingQuery, key: string): string | undefined {
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
    key: ListingSortKey;
    requested: boolean;
  } {
    const sortableKeys: ListingSortKey[] = [
      'title',
      'address',
      'price',
      'status',
      'bedrooms',
      'bathrooms',
      'type',
      'property_type',
      'created_at',
    ];

    return value !== undefined && sortableKeys.includes(value as ListingSortKey)
      ? { key: value as ListingSortKey, requested: true }
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

  private values(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }

    return typeof value === 'string' ? [value] : [];
  }

  private isoValue(value: string | null): string | null {
    return value === null ? null : new Date(value).toISOString();
  }

  private pageUrl(baseUrl: string, query: ListingQuery, page: number): string {
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
    query: ListingQuery,
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
