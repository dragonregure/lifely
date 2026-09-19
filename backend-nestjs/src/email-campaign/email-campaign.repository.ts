import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import {
  Contact as ContactModel,
  EmailCampaign as EmailCampaignModel,
  Listing as ListingModel,
  TenantEmailUsage as TenantEmailUsageModel,
  User as UserModel,
} from '../prisma/prisma.service.js';
import {
  CampaignListing,
  CampaignRecipient,
  EmailCampaign,
} from './email-campaign.type.js';

export type EmailCampaignSortKey =
  'subject' | 'recipient_count' | 'status' | 'created_at';

export type EmailCampaignQueryOptions = {
  tenantId: string;
  search?: string;
  status?: string;
  userId?: string;
  sort: EmailCampaignSortKey;
  direction: 'asc' | 'desc';
  page: number;
  perPage: number;
};

export type EmailCampaignQueryResult = {
  data: EmailCampaign[];
  total: number;
};

export type QueueEmailCampaignInput = {
  tenantId: string;
  userId?: string | null;
  listingId?: string | null;
  contactIds: string[];
  activeOnly: boolean;
  subject: string;
  body: string;
};

export class EmailCampaignValidationError extends Error {
  constructor(readonly errors: Record<string, string[]>) {
    super(Object.values(errors)[0]?.[0] ?? 'Validation failed.');
  }
}

@Injectable()
export class EmailCampaignRepository {
  async find(
    options: EmailCampaignQueryOptions,
  ): Promise<EmailCampaignQueryResult> {
    const campaigns = await EmailCampaignModel.where({
      tenantId: options.tenantId,
    }).all();
    const filtered = this.filterCampaigns(campaigns, options);
    const sorted = this.sortCampaigns(
      filtered,
      options.sort,
      options.direction,
    );
    const start = (options.page - 1) * options.perPage;

    return {
      data: sorted.slice(start, start + options.perPage),
      total: sorted.length,
    };
  }

  async findById(campaignId: string): Promise<EmailCampaign | null> {
    return EmailCampaignModel.where({ id: campaignId }).first();
  }

  async createQueued(data: QueueEmailCampaignInput): Promise<EmailCampaign> {
    return db.transaction(async (tx) => {
      const contactIds = await this.tenantContactIds(
        tx.orm.public.Contact,
        data.tenantId,
        data.contactIds,
        data.activeOnly,
      );

      await this.reserveDemoLimit(
        tx.orm.public.TenantEmailUsage,
        data.tenantId,
        contactIds.length,
      );

      return tx.orm.public.EmailCampaign.create({
        tenantId: data.tenantId,
        userId: await this.tenantUserId(
          tx.orm.public.User,
          data.tenantId,
          data.userId,
        ),
        listingId: await this.tenantListingId(
          tx.orm.public.Listing,
          data.tenantId,
          data.listingId,
        ),
        subject: data.subject,
        body: data.body,
        contactIds,
        recipientCount: contactIds.length,
        status: 'Queued',
      });
    });
  }

  async updateStatus(
    campaign: EmailCampaign,
    status: 'Sending' | 'Sent',
  ): Promise<EmailCampaign> {
    await EmailCampaignModel.where({ id: campaign.id }).update({
      status,
      updatedAt: new Date().toISOString(),
    });

    return (await this.findById(campaign.id)) ?? { ...campaign, status };
  }

  async campaignRecipients(
    campaign: EmailCampaign,
  ): Promise<CampaignRecipient[]> {
    const contactIds = this.contactIds(campaign);

    if (contactIds.length === 0) {
      return [];
    }

    const contacts = await ContactModel.where({
      tenantId: campaign.tenantId,
    }).all();
    const byId = new Map(contacts.map((contact) => [contact.id, contact]));

    return contactIds
      .map((contactId) => byId.get(contactId))
      .filter(
        (contact): contact is NonNullable<typeof contact> =>
          contact !== undefined && contact.email.trim() !== '',
      );
  }

  async recipient(
    campaign: EmailCampaign,
    contactId: string,
  ): Promise<CampaignRecipient | null> {
    if (!this.contactIds(campaign).includes(contactId)) {
      return null;
    }

    const contact = await ContactModel.where({
      tenantId: campaign.tenantId,
      id: contactId,
    }).first();

    return contact && contact.email.trim() !== '' ? contact : null;
  }

  async listing(campaign: EmailCampaign): Promise<CampaignListing | null> {
    if (!campaign.listingId) {
      return null;
    }

    return ListingModel.where({
      tenantId: campaign.tenantId,
      id: campaign.listingId,
    }).first();
  }

  contactIds(campaign: EmailCampaign): string[] {
    return Array.isArray(campaign.contactIds)
      ? campaign.contactIds.filter(
          (contactId): contactId is string => typeof contactId === 'string',
        )
      : [];
  }

  private filterCampaigns(
    campaigns: EmailCampaign[],
    options: EmailCampaignQueryOptions,
  ): EmailCampaign[] {
    const needle = options.search?.trim().toLowerCase();
    const statuses = this.commaSeparated(options.status);
    const userIds = this.commaSeparated(options.userId);

    return campaigns.filter((campaign) => {
      const matchesSearch =
        !needle ||
        [campaign.subject, campaign.status]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesStatus =
        statuses.length === 0 || statuses.includes(campaign.status);
      const matchesUser =
        userIds.length === 0 ||
        (campaign.userId !== null && userIds.includes(campaign.userId));

      return matchesSearch && matchesStatus && matchesUser;
    });
  }

  private sortCampaigns(
    campaigns: EmailCampaign[],
    sort: EmailCampaignSortKey,
    direction: 'asc' | 'desc',
  ): EmailCampaign[] {
    const multiplier = direction === 'desc' ? -1 : 1;

    return [...campaigns].sort((left, right) => {
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

  private sortValue(
    campaign: EmailCampaign,
    key: EmailCampaignSortKey,
  ): string | number {
    const sortable: Record<EmailCampaignSortKey, string | number | null> = {
      subject: campaign.subject,
      recipient_count: campaign.recipientCount,
      status: campaign.status,
      created_at: campaign.createdAt,
    };

    return sortable[key] ?? '';
  }

  private async tenantContactIds(
    model: typeof ContactModel,
    tenantId: string,
    contactIds: string[],
    activeOnly: boolean,
  ): Promise<string[]> {
    if (contactIds.length === 0) {
      return [];
    }

    const uniqueContactIds = [...new Set(contactIds)];
    const contacts = await model.where({ tenantId }).all();
    const allowedContactIds = new Set(
      contacts
        .filter((contact) => uniqueContactIds.includes(contact.id))
        .filter((contact) => !activeOnly || contact.status)
        .map((contact) => contact.id),
    );

    return uniqueContactIds.filter((contactId) =>
      allowedContactIds.has(contactId),
    );
  }

  private async tenantUserId(
    model: typeof UserModel,
    tenantId: string,
    userId: string | null | undefined,
  ): Promise<string | null> {
    if (!userId) {
      return null;
    }

    const user = await model.where({ tenantId, id: userId }).first();

    return user?.id ?? null;
  }

  private async tenantListingId(
    model: typeof ListingModel,
    tenantId: string,
    listingId: string | null | undefined,
  ): Promise<string | null> {
    if (!listingId) {
      return null;
    }

    const listing = await model.where({ tenantId, id: listingId }).first();

    return listing?.id ?? null;
  }

  private async reserveDemoLimit(
    model: typeof TenantEmailUsageModel,
    tenantId: string,
    requestedCount: number,
  ): Promise<void> {
    if (!this.demoModeEnabled() || requestedCount <= 0) {
      return;
    }

    const now = new Date().toISOString();
    let usage = await model.where({ tenantId }).first();

    if (!usage) {
      usage = await model.create({
        tenantId,
        sentCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    const usedCount = Math.max(
      Number(usage.sentCount),
      await this.campaignRecipientCount(tenantId),
    );
    const remainingCount = Math.max(0, this.demoLimit() - usedCount);

    if (requestedCount > remainingCount) {
      throw new EmailCampaignValidationError({
        email_limit: [this.demoLimitMessage(remainingCount)],
      });
    }

    await model.where({ tenantId }).update({
      sentCount: usedCount + requestedCount,
      updatedAt: now,
    });
  }

  private async campaignRecipientCount(tenantId: string): Promise<number> {
    const campaigns = await EmailCampaignModel.where({ tenantId }).all();

    return campaigns.reduce(
      (total, campaign) => total + Number(campaign.recipientCount),
      0,
    );
  }

  private demoModeEnabled(): boolean {
    return process.env['LIFELY_APP_MODE'] === 'demo';
  }

  private demoLimit(): number {
    const parsed = Number.parseInt(
      process.env['LIFELY_DEMO_EMAIL_LIMIT'] ?? '',
      10,
    );

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
  }

  private demoLimitMessage(remainingCount: number): string {
    return `Email sending in demo limited to ${this.demoLimit()} times, you have ${remainingCount} limit left.`;
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
