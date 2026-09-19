import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Contact } from '../contact/contact.type.js';
import type { EmailCampaign } from '../email-campaign/email-campaign.type.js';
import { leadStageLabel } from '../lead/lead.constants.js';
import type { Lead } from '../lead/lead.type.js';
import type { Listing } from '../listing/listing.type.js';
import {
  ActivityLogResponseDto,
  PaginatedActivityLogListEnvelopeDto,
} from './activity.dto.js';
import {
  ActivityQueryOptions,
  ActivityRepository,
  ActivitySortKey,
} from './activity.repository.js';
import type {
  ActivityChange,
  ActivityLog,
  ActivityProperties,
  ActivitySubject,
} from './activity.type.js';
import { ActivityEvents } from './activity.events.js';
import type {
  ContactCreatedActivityEvent,
  ContactDeletedActivityEvent,
  ContactUpdatedActivityEvent,
  EmailCampaignCreatedActivityEvent,
  EmailCampaignUpdatedActivityEvent,
  LeadCreatedActivityEvent,
  LeadUpdatedActivityEvent,
  ListingCreatedActivityEvent,
  ListingUpdatedActivityEvent,
  ReportExportedActivityEvent,
} from './activity.events.js';

type ActivityQuery = Record<
  string,
  string | string[] | Record<string, unknown> | undefined
>;

type AttributeMap<T extends ActivitySubject> = Partial<
  Record<keyof T & string, string>
>;

@Injectable()
export class ActivityService {
  constructor(private readonly activityRepository: ActivityRepository) {}

  async findActivityLogs(
    tenantId: string,
    query: ActivityQuery,
    baseUrl = 'http://localhost/api/v1/activity-logs',
  ): Promise<PaginatedActivityLogListEnvelopeDto> {
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
    const options: ActivityQueryOptions = {
      tenantId,
      search: this.single(query.search),
      actionType: this.filter(query, 'action_type'),
      userId: this.filter(query, 'user_id'),
      sort: sort.key,
      direction,
      page,
      perPage,
    };
    const result = await this.activityRepository.find(options);
    const data = result.data.map((activityLog) =>
      this.toActivityLogResponse(activityLog),
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

  @OnEvent(ActivityEvents.CONTACT_CREATED)
  async recordContactCreated({
    contact,
  }: ContactCreatedActivityEvent): Promise<void> {
    await this.recordCreated(
      contact,
      'contact',
      contact.ownerId,
      'contact.created',
      `Created contact ${contact.firstName} ${contact.lastName}.`,
      this.contactAttributes(contact),
    );
  }

  @OnEvent(ActivityEvents.CONTACT_UPDATED)
  async recordContactUpdated({
    before,
    after,
  }: ContactUpdatedActivityEvent): Promise<void> {
    const changes = this.changes(
      this.contactAttributes(before),
      this.contactAttributes(after),
    );

    if (Object.keys(changes).length === 0) {
      return;
    }

    await this.recordUpdated(
      after,
      'contact',
      after.ownerId,
      'contact.updated',
      `Updated contact ${after.firstName} ${after.lastName}: ${Object.keys(changes).join(', ')}.`,
      changes,
    );
  }

  @OnEvent(ActivityEvents.CONTACT_DELETED)
  async recordContactDeleted({
    contact,
  }: ContactDeletedActivityEvent): Promise<void> {
    await this.recordDeleted(
      contact,
      'contact',
      contact.ownerId,
      'contact.deleted',
      `Deleted contact ${contact.firstName} ${contact.lastName}.`,
      this.contactAttributes(contact),
    );
  }

  @OnEvent(ActivityEvents.LISTING_CREATED)
  async recordListingCreated({
    listing,
  }: ListingCreatedActivityEvent): Promise<void> {
    await this.recordCreated(
      listing,
      'listing',
      null,
      'listing.created',
      `Created listing ${listing.title}.`,
      this.listingAttributes(listing),
    );
  }

  @OnEvent(ActivityEvents.LISTING_UPDATED)
  async recordListingUpdated({
    before,
    after,
  }: ListingUpdatedActivityEvent): Promise<void> {
    const changes = this.changes(
      this.listingAttributes(before),
      this.listingAttributes(after),
    );

    if (Object.keys(changes).length === 0) {
      return;
    }

    await this.recordUpdated(
      after,
      'listing',
      null,
      'listing.updated',
      `Updated listing ${after.title}: ${Object.keys(changes).join(', ')}.`,
      changes,
    );
  }

  @OnEvent(ActivityEvents.LEAD_CREATED)
  async recordLeadCreated({ lead }: LeadCreatedActivityEvent): Promise<void> {
    await this.recordCreated(
      lead,
      'lead',
      lead.userId,
      'lead.created',
      'Created a lead and follow-up task.',
      this.leadAttributes(lead),
    );
  }

  @OnEvent(ActivityEvents.LEAD_UPDATED)
  async recordLeadUpdated({
    before,
    after,
  }: LeadUpdatedActivityEvent): Promise<void> {
    const changes = this.changes(
      this.leadAttributes(before),
      this.leadAttributes(after),
    );

    if (Object.keys(changes).length === 0) {
      return;
    }

    const description =
      changes.stage !== undefined
        ? `Moved lead to ${leadStageLabel(after.stage)}.`
        : `Updated lead: ${Object.keys(changes).join(', ')}.`;

    await this.recordUpdated(
      after,
      'lead',
      after.userId,
      'lead.updated',
      description,
      changes,
    );
  }

  @OnEvent(ActivityEvents.EMAIL_CAMPAIGN_CREATED)
  async recordEmailCampaignCreated({
    campaign,
  }: EmailCampaignCreatedActivityEvent): Promise<void> {
    await this.recordCreated(
      campaign,
      'email_campaign',
      campaign.userId,
      'email.queued',
      `Queued bulk email '${campaign.subject}' to ${campaign.recipientCount} contacts.`,
      this.emailCampaignAttributes(campaign),
    );
  }

  @OnEvent(ActivityEvents.EMAIL_CAMPAIGN_UPDATED)
  async recordEmailCampaignUpdated({
    before,
    after,
  }: EmailCampaignUpdatedActivityEvent): Promise<void> {
    const changes = this.changes(
      this.emailCampaignAttributes(before),
      this.emailCampaignAttributes(after),
    );

    if (Object.keys(changes).length === 0) {
      return;
    }

    await this.recordUpdated(
      after,
      'email_campaign',
      after.userId,
      'email.updated',
      `Updated bulk email '${after.subject}': ${Object.keys(changes).join(', ')}.`,
      changes,
    );
  }

  @OnEvent(ActivityEvents.REPORT_EXPORTED)
  async recordReportExported({
    tenantId,
    userId,
    reportName,
    properties,
  }: ReportExportedActivityEvent): Promise<void> {
    await this.activityRepository.record({
      tenantId,
      userId,
      actionType: 'report.exported',
      description: `Exported report: ${reportName}`,
      properties,
    });
  }

  private async recordCreated<T extends ActivitySubject>(
    subject: T,
    subjectType: string,
    userId: string | null,
    actionType: string,
    description: string,
    attributes: ActivityProperties,
  ): Promise<void> {
    await this.record(subject, userId, actionType, description, {
      subject_type: subjectType,
      subject_id: subject.id,
      attributes,
    });
  }

  private async recordUpdated<T extends ActivitySubject>(
    subject: T,
    subjectType: string,
    userId: string | null,
    actionType: string,
    description: string,
    changes: Record<string, ActivityChange>,
  ): Promise<void> {
    await this.record(subject, userId, actionType, description, {
      subject_type: subjectType,
      subject_id: subject.id,
      changes,
    });
  }

  private async recordDeleted<T extends ActivitySubject>(
    subject: T,
    subjectType: string,
    userId: string | null,
    actionType: string,
    description: string,
    attributes: ActivityProperties,
  ): Promise<void> {
    await this.record(subject, userId, actionType, description, {
      subject_type: subjectType,
      subject_id: subject.id,
      attributes,
    });
  }

  private async record<T extends ActivitySubject>(
    subject: T,
    userId: string | null,
    actionType: string,
    description: string,
    properties: ActivityProperties,
  ): Promise<void> {
    await this.activityRepository.record({
      tenantId: subject.tenantId,
      userId,
      actionType,
      description,
      properties,
    });
  }

  private changes(
    before: ActivityProperties,
    after: ActivityProperties,
  ): Record<string, ActivityChange> {
    const changes: Record<string, ActivityChange> = {};

    for (const [key, newValue] of Object.entries(after)) {
      const oldValue = before[key];

      if (this.sameValue(oldValue, newValue)) {
        continue;
      }

      changes[key] = {
        old: oldValue,
        new: newValue,
      };
    }

    return changes;
  }

  private contactAttributes(contact: Contact): ActivityProperties {
    return this.attributes(contact, {
      id: 'id',
      tenantId: 'tenant_id',
      ownerId: 'owner_id',
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      phone: 'phone',
      status: 'status',
      budget: 'budget',
      source: 'source',
      lastContactedAt: 'last_contacted_at',
    });
  }

  private listingAttributes(listing: Listing): ActivityProperties {
    return this.attributes(listing, {
      id: 'id',
      tenantId: 'tenant_id',
      title: 'title',
      address: 'address',
      price: 'price',
      status: 'status',
      bedrooms: 'bedrooms',
      bathrooms: 'bathrooms',
      propertyType: 'property_type',
    });
  }

  private leadAttributes(lead: Lead): ActivityProperties {
    return this.attributes(lead, {
      id: 'id',
      tenantId: 'tenant_id',
      contactId: 'contact_id',
      listingId: 'listing_id',
      userId: 'user_id',
      stage: 'stage',
      source: 'source',
      isActive: 'is_active',
      nextTask: 'next_task',
      dueAt: 'due_at',
    });
  }

  private emailCampaignAttributes(campaign: EmailCampaign): ActivityProperties {
    return this.attributes(campaign, {
      id: 'id',
      tenantId: 'tenant_id',
      userId: 'user_id',
      listingId: 'listing_id',
      subject: 'subject',
      recipientCount: 'recipient_count',
      status: 'status',
    });
  }

  private attributes<T extends ActivitySubject>(
    subject: T,
    map: AttributeMap<T>,
  ): ActivityProperties {
    const entries = Object.entries(map) as Array<[keyof T & string, string]>;

    return Object.fromEntries(
      entries.map(([source, target]) => [
        target,
        this.normalizeValue(subject[source as keyof T]),
      ]),
    );
  }

  private normalizeValue(value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }

  private sameValue(left: unknown, right: unknown): boolean {
    return (
      this.normalizeForComparison(left) === this.normalizeForComparison(right)
    );
  }

  private normalizeForComparison(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint' ||
      typeof value === 'symbol'
    ) {
      return value.toString();
    }

    return '[function]';
  }

  private toActivityLogResponse(
    activityLog: ActivityLog,
  ): ActivityLogResponseDto {
    return {
      id: activityLog.id,
      tenant_id: activityLog.tenantId,
      user_id: activityLog.userId,
      user_name: activityLog.userName ?? null,
      action_type: activityLog.actionType,
      description: activityLog.description,
      properties: activityLog.properties,
      created_at: this.isoValue(activityLog.createdAt) ?? activityLog.createdAt,
    };
  }

  private filter(query: ActivityQuery, key: string): string | undefined {
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
    key: ActivitySortKey;
    requested: boolean;
  } {
    const sortableKeys: ActivitySortKey[] = [
      'action',
      'description',
      'user',
      'time',
      'created_at',
    ];

    return value !== undefined &&
      sortableKeys.includes(value as ActivitySortKey)
      ? { key: value as ActivitySortKey, requested: true }
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

  private isoValue(value: string | null): string | null {
    return value === null ? null : new Date(value).toISOString();
  }

  private pageUrl(baseUrl: string, query: ActivityQuery, page: number): string {
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
    query: ActivityQuery,
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
