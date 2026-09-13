export const MODEL_TYPE_USER = 'App\\Models\\User';
export const DEFAULT_GUARD_NAME = 'web';

export const Permissions = {
  SYSTEM_BYPASS: 'system.bypass',
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_MANAGE_SYSTEM: 'roles.manage_system',
  PERMISSIONS_VIEW: 'permissions.view',
  PERMISSIONS_CREATE: 'permissions.create',
  PERMISSIONS_UPDATE: 'permissions.update',
  PERMISSIONS_DELETE: 'permissions.delete',
  USERS_VIEW: 'users.view',
  USERS_ASSIGN_ROLES: 'users.assign_roles',
  USERS_ASSIGN_PERMISSIONS: 'users.assign_permissions',
  CONTACTS_VIEW: 'contacts.view',
  CONTACTS_CREATE: 'contacts.create',
  CONTACTS_UPDATE: 'contacts.update',
  CONTACTS_DELETE: 'contacts.delete',
  LISTINGS_VIEW: 'listings.view',
  LISTINGS_CREATE: 'listings.create',
  LISTINGS_UPDATE: 'listings.update',
  LEADS_VIEW: 'leads.view',
  LEADS_CREATE: 'leads.create',
  LEADS_UPDATE: 'leads.update',
  LEADS_CHANGE_ASSIGNEE: 'leads.change_assignee',
  LEADS_ASSIGN_TO_SELF: 'leads.assign_to_self',
  EMAIL_CAMPAIGNS_VIEW: 'email_campaigns.view',
  EMAIL_CAMPAIGNS_CREATE: 'email_campaigns.create',
  ACTIVITY_LOGS_VIEW: 'activity_logs.view',
  REPORTS_VIEW: 'reports.view',
  TENANT_VIEW: 'tenant.view',
  REFERENCES_VIEW: 'references.view',
  REFERENCES_CREATE: 'references.create',
  REFERENCES_UPDATE: 'references.update',
  REFERENCES_DELETE: 'references.delete',
  REFERENCES_MANAGE_SYSTEM: 'references.manage_system',
} as const;

export type PermissionName = (typeof Permissions)[keyof typeof Permissions];

export const allPermissions = (): PermissionName[] =>
  Object.values(Permissions);

export const systemOnlyPermissions = (): PermissionName[] => [
  Permissions.SYSTEM_BYPASS,
  Permissions.ROLES_MANAGE_SYSTEM,
  Permissions.PERMISSIONS_CREATE,
  Permissions.PERMISSIONS_UPDATE,
  Permissions.PERMISSIONS_DELETE,
  Permissions.REFERENCES_MANAGE_SYSTEM,
];

export const tenantAdminPermissions = (): PermissionName[] => {
  const systemOnly = new Set(systemOnlyPermissions());
  return allPermissions().filter((permission) => !systemOnly.has(permission));
};

export const Roles = {
  SYSTEM_ADMIN: 'System Admin',
  OFFICE_ADMIN: 'Office Admin',
  MASTER: 'Master',
  SALES: 'Sales',
  PROPERTY_MANAGER: 'Property Manager',
  SENIOR_AGENT: 'Senior Agent',
  SIMPLE_AGENT: 'Simple Agent',
  MARKETING_COORDINATOR: 'Marketing Coordinator',
  TRANSACTION_COORDINATOR: 'Transaction Coordinator',
} as const;

export type RoleName = (typeof Roles)[keyof typeof Roles];

export const defaultRolePermissions = (): Record<
  RoleName,
  PermissionName[]
> => ({
  [Roles.SYSTEM_ADMIN]: allPermissions(),
  [Roles.OFFICE_ADMIN]: tenantAdminPermissions(),
  [Roles.MASTER]: tenantAdminPermissions(),
  [Roles.SALES]: [
    Permissions.CONTACTS_VIEW,
    Permissions.CONTACTS_CREATE,
    Permissions.CONTACTS_UPDATE,
    Permissions.LISTINGS_VIEW,
    Permissions.LEADS_VIEW,
    Permissions.LEADS_CREATE,
    Permissions.LEADS_UPDATE,
    Permissions.LEADS_CHANGE_ASSIGNEE,
    Permissions.LEADS_ASSIGN_TO_SELF,
    Permissions.EMAIL_CAMPAIGNS_VIEW,
    Permissions.EMAIL_CAMPAIGNS_CREATE,
    Permissions.ACTIVITY_LOGS_VIEW,
    Permissions.REPORTS_VIEW,
    Permissions.TENANT_VIEW,
    Permissions.REFERENCES_VIEW,
  ],
  [Roles.PROPERTY_MANAGER]: [
    Permissions.CONTACTS_VIEW,
    Permissions.LISTINGS_VIEW,
    Permissions.LISTINGS_CREATE,
    Permissions.LISTINGS_UPDATE,
    Permissions.LEADS_VIEW,
    Permissions.ACTIVITY_LOGS_VIEW,
    Permissions.REPORTS_VIEW,
    Permissions.TENANT_VIEW,
    Permissions.REFERENCES_VIEW,
  ],
  [Roles.SENIOR_AGENT]: [
    Permissions.CONTACTS_VIEW,
    Permissions.CONTACTS_CREATE,
    Permissions.CONTACTS_UPDATE,
    Permissions.LISTINGS_VIEW,
    Permissions.LEADS_VIEW,
    Permissions.LEADS_CREATE,
    Permissions.LEADS_UPDATE,
    Permissions.LEADS_ASSIGN_TO_SELF,
    Permissions.ACTIVITY_LOGS_VIEW,
    Permissions.REPORTS_VIEW,
    Permissions.TENANT_VIEW,
    Permissions.REFERENCES_VIEW,
  ],
  [Roles.SIMPLE_AGENT]: [
    Permissions.CONTACTS_VIEW,
    Permissions.LISTINGS_VIEW,
    Permissions.LEADS_VIEW,
    Permissions.ACTIVITY_LOGS_VIEW,
    Permissions.TENANT_VIEW,
    Permissions.REFERENCES_VIEW,
  ],
  [Roles.MARKETING_COORDINATOR]: [
    Permissions.CONTACTS_VIEW,
    Permissions.EMAIL_CAMPAIGNS_VIEW,
    Permissions.EMAIL_CAMPAIGNS_CREATE,
    Permissions.ACTIVITY_LOGS_VIEW,
    Permissions.REPORTS_VIEW,
    Permissions.TENANT_VIEW,
    Permissions.REFERENCES_VIEW,
  ],
  [Roles.TRANSACTION_COORDINATOR]: [
    Permissions.CONTACTS_VIEW,
    Permissions.LISTINGS_VIEW,
    Permissions.LEADS_VIEW,
    Permissions.LEADS_UPDATE,
    Permissions.LEADS_ASSIGN_TO_SELF,
    Permissions.ACTIVITY_LOGS_VIEW,
    Permissions.REPORTS_VIEW,
    Permissions.TENANT_VIEW,
    Permissions.REFERENCES_VIEW,
  ],
});
