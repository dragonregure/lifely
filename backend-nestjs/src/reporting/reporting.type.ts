import { ActivityLog } from '../activity/activity.type.js';
import { Contact } from '../contact/contact.type.js';
import { Lead } from '../lead/lead.type.js';
import { Listing } from '../listing/listing.type.js';
import { User } from '../user/user.type.js';

export const ReportKeys = {
  CLIENT_SUMMARY: 'client-summary',
  CLIENT_ACTIVITY: 'client-activity',
  HIGH_RISK_CLIENTS: 'high-risk-clients',
  WORKFORCE_PERFORMANCE: 'workforce-performance',
  OPERATIONS_SERVICE_VOLUME: 'operations-service-volume',
  FINANCIAL_REVENUE: 'financial-revenue',
} as const;

export type ReportKey = (typeof ReportKeys)[keyof typeof ReportKeys];

export type ReportColumnType =
  'text' | 'number' | 'currency' | 'date' | 'datetime' | 'list';

export type ReportColumn = {
  key: string;
  label: string;
  type: ReportColumnType;
  sortable: boolean;
};

export type ReportDefinition = {
  key: ReportKey;
  category: string;
  name: string;
  description: string;
  implemented: boolean;
  columns: ReportColumn[];
};

export type ReportFilters = {
  date_from?: string;
  date_to?: string;
  owner_id?: string;
  source?: string;
  stage?: string;
  status?: string;
  risk_threshold_days?: string;
};

export type ReportingQuery = {
  page: number;
  perPage: number;
  search?: string;
  sort?: string;
  direction: 'asc' | 'desc';
  filters: ReportFilters;
};

export type ReportRow = Record<string, unknown> & {
  id: string;
};

export type ReportRowsResult = {
  data: ReportRow[];
  total: number;
};

export type ReportingSnapshot = {
  contacts: Contact[];
  leads: Lead[];
  listings: Listing[];
  users: User[];
  activityLogs: ActivityLog[];
};
