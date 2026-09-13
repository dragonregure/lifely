export type TenantSummary = {
  id: string;
  name: string;
  created_at?: string;
};

export type AuthenticatedUser = {
  id: string;
  tenant_id: string;
  role: string;
  roles: string[];
  permissions: string[];
  name: string;
  email: string;
  tenant?: TenantSummary;
};

export type UserAccess = {
  roles: string[];
  directPermissions: string[];
  rolePermissions: string[];
};
