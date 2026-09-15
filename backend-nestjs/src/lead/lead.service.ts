import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ActivityService } from '../activity/activity.service.js';
import { ContactService } from '../contact/contact.service.js';
import { ListingService } from '../listing/listing.service.js';
import { Permissions } from '../rbac/rbac.constants.js';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import { UserService } from '../user/user.service.js';
import {
  isClosedLeadStage,
  LeadSources,
  LeadStages,
  leadSourceLabel,
  leadStageLabel,
} from './lead.constants.js';
import {
  LeadResponseDto,
  PaginatedLeadListEnvelopeDto,
  StoreLeadDto,
  UpdateLeadDto,
  UpdateLeadStageDto,
} from './lead.dto.js';
import {
  LeadCreateInput,
  LeadQueryOptions,
  LeadRepository,
  LeadSortKey,
  LeadUpdateInput,
} from './lead.repository.js';
import { Lead, LeadInclude, LeadRelations } from './lead.type.js';

type LeadQuery = Record<
  string,
  string | string[] | Record<string, unknown> | undefined
>;

const ALLOWED_INCLUDES: LeadInclude[] = ['contact', 'listing', 'user'];

@Injectable()
export class LeadService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly activityService: ActivityService,
    private readonly contactService: ContactService,
    private readonly listingService: ListingService,
    private readonly userService: UserService,
  ) {}

  async findLeads(
    tenantId: string,
    query: LeadQuery,
    baseUrl = 'http://localhost/api/v1/leads',
  ): Promise<PaginatedLeadListEnvelopeDto> {
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
    const options: LeadQueryOptions = {
      tenantId,
      search: this.single(query.search),
      stage: this.filter(query, 'stage'),
      source: this.filter(query, 'source'),
      userId: this.filter(query, 'user_id'),
      contactId: this.filter(query, 'contact_id'),
      listingId: this.filter(query, 'listing_id'),
      isActive: this.filter(query, 'is_active'),
      sort: sort.key,
      direction,
      page,
      perPage,
    };
    const result = await this.leadRepository.find(options);
    const data = await this.toLeadResponses(tenantId, result.data, includes);
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

  async createLead(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: StoreLeadDto,
  ): Promise<LeadResponseDto> {
    this.authorizeCreate(actor, dto);
    await this.ensureTenantRelations(tenantId, {
      contactId: dto.contact_id,
      listingId: dto.listing_id,
      userId: dto.user_id,
    });

    const lead = await this.leadRepository.create(
      this.toCreateInput(tenantId, dto),
    );
    await this.activityService.recordLeadCreated(lead);
    await this.markListingSoldWhenClosedWon(tenantId, lead);

    return this.toLeadResponse(lead);
  }

  async updateLead(
    tenantId: string,
    actor: AuthenticatedUser,
    leadId: string,
    dto: UpdateLeadDto,
  ): Promise<LeadResponseDto> {
    this.authorizeAnyLeadUpdate(actor);

    const lead = await this.existingLead(tenantId, leadId);
    await this.ensureTenantRelations(tenantId, {
      contactId: dto.contact_id,
      listingId: dto.listing_id,
      userId: dto.user_id,
    });
    await this.authorizeLeadUpdate(tenantId, actor, lead, dto);

    const updated = await this.leadRepository.update(
      tenantId,
      leadId,
      this.toUpdateInput(dto),
    );

    if (!updated) {
      throw new NotFoundException('Lead not found.');
    }

    await this.markListingSoldWhenClosedWon(tenantId, updated);
    await this.activityService.recordLeadUpdated(lead, updated);

    return this.toLeadResponse(updated);
  }

  async updateLeadStage(
    tenantId: string,
    actor: AuthenticatedUser,
    leadId: string,
    dto: UpdateLeadStageDto,
  ): Promise<LeadResponseDto> {
    this.denyUnless(
      this.can(actor, Permissions.LEADS_UPDATE),
      'Forbidden resource',
    );

    const lead = await this.existingLead(tenantId, leadId);
    await this.authorizeLeadUpdate(tenantId, actor, lead, {
      stage: dto.stage,
    });

    const updated = await this.leadRepository.updateStage(
      tenantId,
      leadId,
      dto.stage,
    );

    if (!updated) {
      throw new NotFoundException('Lead not found.');
    }

    await this.markListingSoldWhenClosedWon(tenantId, updated);
    await this.activityService.recordLeadUpdated(lead, updated);

    return this.toLeadResponse(updated);
  }

  private async existingLead(tenantId: string, leadId: string): Promise<Lead> {
    const lead = await this.leadRepository.findById(tenantId, leadId);

    if (!lead) {
      throw new NotFoundException('Lead not found.');
    }

    return lead;
  }

  private authorizeCreate(actor: AuthenticatedUser, dto: StoreLeadDto): void {
    if (this.can(actor, Permissions.SYSTEM_BYPASS)) {
      return;
    }

    const isAssigningToSelf = dto.user_id === actor.id;

    this.denyUnless(
      this.can(actor, Permissions.LEADS_CHANGE_ASSIGNEE) ||
        (isAssigningToSelf &&
          this.can(actor, Permissions.LEADS_ASSIGN_TO_SELF)),
      'You do not have permission to set this lead assignee.',
    );
  }

  private authorizeAnyLeadUpdate(actor: AuthenticatedUser): void {
    this.denyUnless(
      this.can(actor, Permissions.LEADS_UPDATE) ||
        this.can(actor, Permissions.LEADS_CHANGE_ASSIGNEE) ||
        this.can(actor, Permissions.LEADS_ASSIGN_TO_SELF),
      'Forbidden resource',
    );
  }

  private async authorizeLeadUpdate(
    tenantId: string,
    actor: AuthenticatedUser,
    lead: Lead,
    data: UpdateLeadDto,
  ): Promise<void> {
    await this.denyBlockedLeadMutation(tenantId, lead, data);

    if (this.can(actor, Permissions.SYSTEM_BYPASS)) {
      return;
    }

    if (this.hasAnyField(data, ['stage', 'is_active', 'next_task'])) {
      this.denyUnless(
        this.can(actor, Permissions.LEADS_UPDATE) && lead.userId === actor.id,
        'Only the assigned user can update lead progress fields.',
      );
    }

    if (this.hasAnyField(data, ['contact_id', 'listing_id'])) {
      this.denyUnless(
        this.can(actor, Permissions.LEADS_UPDATE) &&
          lead.source === LeadSources.MANUAL_ENTRY,
        'Contact and listing can only be changed for manual-entry leads.',
      );
    }

    if (data.user_id === undefined || data.user_id === lead.userId) {
      return;
    }

    const isAssigningToSelf = data.user_id === actor.id;

    this.denyUnless(
      this.can(actor, Permissions.LEADS_CHANGE_ASSIGNEE) ||
        (isAssigningToSelf &&
          this.can(actor, Permissions.LEADS_ASSIGN_TO_SELF)),
      'You do not have permission to change this lead assignee.',
    );
  }

  private async denyBlockedLeadMutation(
    tenantId: string,
    lead: Lead,
    data: UpdateLeadDto,
  ): Promise<void> {
    if (
      isClosedLeadStage(lead.stage) &&
      data.stage !== undefined &&
      data.stage !== lead.stage
    ) {
      this.throwValidationErrors({
        stage: ['Closed lead cards cannot move to another stage.'],
      });
    }

    if (!(await this.hasBlockingProblem(tenantId, lead))) {
      return;
    }

    const blockedFields = Object.entries(data).filter(
      ([key, value]) => key !== 'is_active' && value !== undefined,
    );

    if (blockedFields.length > 0) {
      this.throwValidationErrors({
        lead: [
          'Lead cards with a sold listing or inactive contact can only change active status.',
        ],
      });
    }
  }

  private async hasBlockingProblem(
    tenantId: string,
    lead: Lead,
  ): Promise<boolean> {
    if (lead.stage === LeadStages.CLOSED_WON) {
      return false;
    }

    const [contact] = await this.contactService.findContactsByIds(tenantId, [
      lead.contactId,
    ]);
    const [listing] = await this.listingService.findListingsByIds(tenantId, [
      lead.listingId,
    ]);

    return Boolean(
      (listing && Number(listing.status) === 4) || (contact && !contact.status),
    );
  }

  private async ensureTenantRelations(
    tenantId: string,
    ids: {
      contactId?: string;
      listingId?: string;
      userId?: string;
    },
  ): Promise<void> {
    const errors: Record<string, string[]> = {};

    if (
      ids.contactId &&
      !(await this.contactService.contactsBelongToTenant(tenantId, [
        ids.contactId,
      ]))
    ) {
      errors.contact_id = ['The selected contact id is invalid.'];
    }

    if (
      ids.listingId &&
      !(await this.listingService.listingsBelongToTenant(tenantId, [
        ids.listingId,
      ]))
    ) {
      errors.listing_id = ['The selected listing id is invalid.'];
    }

    if (
      ids.userId &&
      !(await this.userService.userBelongsToTenant(ids.userId, tenantId))
    ) {
      errors.user_id = ['The selected user id is invalid.'];
    }

    this.throwValidationErrors(errors);
  }

  private async markListingSoldWhenClosedWon(
    tenantId: string,
    lead: Lead,
  ): Promise<void> {
    if (lead.stage !== LeadStages.CLOSED_WON) {
      return;
    }

    await this.listingService.markListingSold(tenantId, lead.listingId);
  }

  private toCreateInput(tenantId: string, dto: StoreLeadDto): LeadCreateInput {
    return {
      tenantId,
      contactId: dto.contact_id,
      listingId: dto.listing_id,
      userId: dto.user_id,
      stage: dto.stage,
      source: dto.source,
      isActive: dto.is_active,
      nextTask: dto.next_task,
      dueAt: this.dateValue(dto.due_at),
    };
  }

  private toUpdateInput(dto: UpdateLeadDto): LeadUpdateInput {
    return {
      ...(dto.contact_id !== undefined ? { contactId: dto.contact_id } : {}),
      ...(dto.listing_id !== undefined ? { listingId: dto.listing_id } : {}),
      ...(dto.user_id !== undefined ? { userId: dto.user_id } : {}),
      ...(dto.stage !== undefined ? { stage: dto.stage } : {}),
      ...(dto.is_active !== undefined ? { isActive: dto.is_active } : {}),
      ...(dto.next_task !== undefined ? { nextTask: dto.next_task } : {}),
    };
  }

  private async toLeadResponses(
    tenantId: string,
    leads: Lead[],
    includes: LeadInclude[],
  ): Promise<LeadResponseDto[]> {
    const relationMap = await this.relations(tenantId, leads, includes);

    return leads.map((lead) =>
      this.toLeadResponse(lead, relationMap.get(lead.id)),
    );
  }

  private toLeadResponse(
    lead: Lead,
    relations: LeadRelations = {},
  ): LeadResponseDto {
    return {
      id: lead.id,
      tenant_id: lead.tenantId,
      contact_id: lead.contactId,
      listing_id: lead.listingId,
      user_id: lead.userId,
      stage: leadStageLabel(lead.stage),
      source_id: lead.source,
      source: leadSourceLabel(lead.source),
      is_active: lead.isActive,
      value: Number(lead.listingValue ?? 0),
      next_task: lead.nextTask,
      due_at: this.isoValue(lead.dueAt),
      ...(relations.contact === undefined
        ? {}
        : { contact: relations.contact }),
      ...(relations.listing === undefined
        ? {}
        : { listing: relations.listing }),
      ...(relations.user === undefined ? {} : { user: relations.user }),
      created_at: this.isoValue(lead.createdAt) ?? lead.createdAt,
    };
  }

  private async relations(
    tenantId: string,
    leads: Lead[],
    includes: LeadInclude[],
  ): Promise<Map<string, LeadRelations>> {
    const relationMap = new Map(leads.map((lead) => [lead.id, {}]));

    if (includes.length === 0 || leads.length === 0) {
      return relationMap;
    }

    if (includes.includes('contact')) {
      const contacts = await this.contactService.findContactsByIds(
        tenantId,
        leads.map((lead) => lead.contactId),
      );
      const contactById = new Map(
        contacts.map((contact) => [contact.id, contact]),
      );
      this.assignRelations(relationMap, leads, 'contact', (lead) =>
        contactById.get(lead.contactId),
      );
    }

    if (includes.includes('listing')) {
      const listings = await this.listingService.findListingsByIds(
        tenantId,
        leads.map((lead) => lead.listingId),
      );
      const listingById = new Map(
        listings.map((listing) => [listing.id, listing]),
      );
      this.assignRelations(relationMap, leads, 'listing', (lead) =>
        listingById.get(lead.listingId),
      );
    }

    if (includes.includes('user')) {
      const users = await this.userService.findMembersByIds(
        tenantId,
        leads.map((lead) => lead.userId),
      );
      const userById = new Map(users.map((user) => [user.id, user]));
      this.assignRelations(relationMap, leads, 'user', (lead) =>
        userById.get(lead.userId),
      );
    }

    return relationMap;
  }

  private assignRelations<K extends keyof LeadRelations>(
    relationMap: Map<string, LeadRelations>,
    leads: Lead[],
    key: K,
    valueFor: (lead: Lead) => LeadRelations[K] | undefined,
  ): void {
    for (const lead of leads) {
      const value = valueFor(lead);

      if (value !== undefined) {
        relationMap.set(lead.id, {
          ...(relationMap.get(lead.id) ?? {}),
          [key]: value,
        });
      }
    }
  }

  private includes(query: LeadQuery): LeadInclude[] {
    const requested = [
      ...this.values(query.include),
      ...this.values(query['include[]']),
    ];
    const includes: LeadInclude[] = [];

    for (const item of requested) {
      for (const relation of item.split(',')) {
        const include = relation.trim();

        if (
          ALLOWED_INCLUDES.includes(include as LeadInclude) &&
          !includes.includes(include as LeadInclude)
        ) {
          includes.push(include as LeadInclude);
        }
      }
    }

    return includes;
  }

  private filter(query: LeadQuery, key: string): string | undefined {
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
    key: LeadSortKey;
    requested: boolean;
  } {
    const sortableKeys: LeadSortKey[] = [
      'stage',
      'source',
      'value',
      'next_task',
      'due_at',
      'created_at',
    ];

    return value !== undefined && sortableKeys.includes(value as LeadSortKey)
      ? { key: value as LeadSortKey, requested: true }
      : { key: 'created_at', requested: false };
  }

  private sortDirection(
    value: string | undefined,
    hasRequestedSort: boolean,
  ): 'asc' | 'desc' {
    const normalizedDirection = value?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    return hasRequestedSort ? normalizedDirection : 'desc';
  }

  private can(actor: AuthenticatedUser, permission: string): boolean {
    return (
      actor.permissions.includes(Permissions.SYSTEM_BYPASS) ||
      actor.permissions.includes(permission)
    );
  }

  private hasAnyField(data: UpdateLeadDto, fields: string[]): boolean {
    return fields.some(
      (field) =>
        Object.prototype.hasOwnProperty.call(data, field) &&
        data[field as keyof UpdateLeadDto] !== undefined,
    );
  }

  private denyUnless(condition: boolean, message: string): void {
    if (!condition) {
      throw new ForbiddenException(message);
    }
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

  private pageUrl(baseUrl: string, query: LeadQuery, page: number): string {
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
    query: LeadQuery,
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
