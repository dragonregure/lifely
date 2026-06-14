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

export type ContactStatus = "Active" | "Inactive";

export type ContactSource =
  | "Manual Entry"
  | "Website"
  | "Listing Inquiry"
  | "Social Media"
  | "Referral"
  | "Phone Call"
  | "Messaging"
  | "Email"
  | "Paid Ads"
  | "Portal"
  | "Exhibition"
  | "Integration"
  | "Walk-in"
  | "Open House"
  | "Developer Partner"
  | "Bulk Import";

export type ListingStatus = 1 | 2 | 3 | 4;

export type ListingType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export type LeadStage =
  | "New Lead"
  | "Contacted"
  | "Qualified"
  | "Viewing Scheduled"
  | "Viewed"
  | "Negotiating"
  | "Closed Won"
  | "Closed Lost"
  | "Dormant";

export type LeadSource =
  | "Manual Entry"
  | "Website"
  | "Listing Inquiry"
  | "Social Media"
  | "Referral"
  | "Phone Call"
  | "Messaging"
  | "Email"
  | "Paid Ads"
  | "Portal"
  | "Exhibition"
  | "Integration";

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
  status: ContactStatus;
  statusValue: boolean;
  budget: number;
  sourceId: number | null;
  source: ContactSource | "";
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

export type LeadDeal = {
  id: string;
  tenantId: string;
  contactId: string;
  listingId: string;
  userId: string;
  stage: LeadStage;
  sourceId: number;
  source: LeadSource;
  isActive: boolean;
  value: number;
  nextTask?: string | null;
  dueAt?: string | null;
  contact?: Contact | null;
  listing?: Listing | null;
  user?: User | null;
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
  listingId?: string | null;
  subject: string;
  recipientCount: number;
  status: "Draft" | "Queued" | "Sent";
  createdAt: string;
};

export type DashboardSummary = {
  newLeads: number;
  pendingTasks: number;
  leadValue: number;
  winRate: number;
  leadHealth: Array<{ label: ContactStatus; value: number }>;
  leadPerformance: Array<{ label: string; value: number }>;
  executive?: ReportingExecutiveMetrics;
  moduleDebt?: string[];
};

export type ReportingExecutiveMetrics = {
  totalActiveClients: number;
  newClients: number;
  totalVisits: number | null;
  completedVisits: number | null;
  missedVisits: number | null;
  cancelledVisits: number | null;
  activeCaregivers: number | null;
  caregiverUtilization: number | null;
  revenue: number;
  outstandingPayments: number | null;
  pipelineValue: number;
  clientSatisfactionScore: number | null;
};

export type ReportColumnType = "text" | "number" | "currency" | "date" | "datetime" | "list";

export type ReportDefinition = {
  key: string;
  category: string;
  name: string;
  description: string;
  implemented: boolean;
  columns: Array<{
    key: string;
    label: string;
    type: ReportColumnType;
    sortable: boolean;
  }>;
};

export type ReportRow = Record<string, string | number | null | string[]>;

export type ReportingOverview = {
  dashboard: DashboardSummary;
  reports: ReportDefinition[];
  exportFormats: Array<{
    key: string;
    label: string;
    implemented: boolean;
  }>;
};
