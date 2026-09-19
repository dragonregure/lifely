import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import {
  EmailCampaign as EmailCampaignModel,
  TenantEmailUsage as TenantEmailUsageModel,
} from '../prisma/prisma.service.js';
import { EmailCampaign } from './email-campaign.type.js';

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
      const contactIds = [...new Set(data.contactIds)];

      await this.reserveDemoLimit(
        tx.orm.public.TenantEmailUsage,
        data.tenantId,
        contactIds.length,
      );

      return tx.orm.public.EmailCampaign.create({
        tenantId: data.tenantId,
        userId: data.userId ?? null,
        listingId: data.listingId ?? null,
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
