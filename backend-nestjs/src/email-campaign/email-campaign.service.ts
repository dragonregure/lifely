import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityEvents } from '../activity/activity.events.js';
import { ContactService } from '../contact/contact.service.js';
import { ListingService } from '../listing/listing.service.js';
import { UserService } from '../user/user.service.js';
import { CampaignEmailRenderer } from './campaign-email.renderer.js';
import { MailEmailSender } from './campaign-email.sender.js';
import {
  EMAIL_LIMIT_RESERVED_HEADER,
  EMAIL_LIMIT_TENANT_HEADER,
} from './email-campaign.constants.js';
import {
  EmailCampaignResponseDto,
  PaginatedEmailCampaignListEnvelopeDto,
  SendBulkEmailDto,
} from './email-campaign.dto.js';
import { EmailCampaignQueue } from './email-campaign.queue.js';
import {
  EmailCampaignQueryOptions,
  EmailCampaignValidationError,
  EmailCampaignRepository,
  EmailCampaignSortKey,
} from './email-campaign.repository.js';
import { CampaignRecipient, EmailCampaign } from './email-campaign.type.js';

type EmailCampaignQuery = Record<
  string,
  string | string[] | Record<string, unknown> | undefined
>;

export const EMAIL_CAMPAIGN_QUEUE = Symbol('EMAIL_CAMPAIGN_QUEUE');

@Injectable()
export class EmailCampaignService {
  constructor(
    private readonly campaignRepository: EmailCampaignRepository,
    @Inject(EMAIL_CAMPAIGN_QUEUE)
    private readonly campaignQueue: Pick<
      EmailCampaignQueue,
      'enqueueCampaign' | 'enqueueContact'
    >,
    private readonly eventEmitter: EventEmitter2,
    private readonly contactService: ContactService,
    private readonly listingService: ListingService,
    private readonly userService: UserService,
    private readonly emailSender: MailEmailSender,
    private readonly renderer: CampaignEmailRenderer,
  ) {}

  async findCampaigns(
    tenantId: string,
    query: EmailCampaignQuery,
    baseUrl = 'http://localhost/api/v1/email-campaigns',
  ): Promise<PaginatedEmailCampaignListEnvelopeDto> {
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
    const options: EmailCampaignQueryOptions = {
      tenantId,
      search: this.single(query.search),
      status: this.filter(query, 'status'),
      userId: this.filter(query, 'user_id'),
      sort: sort.key,
      direction,
      page,
      perPage,
    };
    const result = await this.campaignRepository.find(options);
    const data = result.data.map((campaign) =>
      this.toCampaignResponse(campaign),
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

  async queueBulkEmail(
    tenantId: string,
    dto: SendBulkEmailDto,
  ): Promise<EmailCampaignResponseDto> {
    await this.ensureTenantRelationships(tenantId, dto);

    try {
      const campaign = await this.campaignRepository.createQueued({
        tenantId,
        userId: dto.user_id,
        listingId: dto.listing_id,
        contactIds: this.requestedContactIds(dto),
        activeOnly: dto.all_active_contacts === true,
        subject: dto.subject,
        body: dto.body,
      });

      await this.eventEmitter.emitAsync(ActivityEvents.EMAIL_CAMPAIGN_CREATED, {
        campaign,
      });
      await this.campaignQueue.enqueueCampaign(campaign.id);

      return this.toCampaignResponse(campaign);
    } catch (error) {
      if (error instanceof EmailCampaignValidationError) {
        this.throwValidationErrors(error.errors);
      }

      throw error;
    }
  }

  async processCampaign(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (!campaign || campaign.status !== 'Queued') {
      return;
    }

    const sending = await this.campaignRepository.updateStatus(
      campaign,
      'Sending',
    );
    await this.eventEmitter.emitAsync(ActivityEvents.EMAIL_CAMPAIGN_UPDATED, {
      before: campaign,
      after: sending,
    });

    const recipients =
      await this.campaignRepository.campaignRecipients(sending);

    for (const recipient of recipients) {
      await this.campaignQueue.enqueueContact(sending.id, recipient.id);
    }

    const sent = await this.campaignRepository.updateStatus(sending, 'Sent');
    await this.eventEmitter.emitAsync(ActivityEvents.EMAIL_CAMPAIGN_UPDATED, {
      before: sending,
      after: sent,
    });
  }

  async processCampaignContact(
    campaignId: string,
    contactId: string,
  ): Promise<void> {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (
      !campaign ||
      (campaign.status !== 'Sending' && campaign.status !== 'Sent')
    ) {
      return;
    }

    const recipient = await this.campaignRepository.recipient(
      campaign,
      contactId,
    );

    if (!recipient) {
      return;
    }

    await this.sendCampaignEmail(campaign, recipient);
  }

  private async sendCampaignEmail(
    campaign: EmailCampaign,
    recipient: CampaignRecipient,
  ): Promise<void> {
    const listing = await this.campaignRepository.listing(campaign);

    await this.emailSender.send({
      to: [
        {
          address: recipient.email,
          name: `${recipient.firstName} ${recipient.lastName}`.trim(),
        },
      ],
      subject: campaign.subject,
      html: this.renderer.html(campaign, listing),
      text: this.renderer.text(campaign, listing),
      headers: {
        'X-Lifely-Campaign-Id': campaign.id,
        [EMAIL_LIMIT_TENANT_HEADER]: campaign.tenantId,
        [EMAIL_LIMIT_RESERVED_HEADER]: 'true',
      },
    });
  }

  private async ensureTenantRelationships(
    tenantId: string,
    dto: SendBulkEmailDto,
  ): Promise<void> {
    const errors: Record<string, string[]> = {};
    const contactIds = this.requestedContactIds(dto);

    if (
      contactIds.length === 0 ||
      !(await this.contactService.contactsBelongToTenant(tenantId, contactIds))
    ) {
      errors[
        dto.all_active_contacts === true
          ? 'included_contact_ids'
          : 'contact_ids'
      ] = ['The selected contact ids are invalid.'];
    }

    if (
      dto.all_active_contacts === true &&
      !(await this.activeContactsBelongToTenant(tenantId, contactIds))
    ) {
      errors.included_contact_ids = [
        'Only active contacts can be selected for an active bulk email.',
      ];
    }

    if (
      dto.user_id &&
      !(await this.userService.userBelongsToTenant(dto.user_id, tenantId))
    ) {
      errors.user_id = ['The selected user id is invalid.'];
    }

    if (
      dto.listing_id &&
      !(await this.listingService.listingsBelongToTenant(tenantId, [
        dto.listing_id,
      ]))
    ) {
      errors.listing_id = ['The selected listing id is invalid.'];
    }

    this.throwValidationErrors(errors);
  }

  private async activeContactsBelongToTenant(
    tenantId: string,
    contactIds: string[],
  ): Promise<boolean> {
    const contacts = await this.contactService.findContactsByIds(
      tenantId,
      contactIds,
    );

    return (
      contacts.length === [...new Set(contactIds)].length &&
      contacts.every((contact) => contact.status)
    );
  }

  private requestedContactIds(dto: SendBulkEmailDto): string[] {
    const ids =
      dto.all_active_contacts === true
        ? (dto.included_contact_ids ?? [])
        : (dto.contact_ids ?? []);

    return [...new Set(ids.filter(Boolean))];
  }

  private toCampaignResponse(
    campaign: EmailCampaign,
  ): EmailCampaignResponseDto {
    return {
      id: campaign.id,
      tenant_id: campaign.tenantId,
      user_id: campaign.userId,
      listing_id: campaign.listingId,
      subject: campaign.subject,
      recipient_count: Number(campaign.recipientCount),
      status: campaign.status,
      created_at: this.isoValue(campaign.createdAt) ?? campaign.createdAt,
    };
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

  private filter(query: EmailCampaignQuery, key: string): string | undefined {
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
    key: EmailCampaignSortKey;
    requested: boolean;
  } {
    const sortableKeys: EmailCampaignSortKey[] = [
      'subject',
      'recipient_count',
      'status',
      'created_at',
    ];

    return value !== undefined &&
      sortableKeys.includes(value as EmailCampaignSortKey)
      ? { key: value as EmailCampaignSortKey, requested: true }
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

  private pageUrl(
    baseUrl: string,
    query: EmailCampaignQuery,
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
    query: EmailCampaignQuery,
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
