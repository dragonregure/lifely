import type {
  ActivityLog,
  ContactStatus,
  EmailCampaign,
  ListingStatus,
  ListingType,
  LeadSource,
  LeadStage,
  ReferenceValue,
  ReferenceStatus,
  ReferenceValueType,
  ActivityLogProperties,
  Role,
} from "@/types";

export type ApiEnvelope<T> = { data: T };

export type ApiPaginatedEnvelope<T> = {
  data: T[];
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
};

export type BackendTenant = {
  id: string;
  name: string;
  created_at?: string | null;
};

export type BackendUser = {
  id: string;
  tenant_id: string;
  role: Role;
  roles?: Role[];
  direct_permissions?: string[];
  permissions?: string[];
  name: string;
  email: string;
  tenant?: BackendTenant;
};

export type AuthPayload = {
  token_type: "Bearer";
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
  user: BackendUser;
};

export type BackendContact = {
  id: string;
  tenant_id: string;
  owner_id?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  status: boolean;
  status_label?: ContactStatus | null;
  budget?: number | null;
  source_id?: number | null;
  source?: string | null;
  last_contacted_at?: string | null;
  created_at?: string | null;
};

export type BackendDocument = {
  id: string;
  tenant_id: string;
  model: string;
  model_id: string;
  type: string;
  order: number;
  url: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BackendListing = {
  id: string;
  tenant_id: string;
  title: string;
  address: string;
  price: number;
  status: ListingStatus;
  bedrooms: number;
  bathrooms: number;
  property_type: ListingType;
  documents?: BackendDocument[];
  contacts?: BackendContact[];
  users?: Array<BackendUser & { is_primary_owner?: boolean | null }>;
};

export type BackendDeal = {
  id: string;
  tenant_id: string;
  contact_id: string;
  listing_id: string;
  user_id: string;
  stage: LeadStage;
  source_id: number;
  source: LeadSource;
  is_active: boolean;
  value: number;
  next_task?: string | null;
  due_at?: string | null;
  contact?: BackendContact | null;
  listing?: BackendListing | null;
  user?: BackendUser | null;
};

export type BackendActivity = {
  id: string;
  tenant_id: string;
  user_id?: string | null;
  user_name?: string | null;
  action_type: ActivityLog["actionType"];
  description: string;
  properties?: ActivityLogProperties | null;
  created_at?: string | null;
};

export type BackendCampaign = {
  id: string;
  tenant_id: string;
  user_id?: string | null;
  listing_id?: string | null;
  subject: string;
  recipient_count: number;
  status: EmailCampaign["status"];
  created_at?: string | null;
};

export type BackendDashboard = {
  new_leads: number;
  pending_tasks: number;
  lead_value: number;
  win_rate: number;
  lead_health: Array<{ label: ContactStatus; value: number }>;
  lead_by_stage: Array<{ stage: string; deals: number; value: number }>;
  executive?: {
    total_active_clients: number;
    new_clients: number;
    total_visits: number | null;
    completed_visits: number | null;
    missed_visits: number | null;
    cancelled_visits: number | null;
    active_caregivers: number | null;
    caregiver_utilization: number | null;
    revenue: number;
    outstanding_payments: number | null;
    pipeline_value: number;
    client_satisfaction_score: number | null;
  };
  module_debt?: string[];
};

export type BackendReportDefinition = {
  key: string;
  category: string;
  name: string;
  description: string;
  implemented: boolean;
  columns: Array<{
    key: string;
    label: string;
    type: "text" | "number" | "currency" | "date" | "datetime" | "list";
    sortable: boolean;
  }>;
};

export type BackendReportingOverview = {
  dashboard: BackendDashboard;
  reports: BackendReportDefinition[];
  export_formats: Array<{
    key: string;
    label: string;
    implemented: boolean;
  }>;
};

export type BackendPermission = {
  id: number;
  name: string;
  guard_name: string;
  roles?: BackendRole[];
};

export type BackendRole = {
  id: number;
  tenant_id: string | null;
  is_system: boolean;
  name: Role;
  guard_name: string;
  permissions?: BackendPermission[];
};

export type BackendUserAccess = {
  user_id: string;
  roles: Role[];
  direct_permissions: string[];
  permissions: string[];
};

export type BackendReference = {
  id: string;
  tenant_id: string | null;
  is_system: boolean;
  group: string;
  key: string;
  value: ReferenceValue;
  type: ReferenceValueType;
  meta: Record<string, unknown> | null;
  status: ReferenceStatus;
  created_at?: string | null;
  updated_at?: string | null;
};
