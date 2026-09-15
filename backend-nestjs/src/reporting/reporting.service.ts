import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ActivityService } from '../activity/activity.service.js';
import { Contact } from '../contact/contact.type.js';
import {
  isClosedLeadStage,
  leadSourceFromInput,
  leadSourceLabel,
  leadStageFromInput,
  leadStageLabel,
  LeadStages,
} from '../lead/lead.constants.js';
import { Lead } from '../lead/lead.type.js';
import { Listing } from '../listing/listing.type.js';
import { User } from '../user/user.type.js';
import {
  DashboardResponseDto,
  ReportRowsEnvelopeDto,
  ReportingOverviewDto,
} from './reporting.dto.js';
import { ReportingRepository } from './reporting.repository.js';
import {
  ReportColumn,
  ReportDefinition,
  ReportFilters,
  ReportKey,
  ReportKeys,
  ReportRow,
  ReportRowsResult,
  ReportingQuery,
  ReportingSnapshot,
} from './reporting.type.js';

type RawQuery = Record<
  string,
  string | string[] | Record<string, unknown> | undefined
>;

type ExportResult = {
  filename: string;
  content: string;
};

const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    key: ReportKeys.CLIENT_SUMMARY,
    category: 'Client Reports',
    name: 'Client Summary Report',
    description:
      'Client/contact status, ownership, lead count, won work, and open pipeline value.',
    implemented: true,
    columns: [
      column('client', 'Client', 'text'),
      column('status', 'Status', 'text'),
      column('owner', 'Owner', 'text'),
      column('source', 'Source', 'text'),
      column('open_leads', 'Open Leads', 'number'),
      column('won_leads', 'Won Leads', 'number'),
      column('pipeline_value', 'Pipeline Value', 'currency'),
      column('last_contacted_at', 'Last Contact', 'date'),
    ],
  },
  {
    key: ReportKeys.CLIENT_ACTIVITY,
    category: 'Client Reports',
    name: 'Client Activity Report',
    description: 'Contact-related audit activity for the selected period.',
    implemented: true,
    columns: [
      column('action', 'Action', 'text'),
      column('description', 'Description', 'text'),
      column('user', 'User', 'text'),
      column('created_at', 'Time', 'datetime'),
    ],
  },
  {
    key: ReportKeys.HIGH_RISK_CLIENTS,
    category: 'Client Reports',
    name: 'High-Risk Client Report',
    description:
      'Clients with stale contact, inactive status, or overdue CRM tasks.',
    implemented: true,
    columns: [
      column('client', 'Client', 'text'),
      column('owner', 'Owner', 'text'),
      column('status', 'Status', 'text'),
      column('risk_reasons', 'Risk Reasons', 'list', false),
      column('open_leads', 'Open Leads', 'number'),
      column('last_contacted_at', 'Last Contact', 'date'),
    ],
  },
  {
    key: ReportKeys.WORKFORCE_PERFORMANCE,
    category: 'Caregiver Reports',
    name: 'Team Performance Report',
    description:
      'Current team member lead ownership, won work, CRM activity, and pipeline value.',
    implemented: true,
    columns: [
      column('member', 'Team Member', 'text'),
      column('role', 'Role', 'text'),
      column('assigned_leads', 'Assigned Leads', 'number'),
      column('active_leads', 'Active Leads', 'number'),
      column('won_leads', 'Won Leads', 'number'),
      column('activity_count', 'Activity Count', 'number'),
      column('pipeline_value', 'Pipeline Value', 'currency'),
    ],
  },
  {
    key: ReportKeys.OPERATIONS_SERVICE_VOLUME,
    category: 'Operations Reports',
    name: 'Service Volume Report',
    description:
      'Current lead volume by source and stage as the available operations proxy.',
    implemented: true,
    columns: [
      column('stage', 'Stage', 'text'),
      column('source', 'Source', 'text'),
      column('total_leads', 'Total Leads', 'number'),
      column('active_leads', 'Active Leads', 'number'),
      column('closed_won', 'Closed Won', 'number'),
      column('pipeline_value', 'Pipeline Value', 'currency'),
    ],
  },
  {
    key: ReportKeys.FINANCIAL_REVENUE,
    category: 'Financial Reports',
    name: 'Revenue Report',
    description:
      'Closed-won revenue and open pipeline values from leads and listings.',
    implemented: true,
    columns: [
      column('client', 'Client', 'text'),
      column('listing', 'Listing', 'text'),
      column('owner', 'Owner', 'text'),
      column('stage', 'Stage', 'text'),
      column('amount', 'Amount', 'currency'),
      column('recognition_status', 'Recognition', 'text'),
      column('created_at', 'Created', 'date'),
    ],
  },
];

const ALLOWED_FILTERS = [
  'date_from',
  'date_to',
  'owner_id',
  'source',
  'stage',
  'status',
  'risk_threshold_days',
] as const;

@Injectable()
export class ReportingService {
  constructor(
    private readonly reportingRepository: ReportingRepository,
    private readonly activityService: ActivityService,
  ) {}

  async overview(
    tenantId: string,
    query: RawQuery,
  ): Promise<ReportingOverviewDto> {
    const filters = this.queryFromRaw(query).filters;

    return {
      dashboard: await this.dashboard(tenantId, filters),
      reports: REPORT_DEFINITIONS,
      export_formats: [
        { key: 'csv', label: 'CSV', implemented: true },
        { key: 'xlsx', label: 'Excel', implemented: false },
        { key: 'pdf', label: 'PDF', implemented: false },
      ],
    };
  }

  dashboardFromQuery(
    tenantId: string,
    query: RawQuery,
  ): Promise<DashboardResponseDto> {
    return this.dashboard(tenantId, this.queryFromRaw(query).filters);
  }

  async dashboard(
    tenantId: string,
    filters: ReportFilters = {},
  ): Promise<DashboardResponseDto> {
    const snapshot = await this.reportingRepository.snapshot(tenantId);
    const contactsByStatus = this.countContactsByStatus(snapshot.contacts);
    const dateScopedLeads = this.dateScopedLeads(snapshot.leads, filters);
    const closedWonLeads = dateScopedLeads.filter(
      (lead) => lead.stage === LeadStages.CLOSED_WON,
    );
    const closedLostCount = dateScopedLeads.filter(
      (lead) => lead.stage === LeadStages.CLOSED_LOST,
    ).length;
    const closedTotal = closedWonLeads.length + closedLostCount;
    const winRate =
      closedTotal > 0
        ? Math.round((closedWonLeads.length / closedTotal) * 1000) / 10
        : 0;
    const listingsById = this.listingsById(snapshot.listings);
    const openLeads = dateScopedLeads.filter(
      (lead) => !isClosedLeadStage(lead.stage),
    );

    return {
      new_leads: contactsByStatus.get('Active') ?? 0,
      pending_tasks: snapshot.leads.filter((lead) => lead.nextTask !== null)
        .length,
      lead_value: this.distinctListingValue(snapshot.leads, listingsById),
      win_rate: winRate,
      lead_health: [...contactsByStatus.entries()].map(([label, value]) => ({
        label,
        value,
      })),
      lead_by_stage: this.valueByStage(snapshot.leads, listingsById),
      executive: {
        total_active_clients: snapshot.contacts.filter(
          (contact) => contact.status,
        ).length,
        new_clients: this.dateScopedContacts(snapshot.contacts, filters).length,
        total_visits: null,
        completed_visits: null,
        missed_visits: null,
        cancelled_visits: null,
        active_caregivers: null,
        caregiver_utilization: null,
        revenue: this.distinctListingValue(closedWonLeads, listingsById),
        outstanding_payments: null,
        pipeline_value: this.distinctListingValue(openLeads, listingsById),
        client_satisfaction_score: null,
      },
      available_filters: ['date_range', 'client', 'caregiver', 'service_type'],
      future_filters: ['branch', 'region'],
      module_debt: [
        'Visits, incidents, assessments, certifications, invoices, payments, satisfaction scores, branches, regions, saved report views, Excel export, and PDF export require backing modules before reporting can compute them truthfully.',
      ],
    };
  }

  definitions(): ReportDefinition[] {
    return REPORT_DEFINITIONS;
  }

  definition(reportKey: string): ReportDefinition | undefined {
    return REPORT_DEFINITIONS.find(
      (definition) => definition.key === reportKey,
    );
  }

  async rows(
    tenantId: string,
    reportKey: string,
    rawQuery: RawQuery,
  ): Promise<ReportRowsEnvelopeDto> {
    const query = this.queryFromRaw(rawQuery);
    const result = await this.reportRows(tenantId, reportKey, query);
    const pageCount = Math.max(1, Math.ceil(result.total / query.perPage));
    const start = (query.page - 1) * query.perPage;

    return {
      data: result.data,
      meta: {
        current_page: query.page,
        from: result.data.length > 0 ? start + 1 : null,
        last_page: pageCount,
        per_page: query.perPage,
        to: result.data.length > 0 ? start + result.data.length : null,
        total: result.total,
      },
    };
  }

  async exportCsv(
    tenantId: string,
    userId: string | null,
    reportKey: string,
    rawQuery: RawQuery,
  ): Promise<ExportResult> {
    const definition = this.requireDefinition(reportKey);
    const format = this.single(rawQuery.format)?.toLowerCase() ?? 'csv';

    if (format !== 'csv') {
      throw new UnprocessableEntityException(
        'Only CSV export is available until Excel and PDF export pipelines are implemented.',
      );
    }

    const query = {
      ...this.queryFromRaw(rawQuery),
      page: 1,
      perPage: 1000,
    };
    const result = await this.reportRows(tenantId, reportKey, query);
    const columns = definition.columns.map(({ key, label }) => ({
      key,
      label,
    }));

    await this.activityService.recordReportExported(
      tenantId,
      userId,
      definition.name,
      {
        report_key: reportKey,
        format,
        filters: query.filters,
        rows: result.data.length,
      },
    );

    return {
      filename: `${reportKey}-${this.timestamp()}.csv`,
      content: this.csv(result.data, columns),
    };
  }

  private async reportRows(
    tenantId: string,
    reportKey: string,
    query: ReportingQuery,
  ): Promise<ReportRowsResult> {
    this.requireDefinition(reportKey);

    const snapshot = await this.reportingRepository.snapshot(tenantId);
    const rows = this.rowsForReport(
      reportKey as ReportKey,
      snapshot,
      query.filters,
    );
    const filtered = this.searchRows(rows, query.search);
    const sorted = this.sortRows(filtered, query, reportKey as ReportKey);
    const start = (query.page - 1) * query.perPage;

    return {
      data: sorted.slice(start, start + query.perPage),
      total: sorted.length,
    };
  }

  private rowsForReport(
    reportKey: ReportKey,
    snapshot: ReportingSnapshot,
    filters: ReportFilters,
  ): ReportRow[] {
    switch (reportKey) {
      case ReportKeys.CLIENT_SUMMARY:
        return this.clientSummary(snapshot, filters);
      case ReportKeys.CLIENT_ACTIVITY:
        return this.clientActivity(snapshot, filters);
      case ReportKeys.HIGH_RISK_CLIENTS:
        return this.highRiskClients(snapshot, filters);
      case ReportKeys.WORKFORCE_PERFORMANCE:
        return this.workforcePerformance(snapshot, filters);
      case ReportKeys.OPERATIONS_SERVICE_VOLUME:
        return this.operationsServiceVolume(snapshot, filters);
      case ReportKeys.FINANCIAL_REVENUE:
        return this.financialRevenue(snapshot, filters);
    }
  }

  private clientSummary(
    snapshot: ReportingSnapshot,
    filters: ReportFilters,
  ): ReportRow[] {
    const leadsByContactId = this.groupLeadsByContact(snapshot.leads);
    const listingsById = this.listingsById(snapshot.listings);
    const usersById = this.usersById(snapshot.users);
    const status = this.statusFilter(filters.status);
    const sources = this.contactSourceFilter(filters.source);
    const ownerIds = this.csvFilter(filters.owner_id);

    return this.dateScopedContacts(snapshot.contacts, filters)
      .filter(
        (contact) =>
          (status === null || contact.status === status) &&
          (sources.length === 0 ||
            (contact.source !== null && sources.includes(contact.source))) &&
          (ownerIds.length === 0 ||
            (contact.ownerId !== null && ownerIds.includes(contact.ownerId))),
      )
      .map((contact) => {
        const leads = leadsByContactId.get(contact.id) ?? [];

        return {
          id: contact.id,
          client: this.contactName(contact),
          email: contact.email,
          status: contact.status ? 'Active' : 'Inactive',
          owner: this.ownerName(contact.ownerId, usersById),
          source: contactSourceLabel(contact.source) ?? 'Unknown',
          open_leads: leads.filter((lead) => !isClosedLeadStage(lead.stage))
            .length,
          won_leads: leads.filter(
            (lead) => lead.stage === LeadStages.CLOSED_WON,
          ).length,
          pipeline_value: this.distinctListingValue(
            leads.filter((lead) => !isClosedLeadStage(lead.stage)),
            listingsById,
          ),
          last_contacted_at: this.dateString(contact.lastContactedAt),
          created_at: this.dateString(contact.createdAt),
        };
      });
  }

  private clientActivity(
    snapshot: ReportingSnapshot,
    filters: ReportFilters,
  ): ReportRow[] {
    const usersById = this.usersById(snapshot.users);

    return snapshot.activityLogs
      .filter(
        (activityLog) =>
          activityLog.actionType.startsWith('contact.') &&
          this.inDateRange(activityLog.createdAt, filters),
      )
      .filter((activityLog) => {
        const userIds = this.csvFilter(filters.owner_id);

        return (
          userIds.length === 0 ||
          (activityLog.userId !== null && userIds.includes(activityLog.userId))
        );
      })
      .map((activityLog) => ({
        id: activityLog.id,
        action: activityLog.actionType,
        description: activityLog.description,
        user: this.ownerName(activityLog.userId, usersById, 'System'),
        created_at: this.isoValue(activityLog.createdAt),
      }));
  }

  private highRiskClients(
    snapshot: ReportingSnapshot,
    filters: ReportFilters,
  ): ReportRow[] {
    const thresholdDays = Math.max(
      1,
      Math.min(
        365,
        Number.parseInt(filters.risk_threshold_days ?? '30', 10) || 30,
      ),
    );
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);
    const leadsByContactId = this.groupLeadsByContact(snapshot.leads);
    const usersById = this.usersById(snapshot.users);
    const status = this.statusFilter(filters.status);
    const sources = this.contactSourceFilter(filters.source);
    const ownerIds = this.csvFilter(filters.owner_id);

    return this.dateScopedContacts(snapshot.contacts, filters)
      .filter(
        (contact) =>
          (status === null || contact.status === status) &&
          (sources.length === 0 ||
            (contact.source !== null && sources.includes(contact.source))) &&
          (ownerIds.length === 0 ||
            (contact.ownerId !== null && ownerIds.includes(contact.ownerId))),
      )
      .map((contact) => {
        const leads = leadsByContactId.get(contact.id) ?? [];
        const openLeadCount = leads.filter(
          (lead) => !isClosedLeadStage(lead.stage),
        ).length;
        const row = {
          id: contact.id,
          client: this.contactName(contact),
          email: contact.email,
          owner: this.ownerName(contact.ownerId, usersById),
          status: contact.status ? 'Active' : 'Inactive',
          risk_reasons: this.riskReasons(contact, openLeadCount, thresholdDate),
          open_leads: openLeadCount,
          last_contacted_at: this.dateString(contact.lastContactedAt),
        };

        return row;
      })
      .filter((row) => row.risk_reasons.length > 0);
  }

  private workforcePerformance(
    snapshot: ReportingSnapshot,
    filters: ReportFilters,
  ): ReportRow[] {
    const listingsById = this.listingsById(snapshot.listings);

    return snapshot.users.map((user) => {
      const leads = this.dateScopedLeads(snapshot.leads, filters).filter(
        (lead) => lead.userId === user.id,
      );
      const activityCount = snapshot.activityLogs.filter(
        (activityLog) =>
          activityLog.userId === user.id &&
          this.inDateRange(activityLog.createdAt, filters),
      ).length;

      return {
        id: user.id,
        member: user.name,
        email: user.email,
        role: user.role,
        assigned_leads: leads.length,
        active_leads: leads.filter((lead) => lead.isActive).length,
        won_leads: leads.filter((lead) => lead.stage === LeadStages.CLOSED_WON)
          .length,
        activity_count: activityCount,
        pipeline_value: this.distinctListingValue(
          leads.filter((lead) => !isClosedLeadStage(lead.stage)),
          listingsById,
        ),
      };
    });
  }

  private operationsServiceVolume(
    snapshot: ReportingSnapshot,
    filters: ReportFilters,
  ): ReportRow[] {
    const listingsById = this.listingsById(snapshot.listings);
    const grouped = new Map<string, Lead[]>();

    for (const lead of this.filteredLeads(snapshot.leads, filters)) {
      const key = `${lead.stage}:${lead.source}`;
      grouped.set(key, [...(grouped.get(key) ?? []), lead]);
    }

    return [...grouped.entries()].map(([key, leads]) => {
      const [stage, source] = key.split(':').map(Number);

      return {
        id: `${stage}-${source}`,
        stage: leadStageLabel(stage),
        source: leadSourceLabel(source),
        total_leads: leads.length,
        active_leads: leads.filter((lead) => lead.isActive).length,
        closed_won: leads.filter((lead) => lead.stage === LeadStages.CLOSED_WON)
          .length,
        pipeline_value: this.distinctListingValue(
          leads.filter((lead) => !isClosedLeadStage(lead.stage)),
          listingsById,
        ),
      };
    });
  }

  private financialRevenue(
    snapshot: ReportingSnapshot,
    filters: ReportFilters,
  ): ReportRow[] {
    const contactsById = this.contactsById(snapshot.contacts);
    const listingsById = this.listingsById(snapshot.listings);
    const usersById = this.usersById(snapshot.users);
    const rows: ReportRow[] = [];

    for (const lead of this.filteredLeads(snapshot.leads, filters)) {
      const contact = contactsById.get(lead.contactId);
      const listing = listingsById.get(lead.listingId);

      if (!contact || !listing) {
        continue;
      }

      rows.push({
        id: lead.id,
        client: this.contactName(contact),
        listing: listing.title,
        owner: this.ownerName(lead.userId, usersById),
        stage: leadStageLabel(lead.stage),
        amount: Number(listing.price),
        recognition_status:
          lead.stage === LeadStages.CLOSED_WON
            ? 'Recognized Revenue'
            : 'Open Pipeline',
        created_at: this.dateString(lead.createdAt),
      });
    }

    return rows;
  }

  private filteredLeads(leads: Lead[], filters: ReportFilters): Lead[] {
    const stage = leadStageFromInput(filters.stage);
    const sources = this.leadSourceFilter(filters.source);
    const ownerIds = this.csvFilter(filters.owner_id);

    return this.dateScopedLeads(leads, filters).filter(
      (lead) =>
        (stage === null || lead.stage === stage) &&
        (sources.length === 0 || sources.includes(lead.source)) &&
        (ownerIds.length === 0 || ownerIds.includes(lead.userId)),
    );
  }

  private queryFromRaw(query: RawQuery): ReportingQuery {
    return {
      page: this.positiveInt(this.single(query.page), 1),
      perPage: Math.min(this.positiveInt(this.single(query.per_page), 15), 100),
      search: this.nonEmpty(this.single(query.search)),
      sort: this.nonEmpty(this.single(query.sort)),
      direction:
        this.single(query.direction)?.toLowerCase() === 'asc' ? 'asc' : 'desc',
      filters: this.filters(query),
    };
  }

  private filters(query: RawQuery): ReportFilters {
    const nested = query.filter;
    const filterBag =
      nested && typeof nested === 'object' && !Array.isArray(nested)
        ? nested
        : {};
    const filters: ReportFilters = {};

    for (const key of ALLOWED_FILTERS) {
      const value =
        this.single(filterBag[key]) ??
        this.single(query[`filter[${key}]`]) ??
        this.single(query[key]);
      const normalized = this.nonEmpty(value);

      if (normalized !== undefined && normalized !== 'all') {
        filters[key] = normalized;
      }
    }

    return filters;
  }

  private requireDefinition(reportKey: string): ReportDefinition {
    const definition = this.definition(reportKey);

    if (!definition) {
      throw new NotFoundException('Report not found.');
    }

    return definition;
  }

  private searchRows(rows: ReportRow[], search?: string): ReportRow[] {
    const needle = search?.trim().toLowerCase();

    if (!needle) {
      return rows;
    }

    return rows.filter((row) =>
      Object.values(row).join(' ').toLowerCase().includes(needle),
    );
  }

  private sortRows(
    rows: ReportRow[],
    query: ReportingQuery,
    reportKey: ReportKey,
  ): ReportRow[] {
    const sort = this.sortKey(query.sort, reportKey);
    const multiplier = query.direction === 'desc' ? -1 : 1;

    return [...rows].sort((left, right) => {
      const leftValue = left[sort];
      const rightValue = right[sort];

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * multiplier;
      }

      return (
        this.textValue(leftValue)
          .toLowerCase()
          .localeCompare(this.textValue(rightValue).toLowerCase()) * multiplier
      );
    });
  }

  private sortKey(sort: string | undefined, reportKey: ReportKey): string {
    const definition = this.requireDefinition(reportKey);
    const sortableKeys = definition.columns
      .filter((item) => item.sortable)
      .map((item) => item.key);

    if (sort !== undefined && sortableKeys.includes(sort)) {
      return sort;
    }

    const defaults: Record<ReportKey, string> = {
      [ReportKeys.CLIENT_SUMMARY]: 'created_at',
      [ReportKeys.CLIENT_ACTIVITY]: 'created_at',
      [ReportKeys.HIGH_RISK_CLIENTS]: 'last_contacted_at',
      [ReportKeys.WORKFORCE_PERFORMANCE]: 'member',
      [ReportKeys.OPERATIONS_SERVICE_VOLUME]: 'total_leads',
      [ReportKeys.FINANCIAL_REVENUE]: 'created_at',
    };

    return defaults[reportKey];
  }

  private dateScopedContacts(
    contacts: Contact[],
    filters: ReportFilters,
  ): Contact[] {
    return contacts.filter((contact) =>
      this.inDateRange(contact.createdAt, filters),
    );
  }

  private dateScopedLeads(leads: Lead[], filters: ReportFilters): Lead[] {
    return leads.filter((lead) => this.inDateRange(lead.createdAt, filters));
  }

  private inDateRange(value: string | null, filters: ReportFilters): boolean {
    if (value === null) {
      return false;
    }

    const date = new Date(value).getTime();
    const from = this.startOfDay(filters.date_from);
    const to = this.endOfDay(filters.date_to);

    return (from === null || date >= from) && (to === null || date <= to);
  }

  private startOfDay(value?: string): number | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    date.setHours(0, 0, 0, 0);

    return date.getTime();
  }

  private endOfDay(value?: string): number | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    date.setHours(23, 59, 59, 999);

    return date.getTime();
  }

  private countContactsByStatus(contacts: Contact[]): Map<string, number> {
    const counts = new Map<string, number>();

    for (const contact of contacts) {
      const label = contact.status ? 'Active' : 'Inactive';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return counts;
  }

  private valueByStage(
    leads: Lead[],
    listingsById: Map<string, Listing>,
  ): DashboardResponseDto['lead_by_stage'] {
    const grouped = new Map<number, Lead[]>();

    for (const lead of leads) {
      grouped.set(lead.stage, [...(grouped.get(lead.stage) ?? []), lead]);
    }

    return [...grouped.entries()].map(([stage, stageLeads]) => ({
      stage: leadStageLabel(stage),
      deals: stageLeads.length,
      value: this.distinctListingValue(stageLeads, listingsById),
    }));
  }

  private distinctListingValue(
    leads: Lead[],
    listingsById: Map<string, Listing>,
  ): number {
    const listingIds = new Set(leads.map((lead) => lead.listingId));

    return [...listingIds].reduce(
      (sum, listingId) => sum + Number(listingsById.get(listingId)?.price ?? 0),
      0,
    );
  }

  private riskReasons(
    contact: Contact,
    openLeadCount: number,
    thresholdDate: Date,
  ): string[] {
    const reasons: string[] = [];

    if (!contact.status) {
      reasons.push('Inactive client');
    }

    if (contact.lastContactedAt === null) {
      reasons.push('No recorded contact');
    } else if (
      new Date(contact.lastContactedAt).getTime() <= thresholdDate.getTime()
    ) {
      reasons.push('No recent contact');
    }

    if (openLeadCount > 0) {
      reasons.push('Open service pipeline');
    }

    return reasons;
  }

  private groupLeadsByContact(leads: Lead[]): Map<string, Lead[]> {
    const grouped = new Map<string, Lead[]>();

    for (const lead of leads) {
      grouped.set(lead.contactId, [
        ...(grouped.get(lead.contactId) ?? []),
        lead,
      ]);
    }

    return grouped;
  }

  private contactsById(contacts: Contact[]): Map<string, Contact> {
    return new Map(contacts.map((contact) => [contact.id, contact]));
  }

  private listingsById(listings: Listing[]): Map<string, Listing> {
    return new Map(listings.map((listing) => [listing.id, listing]));
  }

  private usersById(users: User[]): Map<string, User> {
    return new Map(users.map((user) => [user.id, user]));
  }

  private ownerName(
    userId: string | null,
    usersById: Map<string, User>,
    fallback = 'Unassigned',
  ): string {
    return userId === null
      ? fallback
      : (usersById.get(userId)?.name ?? fallback);
  }

  private contactName(contact: Contact): string {
    return `${contact.firstName} ${contact.lastName}`.trim();
  }

  private leadSourceFilter(value?: string): number[] {
    return this.csvFilter(value)
      .map((item) => leadSourceFromInput(item))
      .filter((item): item is number => item !== null);
  }

  private contactSourceFilter(value?: string): number[] {
    return this.csvFilter(value)
      .map((item) => contactSourceFromInput(item))
      .filter((item): item is number => item !== null);
  }

  private statusFilter(value?: string): boolean | null {
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

  private csvFilter(value?: string): string[] {
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

  private csv(
    rows: ReportRow[],
    columns: Array<{ key: string; label: string }>,
  ): string {
    const lines = [
      columns.map((column) => this.csvCell(column.label)).join(','),
      ...rows.map((row) =>
        columns.map((column) => this.csvCell(row[column.key])).join(','),
      ),
    ];

    return `${lines.join('\n')}\n`;
  }

  private csvCell(value: unknown): string {
    const normalized = Array.isArray(value)
      ? value.join('; ')
      : value === null || value === undefined
        ? ''
        : this.textValue(value);

    return `"${normalized.replace(/"/g, '""')}"`;
  }

  private textValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString();
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

  private timestamp(): string {
    return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
  }

  private dateString(value: string | null): string | null {
    return value === null ? null : new Date(value).toISOString().slice(0, 10);
  }

  private isoValue(value: string | null): string | null {
    return value === null ? null : new Date(value).toISOString();
  }

  private nonEmpty(value: string | undefined): string | undefined {
    return value !== undefined && value.trim() !== ''
      ? value.trim()
      : undefined;
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
}

function column(
  key: string,
  label: string,
  type: ReportColumn['type'],
  sortable = true,
): ReportColumn {
  return { key, label, type, sortable };
}

const CONTACT_SOURCE_LABELS = {
  0: 'Manual Entry',
  1: 'Website',
  2: 'Listing Inquiry',
  3: 'Social Media',
  4: 'Referral',
  5: 'Phone Call',
  6: 'Messaging',
  7: 'Email',
  8: 'Paid Ads',
  9: 'Portal',
  10: 'Exhibition',
  11: 'Integration',
  12: 'Walk-in',
  13: 'Open House',
  14: 'Developer Partner',
  15: 'Bulk Import',
} as const;

function contactSourceLabel(source: number | null): string | null {
  if (source === null) {
    return null;
  }

  return (
    CONTACT_SOURCE_LABELS[source as keyof typeof CONTACT_SOURCE_LABELS] ??
    CONTACT_SOURCE_LABELS[0]
  );
}

function contactSourceFromInput(source: string): number | null {
  const normalized = source.trim().toLowerCase().replace(/\s+/g, ' ');

  if (normalized === '') {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    const sourceValue = Number.parseInt(normalized, 10);

    return sourceValue in CONTACT_SOURCE_LABELS ? sourceValue : null;
  }

  const match = Object.entries(CONTACT_SOURCE_LABELS).find(
    ([, label]) => label.toLowerCase() === normalized,
  );

  return match ? Number.parseInt(match[0], 10) : null;
}
