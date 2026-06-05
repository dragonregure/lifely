export const PERMISSIONS = {
  system: {
    bypass: "system.bypass",
  },
  roles: {
    view: "roles.view",
    create: "roles.create",
    update: "roles.update",
    delete: "roles.delete",
    manageSystem: "roles.manage_system",
  },
  permissions: {
    view: "permissions.view",
    create: "permissions.create",
    update: "permissions.update",
    delete: "permissions.delete",
  },
  users: {
    view: "users.view",
    assignRoles: "users.assign_roles",
    assignPermissions: "users.assign_permissions",
  },
  contacts: {
    view: "contacts.view",
    create: "contacts.create",
    update: "contacts.update",
    delete: "contacts.delete",
  },
  listings: {
    view: "listings.view",
    create: "listings.create",
    update: "listings.update",
  },
  pipeline: {
    view: "pipeline.view",
    create: "pipeline.create",
    update: "pipeline.update",
  },
  emailCampaigns: {
    view: "email_campaigns.view",
    create: "email_campaigns.create",
  },
  activityLogs: {
    view: "activity_logs.view",
  },
  reports: {
    view: "reports.view",
  },
  tenant: {
    view: "tenant.view",
  },
  references: {
    view: "references.view",
    create: "references.create",
    update: "references.update",
    delete: "references.delete",
    manageSystem: "references.manage_system",
  },
} as const;

type PermissionLeaf<T> = T extends string ? T : T extends Record<string, unknown> ? PermissionLeaf<T[keyof T]> : never;

export type PermissionName = PermissionLeaf<typeof PERMISSIONS>;

export const SETTINGS_PERMISSIONS = [
  PERMISSIONS.tenant.view,
  PERMISSIONS.users.view,
  PERMISSIONS.users.assignRoles,
  PERMISSIONS.users.assignPermissions,
  PERMISSIONS.roles.view,
  PERMISSIONS.permissions.view,
  PERMISSIONS.references.view,
] as const satisfies readonly PermissionName[];
