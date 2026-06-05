export { login, logout, register } from "@/services/authService";
export {
  createListing,
  createContact,
  deleteContact,
  getActivityLogs,
  getActivityLogsPage,
  getContacts,
  getContactsPage,
  getEmailCampaigns,
  getEmailCampaignsPage,
  getListing,
  getListings,
  getListingsPage,
  getMembers,
  getMembersPage,
  getPipelineDeals,
  getPipelineDealsPage,
  getSession,
  sendBulkEmailDraft,
  updateContact,
  updateListing,
  updatePipelineDeal,
} from "@/services/crmService";
export type { ContactPayload, ListingInclude, ListingPayload, PipelineDealPayload } from "@/services/crmService";
export { getDashboardSummary } from "@/services/reportingService";
export {
  createReference,
  deleteReference,
  getContactStatusOptions,
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
  getRole,
  getMyPermissions,
  getPermissions,
  getRoles,
  syncUserPermissions,
  syncUserRoles,
  updatePermission,
  updateRole,
} from "@/services/rbacService";
export type { PermissionInclude, RoleInclude } from "@/services/rbacService";
