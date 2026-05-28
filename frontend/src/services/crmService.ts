import type {
  ApiEnvelope,
  BackendActivity,
  BackendCampaign,
  BackendContact,
  BackendDeal,
  BackendListing,
  BackendTenant,
  BackendUser,
  BackendUserAccess,
} from "@/services/backendTypes";
import { apiRequest } from "@/services/httpClient";
import { mapActivity, mapCampaign, mapContact, mapDeal, mapListing, mapTenant, mapUser, mapUserAccess } from "@/services/mappers";

export async function getSession() {
  const [me, members, access] = await Promise.all([
    apiRequest<ApiEnvelope<{ user: BackendUser }>>("/auth/me"),
    apiRequest<ApiEnvelope<BackendUser[]>>("/members"),
    apiRequest<ApiEnvelope<BackendUserAccess>>("/me/permissions"),
  ]);

  const tenant = me.data.user.tenant
    ? me.data.user.tenant
    : (await apiRequest<ApiEnvelope<BackendTenant>>("/tenant")).data;
  const userAccess = mapUserAccess(access.data);

  return {
    tenant: mapTenant(tenant),
    user: {
      ...mapUser(me.data.user),
      roles: userAccess.roles,
      directPermissions: userAccess.directPermissions,
      permissions: userAccess.permissions,
    },
    members: members.data.map(mapUser),
  };
}

export async function getContacts() {
  const response = await apiRequest<ApiEnvelope<BackendContact[]>>("/contacts");
  return response.data.map(mapContact);
}

export async function getListings() {
  const response = await apiRequest<ApiEnvelope<BackendListing[]>>("/listings");
  return response.data.map(mapListing);
}

export async function getPipelineDeals() {
  const response = await apiRequest<ApiEnvelope<BackendDeal[]>>("/pipeline");
  return response.data.map(mapDeal);
}

export async function getActivityLogs() {
  const response = await apiRequest<ApiEnvelope<BackendActivity[]>>("/activity-logs");
  return response.data.map(mapActivity);
}

export async function getEmailCampaigns() {
  const response = await apiRequest<ApiEnvelope<BackendCampaign[]>>("/email-campaigns");
  return response.data.map(mapCampaign);
}

export async function sendBulkEmailDraft(payload: { contactIds: string[]; subject: string; body: string }) {
  const response = await apiRequest<ApiEnvelope<BackendCampaign>>("/bulk-emails", {
    method: "POST",
    body: JSON.stringify({
      contact_ids: payload.contactIds,
      subject: payload.subject,
      body: payload.body,
    }),
  });

  return mapCampaign(response.data);
}
