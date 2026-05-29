export { login, logout, register } from "@/services/authService";
export {
  createContact,
  deleteContact,
  getActivityLogs,
  getActivityLogsPage,
  getContacts,
  getContactsPage,
  getEmailCampaigns,
  getEmailCampaignsPage,
  getListings,
  getListingsPage,
  getPipelineDeals,
  getPipelineDealsPage,
  getSession,
  sendBulkEmailDraft,
  updateContact,
} from "@/services/crmService";
export type { ContactPayload } from "@/services/crmService";
export { getDashboardSummary } from "@/services/reportingService";
export {
  createReference,
  deleteReference,
  getReferenceGroupOptions,
  getReferences,
  getReferencesPage,
  getReferenceTypeOptions,
  updateReference,
} from "@/services/referenceService";
export type { ReferenceOption, ReferencePayload, ReferenceTypeOption } from "@/services/referenceService";
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
