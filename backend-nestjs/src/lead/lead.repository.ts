import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import {
  Contact as ContactModel,
  Lead as LeadModel,
  Listing as ListingModel,
  User as UserModel,
} from '../prisma/prisma.service.js';
import { Contact } from '../contact/contact.type.js';
import { Listing } from '../listing/listing.type.js';
import { User } from '../user/user.type.js';
import {
  leadSourceFromInput,
  leadSourceLabel,
  leadSourceValues,
  leadStageFromInput,
  leadStageLabel,
  leadStageValues,
  LeadSources,
  LeadStages,
} from './lead.constants.js';
import { Lead } from './lead.type.js';

export type LeadSortKey =
  'stage' | 'source' | 'value' | 'next_task' | 'due_at' | 'created_at';

export type LeadQueryOptions = {
  tenantId: string;
  search?: string;
  stage?: string;
  source?: string;
  userId?: string;
  contactId?: string;
  listingId?: string;
  isActive?: string;
  sort: LeadSortKey;
  direction: 'asc' | 'desc';
  page: number;
  perPage: number;
};

export type LeadQueryResult = {
  data: Lead[];
  total: number;
};

export type LeadCreateInput = {
  tenantId: string;
  contactId: string;
  listingId: string;
  userId: string;
  stage?: number | null;
  source?: number | null;
  isActive?: boolean;
  nextTask?: string | null;
  dueAt?: string | null;
};

export type LeadUpdateInput = Partial<Omit<LeadCreateInput, 'tenantId'>>;

@Injectable()
export class LeadRepository {
  async find(options: LeadQueryOptions): Promise<LeadQueryResult> {
    const [leads, contacts, listings, users] = await Promise.all([
      LeadModel.where({ tenantId: options.tenantId }).all(),
      ContactModel.where({ tenantId: options.tenantId }).all(),
      ListingModel.where({ tenantId: options.tenantId }).all(),
      UserModel.where({ tenantId: options.tenantId }).all(),
    ]);
    const contactById = new Map(
      contacts.map((contact) => [contact.id, contact]),
    );
    const listingById = new Map(
      listings.map((listing) => [listing.id, listing]),
    );
    const userById = new Map(users.map((user) => [user.id, user]));
    const withValues = leads.map((lead) =>
      this.withListingValue(lead, listingById.get(lead.listingId)),
    );
    const filtered = this.filterLeads(
      withValues,
      options,
      contactById,
      listingById,
      userById,
    );
    const sorted = this.sortLeads(filtered, options.sort, options.direction);
    const start = (options.page - 1) * options.perPage;

    return {
      data: sorted.slice(start, start + options.perPage),
      total: sorted.length,
    };
  }

  async findById(tenantId: string, id: string): Promise<Lead | null> {
    const lead = await LeadModel.where({ tenantId, id }).first();

    if (!lead) {
      return null;
    }

    const listing = await ListingModel.where({
      tenantId,
      id: lead.listingId,
    }).first();

    return this.withListingValue(lead, listing ?? undefined);
  }

  async create(data: LeadCreateInput): Promise<Lead> {
    const lead = await LeadModel.create({
      tenantId: data.tenantId,
      contactId: data.contactId,
      listingId: data.listingId,
      userId: data.userId,
      stage: data.stage ?? LeadStages.NEW_LEAD,
      source: data.source ?? LeadSources.MANUAL_ENTRY,
      isActive: data.isActive ?? true,
      nextTask: data.nextTask ?? null,
      dueAt: data.dueAt ?? null,
    });

    return this.withCurrentListingValue(lead);
  }

  async update(
    tenantId: string,
    id: string,
    data: LeadUpdateInput,
  ): Promise<Lead | null> {
    const lead = await this.findById(tenantId, id);

    if (!lead) {
      return null;
    }

    await db.transaction(async (tx) => {
      await tx.orm.public.Lead.where({ tenantId, id }).update({
        ...(data.contactId !== undefined ? { contactId: data.contactId } : {}),
        ...(data.listingId !== undefined ? { listingId: data.listingId } : {}),
        ...(data.userId !== undefined ? { userId: data.userId } : {}),
        ...(data.stage !== undefined
          ? { stage: data.stage ?? LeadStages.NEW_LEAD }
          : {}),
        ...(data.source !== undefined
          ? { source: data.source ?? LeadSources.MANUAL_ENTRY }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.nextTask !== undefined ? { nextTask: data.nextTask } : {}),
        ...(data.dueAt !== undefined ? { dueAt: data.dueAt } : {}),
        updatedAt: new Date().toISOString(),
      });
    });

    return this.findById(tenantId, id);
  }

  async updateStage(
    tenantId: string,
    id: string,
    stage: number,
  ): Promise<Lead | null> {
    return this.update(tenantId, id, { stage });
  }

  private async withCurrentListingValue(lead: Lead): Promise<Lead> {
    const listing = await ListingModel.where({
      tenantId: lead.tenantId,
      id: lead.listingId,
    }).first();

    return this.withListingValue(lead, listing ?? undefined);
  }

  private withListingValue(lead: Lead, listing?: Listing): Lead {
    return {
      ...lead,
      listingValue: listing?.price ?? 0,
    };
  }

  private filterLeads(
    leads: Lead[],
    options: LeadQueryOptions,
    contactById: Map<string, Contact>,
    listingById: Map<string, Listing>,
    userById: Map<string, User>,
  ): Lead[] {
    const stage = leadStageFromInput(options.stage);
    const sources = this.commaSeparated(options.source)
      .map((source) => leadSourceFromInput(source))
      .filter((source): source is number => source !== null);
    const active = this.activeFilter(options.isActive);
    const userIds = this.commaSeparated(options.userId);
    const contactIds = this.commaSeparated(options.contactId);
    const listingIds = this.commaSeparated(options.listingId);
    const needle = options.search?.trim().toLowerCase();
    const matchingStages = this.matchingLabelValues(
      needle,
      leadStageValues(),
      leadStageLabel,
    );
    const matchingSources = this.matchingLabelValues(
      needle,
      leadSourceValues(),
      leadSourceLabel,
    );

    return leads.filter((lead) => {
      const contact = contactById.get(lead.contactId);
      const listing = listingById.get(lead.listingId);
      const user = userById.get(lead.userId);
      const matchesSearch =
        !needle ||
        [
          lead.nextTask,
          contact?.firstName,
          contact?.lastName,
          contact?.email,
          listing?.title,
          user?.name,
          user?.email,
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle) ||
        matchingStages.includes(lead.stage) ||
        matchingSources.includes(lead.source);

      return (
        (stage === null || lead.stage === stage) &&
        (sources.length === 0 || sources.includes(lead.source)) &&
        (active === null || lead.isActive === active) &&
        (userIds.length === 0 || userIds.includes(lead.userId)) &&
        (contactIds.length === 0 || contactIds.includes(lead.contactId)) &&
        (listingIds.length === 0 || listingIds.includes(lead.listingId)) &&
        matchesSearch
      );
    });
  }

  private sortLeads(
    leads: Lead[],
    sort: LeadSortKey,
    direction: 'asc' | 'desc',
  ): Lead[] {
    const multiplier = direction === 'desc' ? -1 : 1;

    return [...leads].sort((left, right) => {
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

  private sortValue(lead: Lead, key: LeadSortKey): string | number | null {
    const sortable: Record<LeadSortKey, string | number | null> = {
      stage: lead.stage,
      source: lead.source,
      value: Number(lead.listingValue ?? 0),
      next_task: lead.nextTask,
      due_at: lead.dueAt,
      created_at: lead.createdAt,
    };

    return sortable[key];
  }

  private activeFilter(value?: string): boolean | null {
    const normalized = value?.trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    if (['active', '1', 'true'].includes(normalized)) {
      return true;
    }

    if (['inactive', '0', 'false'].includes(normalized)) {
      return false;
    }

    return null;
  }

  private matchingLabelValues(
    needle: string | undefined,
    values: number[],
    labelFor: (value: number) => string,
  ): number[] {
    if (!needle) {
      return [];
    }

    return values.filter((value) =>
      labelFor(value).toLowerCase().includes(needle),
    );
  }

  private commaSeparated(value?: string): string[] {
    if (!value) {
      return [];
    }

    return [
      ...new Set(
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
  }
}
