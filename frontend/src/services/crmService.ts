import type {
  ApiEnvelope,
  ApiPaginatedEnvelope,
  BackendActivity,
  BackendCampaign,
  BackendContact,
  BackendDeal,
  BackendListing,
  BackendTenant,
  BackendUser,
  BackendUserAccess,
} from "@/services/backendTypes";
import type { PaginatedResult, ServerDataTableParams } from "@/services/dataTableParams";
import { toQueryString } from "@/services/dataTableParams";
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
  return (await getContactsPage({ page: 1, pageSize: 100 })).data;
}

export async function getContactsPage(
  params?: ServerDataTableParams,
  options: Pick<RequestInit, "signal"> = {},
): Promise<PaginatedResult<ReturnType<typeof mapContact>>> {
  const response = await apiRequest<ApiPaginatedEnvelope<BackendContact>>(`/contacts?${toQueryString(params)}`, options);

  return {
    data: response.data.map(mapContact),
    page: response.meta.current_page,
    pageSize: response.meta.per_page,
    pageCount: response.meta.last_page,
    total: response.meta.total,
  };
}

export async function getListings() {
  return (await getListingsPage({ page: 1, pageSize: 100 })).data;
}

export async function getListingsPage(
  params?: ServerDataTableParams,
  options: Pick<RequestInit, "signal"> = {},
): Promise<PaginatedResult<ReturnType<typeof mapListing>>> {
  const response = await apiRequest<ApiPaginatedEnvelope<BackendListing>>(`/listings?${toQueryString(params)}`, options);

  return {
    data: response.data.map(mapListing),
    page: response.meta.current_page,
    pageSize: response.meta.per_page,
    pageCount: response.meta.last_page,
    total: response.meta.total,
  };
}

export async function getPipelineDeals() {
  return (await getPipelineDealsPage({ page: 1, pageSize: 100 })).data;
}

export async function getPipelineDealsPage(
  params?: ServerDataTableParams,
  options: Pick<RequestInit, "signal"> = {},
): Promise<PaginatedResult<ReturnType<typeof mapDeal>>> {
  const response = await apiRequest<ApiPaginatedEnvelope<BackendDeal>>(`/pipeline?${toQueryString(params)}`, options);

  return {
    data: response.data.map(mapDeal),
    page: response.meta.current_page,
    pageSize: response.meta.per_page,
    pageCount: response.meta.last_page,
    total: response.meta.total,
  };
}

export async function getActivityLogs() {
  return (await getActivityLogsPage({ page: 1, pageSize: 100 })).data;
}

export async function getActivityLogsPage(
  params?: ServerDataTableParams,
  options: Pick<RequestInit, "signal"> = {},
): Promise<PaginatedResult<ReturnType<typeof mapActivity>>> {
  const response = await apiRequest<ApiPaginatedEnvelope<BackendActivity>>(`/activity-logs?${toQueryString(params)}`, options);

  return {
    data: response.data.map(mapActivity),
    page: response.meta.current_page,
    pageSize: response.meta.per_page,
    pageCount: response.meta.last_page,
    total: response.meta.total,
  };
}

export async function getEmailCampaigns() {
  return (await getEmailCampaignsPage({ page: 1, pageSize: 100 })).data;
}

export async function getEmailCampaignsPage(
  params?: ServerDataTableParams,
  options: Pick<RequestInit, "signal"> = {},
): Promise<PaginatedResult<ReturnType<typeof mapCampaign>>> {
  const response = await apiRequest<ApiPaginatedEnvelope<BackendCampaign>>(`/email-campaigns?${toQueryString(params)}`, options);

  return {
    data: response.data.map(mapCampaign),
    page: response.meta.current_page,
    pageSize: response.meta.per_page,
    pageCount: response.meta.last_page,
    total: response.meta.total,
  };
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
