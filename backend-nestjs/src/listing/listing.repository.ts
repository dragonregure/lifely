import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import {
  Document as DocumentModel,
  Listing as ListingModel,
  ListingContact as ListingContactModel,
  ListingUser as ListingUserModel,
} from '../prisma/prisma.service.js';
import { Listing, ListingDocument, ListingUserLink } from './listing.type.js';

export type ListingInclude = 'documents' | 'contacts' | 'users';

export type ListingSortKey =
  | 'title'
  | 'address'
  | 'price'
  | 'status'
  | 'bedrooms'
  | 'bathrooms'
  | 'type'
  | 'property_type'
  | 'created_at';

export type ListingQueryOptions = {
  tenantId: string;
  search?: string;
  status?: string;
  propertyType?: string;
  includes: ListingInclude[];
  sort: ListingSortKey;
  direction: 'asc' | 'desc';
  page: number;
  perPage: number;
};

export type ListingQueryResult = {
  data: Listing[];
  total: number;
};

export type ListingCreateInput = {
  tenantId: string;
  title: string;
  address: string;
  price: number;
  status?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  propertyType?: number | null;
  contactIds?: string[] | null;
  userIds?: string[] | null;
  primaryOwnerUserId?: string | null;
};

export type ListingUpdateInput = Partial<Omit<ListingCreateInput, 'tenantId'>>;

@Injectable()
export class ListingRepository {
  async find(options: ListingQueryOptions): Promise<ListingQueryResult> {
    const listings = await ListingModel.where({
      tenantId: options.tenantId,
    }).all();
    const filtered = this.filterListings(listings, options);
    const sorted = this.sortListings(filtered, options.sort, options.direction);
    const start = (options.page - 1) * options.perPage;
    const data = sorted.slice(start, start + options.perPage);

    return {
      data: await this.hydrateIncludes(
        options.tenantId,
        data,
        options.includes,
      ),
      total: sorted.length,
    };
  }

  async findById(
    tenantId: string,
    id: string,
    includes: ListingInclude[] = [],
  ): Promise<Listing | null> {
    const listing = await ListingModel.where({ tenantId, id }).first();

    if (!listing) {
      return null;
    }

    const [hydrated] = await this.hydrateIncludes(
      tenantId,
      [listing],
      includes,
    );

    return hydrated;
  }

  async findByIds(tenantId: string, ids: string[]): Promise<Listing[]> {
    if (ids.length === 0) {
      return [];
    }

    const listings = await ListingModel.where({ tenantId }).all();
    const idSet = new Set(ids);

    return listings.filter((listing) => idSet.has(listing.id));
  }

  async create(data: ListingCreateInput): Promise<Listing> {
    const listing = await db.transaction(async (tx) => {
      const created = await tx.orm.public.Listing.create({
        tenantId: data.tenantId,
        title: data.title,
        address: data.address,
        price: String(data.price),
        status: data.status ?? 1,
        bedrooms: data.bedrooms ?? 0,
        bathrooms: data.bathrooms ?? 0,
        propertyType: data.propertyType ?? 1,
      });

      await this.syncContacts(
        tx.orm.public.ListingContact,
        created.id,
        data.contactIds ?? [],
      );
      await this.syncUsers(
        tx.orm.public.ListingUser,
        created.id,
        data.userIds ?? [],
        data.primaryOwnerUserId ?? null,
      );

      return created;
    });

    return listing;
  }

  async update(
    tenantId: string,
    id: string,
    data: ListingUpdateInput,
  ): Promise<Listing | null> {
    const listing = await this.findById(tenantId, id);

    if (!listing) {
      return null;
    }

    await db.transaction(async (tx) => {
      await tx.orm.public.Listing.where({ tenantId, id }).update({
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.price !== undefined ? { price: String(data.price) } : {}),
        ...(data.status !== undefined ? { status: data.status ?? 1 } : {}),
        ...(data.bedrooms !== undefined
          ? { bedrooms: data.bedrooms ?? 0 }
          : {}),
        ...(data.bathrooms !== undefined
          ? { bathrooms: data.bathrooms ?? 0 }
          : {}),
        ...(data.propertyType !== undefined
          ? { propertyType: data.propertyType ?? 1 }
          : {}),
        updatedAt: new Date().toISOString(),
      });

      if (data.contactIds !== undefined) {
        await this.syncContacts(
          tx.orm.public.ListingContact,
          id,
          data.contactIds ?? [],
        );
      }

      if (data.userIds !== undefined) {
        await this.syncUsers(
          tx.orm.public.ListingUser,
          id,
          data.userIds ?? [],
          data.primaryOwnerUserId ?? null,
        );
      }
    });

    return this.findById(tenantId, id);
  }

  private async syncContacts(
    model: typeof ListingContactModel,
    listingId: string,
    contactIds: string[],
  ): Promise<void> {
    await model.where({ listingId }).delete();

    for (const contactId of contactIds) {
      await model.create({ listingId, contactId });
    }
  }

  private async syncUsers(
    model: typeof ListingUserModel,
    listingId: string,
    userIds: string[],
    primaryOwnerUserId: string | null,
  ): Promise<void> {
    await model.where({ listingId }).delete();

    for (const userId of userIds) {
      await model.create({
        listingId,
        userId,
        isPrimaryOwner: userId === primaryOwnerUserId ? true : null,
      });
    }
  }

  private async hydrateIncludes(
    tenantId: string,
    listings: Listing[],
    includes: ListingInclude[],
  ): Promise<Listing[]> {
    if (listings.length === 0 || includes.length === 0) {
      return listings;
    }

    const listingIds = new Set(listings.map((listing) => listing.id));
    const documentsByListingId = includes.includes('documents')
      ? await this.documentsByListingId(tenantId, listingIds)
      : new Map<string, ListingDocument[]>();
    const contactsByListingId = includes.includes('contacts')
      ? await this.contactIdsByListingId(listingIds)
      : new Map<string, string[]>();
    const usersByListingId = includes.includes('users')
      ? await this.userLinksByListingId(listingIds)
      : new Map<string, ListingUserLink[]>();

    return listings.map((listing) => ({
      ...listing,
      ...(includes.includes('documents')
        ? { documents: documentsByListingId.get(listing.id) ?? [] }
        : {}),
      ...(includes.includes('contacts')
        ? { contactIds: contactsByListingId.get(listing.id) ?? [] }
        : {}),
      ...(includes.includes('users')
        ? { userLinks: usersByListingId.get(listing.id) ?? [] }
        : {}),
    }));
  }

  private async documentsByListingId(
    tenantId: string,
    listingIds: Set<string>,
  ): Promise<Map<string, ListingDocument[]>> {
    const documents = await DocumentModel.where({
      tenantId,
      model: 'listing',
    }).all();
    const grouped = new Map<string, ListingDocument[]>();

    for (const document of documents) {
      if (!listingIds.has(document.modelId)) {
        continue;
      }

      const items = grouped.get(document.modelId) ?? [];
      items.push({
        id: document.id,
        tenantId: document.tenantId,
        model: document.model,
        modelId: document.modelId,
        type: document.type,
        subtype: document.subtype,
        fileName: document.fileName,
        order: document.order,
        url: document.url,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      });
      grouped.set(document.modelId, items);
    }

    for (const items of grouped.values()) {
      items.sort((left, right) => left.order - right.order);
    }

    return grouped;
  }

  private async contactIdsByListingId(
    listingIds: Set<string>,
  ): Promise<Map<string, string[]>> {
    const links = await ListingContactModel.all();
    const grouped = new Map<string, string[]>();

    for (const link of links) {
      if (!listingIds.has(link.listingId)) {
        continue;
      }

      const items = grouped.get(link.listingId) ?? [];
      items.push(link.contactId);
      grouped.set(link.listingId, items);
    }

    return grouped;
  }

  private async userLinksByListingId(
    listingIds: Set<string>,
  ): Promise<Map<string, ListingUserLink[]>> {
    const links = await ListingUserModel.all();
    const grouped = new Map<string, ListingUserLink[]>();

    for (const link of links) {
      if (!listingIds.has(link.listingId)) {
        continue;
      }

      const items = grouped.get(link.listingId) ?? [];
      items.push({
        userId: link.userId,
        isPrimaryOwner: link.isPrimaryOwner,
      });
      grouped.set(link.listingId, items);
    }

    return grouped;
  }

  private filterListings(
    listings: Listing[],
    options: ListingQueryOptions,
  ): Listing[] {
    const needle = options.search?.trim().toLowerCase();
    const status = this.numericFilter(options.status);
    const propertyType = this.numericFilter(options.propertyType);

    return listings.filter((listing) => {
      const matchesSearch =
        !needle ||
        [listing.title, listing.address, listing.status, listing.propertyType]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesStatus = status === null || listing.status === status;
      const matchesPropertyType =
        propertyType === null || listing.propertyType === propertyType;

      return matchesSearch && matchesStatus && matchesPropertyType;
    });
  }

  private sortListings(
    listings: Listing[],
    sort: ListingSortKey,
    direction: 'asc' | 'desc',
  ): Listing[] {
    const multiplier = direction === 'desc' ? -1 : 1;

    return [...listings].sort((left, right) => {
      const leftValue = this.sortValue(left, sort);
      const rightValue = this.sortValue(right, sort);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * multiplier;
      }

      return (
        String(leftValue ?? '')
          .toLowerCase()
          .localeCompare(String(rightValue ?? '').toLowerCase()) * multiplier
      );
    });
  }

  private sortValue(listing: Listing, key: ListingSortKey): string | number {
    const sortable: Record<ListingSortKey, string | number> = {
      title: listing.title,
      address: listing.address,
      price: Number(listing.price),
      status: listing.status,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      type: listing.propertyType,
      property_type: listing.propertyType,
      created_at: listing.createdAt,
    };

    return sortable[key];
  }

  private numericFilter(value?: string): number | null {
    const normalized = value?.trim();

    if (!normalized) {
      return null;
    }

    const parsed = Number.parseInt(normalized, 10);

    return Number.isFinite(parsed) ? parsed : null;
  }
}
