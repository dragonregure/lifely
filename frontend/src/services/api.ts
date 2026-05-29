export { login, logout, register } from "@/services/authService";
export {
  getActivityLogs,
  getContacts,
  getEmailCampaigns,
  getListings,
  getPipelineDeals,
  getSession,
  sendBulkEmailDraft,
} from "@/services/crmService";
export { getDashboardSummary } from "@/services/reportingService";
export { createReference, deleteReference, getReferences, updateReference } from "@/services/referenceService";
export type { ReferencePayload } from "@/services/referenceService";
export {
  createPermission,
  createRole,
  deletePermission,
  deleteRole,
  getMyPermissions,
  getPermissions,
  getRoles,
  syncUserPermissions,
  syncUserRoles,
  updatePermission,
  updateRole,
} from "@/services/rbacService";
