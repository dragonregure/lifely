import type {
  ActivityLog,
  ContactStatus,
  EmailCampaign,
  ListingStatus,
  ListingType,
  PipelineStage,
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
  status_id?: string | null;
  status: ContactStatus;
  budget?: number | null;
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
  stage: PipelineStage;
  value: number;
  next_task?: string | null;
  due_at?: string | null;
  contact?: BackendContact | null;
  listing?: BackendListing | null;
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
  subject: string;
  recipient_count: number;
  status: EmailCampaign["status"];
  created_at?: string | null;
};

export type BackendDashboard = {
  new_leads: number;
  pending_tasks: number;
  pipeline_value: number;
  win_rate: number;
  lead_health: Array<{ label: ContactStatus; value: number }>;
  pipeline_by_stage: Array<{ stage: string; deals: number; value: number }>;
};

export type BackendPermission = {
  id: number;
  name: string;
  guard_name: string;
};

export type BackendRole = {
  id: number;
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
