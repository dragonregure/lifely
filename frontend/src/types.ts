export type Role =
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

export type ContactStatus = "New" | "Qualified" | "Viewing" | "Negotiating" | "Closed" | "Dormant";

export type ListingStatus = "Available" | "Reserved" | "Under Contract" | "Sold";

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
  status: ContactStatus;
  budget: number;
  source: string;
  ownerId: string;
  lastContactedAt: string;
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
  type: "House" | "Condo" | "Townhome" | "Land";
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

export type ActivityLog = {
  id: string;
  tenantId: string;
  userId: string;
  actionType: string;
  description: string;
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
