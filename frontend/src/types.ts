export type Role =
  | "System Admin"
  | "Office Admin"
  | "Master"
  | "Sales"
  | "Property Manager"
  | "Senior Agent"
  | "Simple Agent"
  | "Marketing Coordinator"
  | "Transaction Coordinator"
  | string;

export type Permission = {
  id: number;
  name: string;
  guardName: string;
};

export type AccessRole = {
  id: number;
  tenantId: string | null;
  isSystem: boolean;
  name: Role;
  guardName: string;
  permissions: Permission[];
};

export type UserAccess = {
  userId: string;
  roles: Role[];
  directPermissions: string[];
  permissions: string[];
};

export type ReferenceStatus = "ACTIVE" | "INACTIVE";

export type ReferenceValueType = "string" | "int" | "float" | "double" | "bool" | "array" | "object" | "null";

export type ReferenceValue = string | number | boolean | unknown[] | Record<string, unknown> | null;

export type Reference = {
  id: string;
  tenantId: string | null;
  isSystem: boolean;
  group: string;
  key: string;
  value: ReferenceValue;
  type: ReferenceValueType;
  meta: Record<string, unknown> | null;
  status: ReferenceStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ContactStatus = string;

export type ListingStatus = 1 | 2 | 3 | 4;

export type ListingType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export type PipelineStage = "New lead" | "Contacted" | "Viewing" | "Offer" | "Closing";

export type Tenant = {
  id: string;
  name: string;
  createdAt?: string | null;
  plan?: "Growth" | "Team";
};

export type User = {
  id: string;
  tenantId: string;
  role: Role;
  roles: Role[];
  directPermissions: string[];
  permissions: string[];
  name: string;
  email: string;
  avatarInitials: string;
};

export type Contact = {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  statusId?: string | null;
  status: ContactStatus;
  budget: number;
  source: string;
  ownerId: string;
  lastContactedAt: string;
};

export type ListingDocument = {
  id: string;
  tenantId: string;
  model: string;
  modelId: string;
  type: string;
  order: number;
  url: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ListingAgent = User & {
  isPrimaryOwner: boolean;
};

export type Listing = {
  id: string;
  tenantId: string;
  title: string;
  address: string;
  price: number;
  status: ListingStatus;
  bedrooms: number;
  bathrooms: number;
  type: ListingType;
  documents: ListingDocument[];
  contacts: Contact[];
  agents: ListingAgent[];
};

export type PipelineDeal = {
  id: string;
  tenantId: string;
  contactId: string;
  listingId: string;
  userId: string;
  stage: PipelineStage;
  value: number;
  nextTask?: string | null;
  dueAt?: string | null;
  contact?: Contact | null;
  listing?: Listing | null;
};

export type ActivityLogProperties = {
  subject_type?: string;
  subject_id?: string;
  attributes?: Record<string, unknown>;
  changes?: Record<string, { old: unknown; new: unknown }>;
} & Record<string, unknown>;

export type ActivityLog = {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  actionType: string;
  description: string;
  properties: ActivityLogProperties | null;
  createdAt: string;
};

export type EmailCampaign = {
  id: string;
  tenantId: string;
  subject: string;
  recipientCount: number;
  status: "Draft" | "Queued" | "Sent";
  createdAt: string;
};

export type DashboardSummary = {
  newLeads: number;
  pendingTasks: number;
  pipelineValue: number;
  winRate: number;
  leadHealth: Array<{ label: ContactStatus; value: number }>;
  pipelinePerformance: Array<{ label: string; value: number }>;
};
