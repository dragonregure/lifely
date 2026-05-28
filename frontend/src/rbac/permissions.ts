export const PERMISSIONS = {
  roles: {
    view: "roles.view",
    create: "roles.create",
    update: "roles.update",
    delete: "roles.delete",
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
  },
  listings: {
    view: "listings.view",
    create: "listings.create",
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
] as const satisfies readonly PermissionName[];
