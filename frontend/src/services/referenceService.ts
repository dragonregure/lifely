import type { ApiEnvelope, ApiPaginatedEnvelope, BackendReference } from "@/services/backendTypes";
import type { PaginatedResult, ServerDataTableParams } from "@/services/dataTableParams";
import { toQueryString } from "@/services/dataTableParams";
import { apiRequest } from "@/services/httpClient";
import { mapReference } from "@/services/mappers";
import type { ReferenceStatus, ReferenceValueType } from "@/types";

export type ReferencePayload = {
  tenantId?: string | null;
  group: string;
  key: string;
  value?: string | null;
  type?: ReferenceValueType;
  meta?: Record<string, unknown> | null;
  status?: ReferenceStatus;
};

export type ReferenceOption = {
  label: string;
  value: string;
};

export type ReferenceTypeOption = ReferenceOption;

const ALL_PAGE_SIZE = 100;

async function collectPaginatedData<TData>(loadPage: (page: number) => Promise<PaginatedResult<TData>>) {
  const firstPage = await loadPage(1);
  const records = [...firstPage.data];

  for (let page = firstPage.page + 1; page <= firstPage.pageCount; page += 1) {
    const nextPage = await loadPage(page);
    records.push(...nextPage.data);
  }

  return records;
}

function toBackendPayload(payload: Partial<ReferencePayload>) {
  return {
    ...(Object.prototype.hasOwnProperty.call(payload, "tenantId") ? { tenant_id: payload.tenantId } : {}),
    ...(payload.group !== undefined ? { group: payload.group } : {}),
    ...(payload.key !== undefined ? { key: payload.key } : {}),
    ...(payload.value !== undefined ? { value: payload.value } : {}),
    ...(payload.type !== undefined ? { type: payload.type } : {}),
    ...(payload.meta !== undefined ? { meta: payload.meta } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
  };
}

export async function getReferences() {
  return collectPaginatedData((page) => getReferencesPage({ page, pageSize: ALL_PAGE_SIZE }));
}

export async function getReferencesPage(
  params?: ServerDataTableParams,
  options: Pick<RequestInit, "signal"> = {},
): Promise<PaginatedResult<ReturnType<typeof mapReference>>> {
  const response = await apiRequest<ApiPaginatedEnvelope<BackendReference>>(`/references?${toQueryString(params)}`, options);

  return {
    data: response.data.map(mapReference),
    page: response.meta.current_page,
    pageSize: response.meta.per_page,
    pageCount: response.meta.last_page,
    total: response.meta.total,
  };
}

export async function getReferenceTypeOptions() {
  const response = await apiRequest<ApiEnvelope<ReferenceOption[]>>("/references/types");
  return response.data;
}

export async function getReferenceGroupOptions() {
  const response = await apiRequest<ApiEnvelope<ReferenceOption[]>>("/references/groups");
  return response.data;
}

export async function createReference(payload: ReferencePayload) {
  const response = await apiRequest<ApiEnvelope<BackendReference>>("/references", {
    method: "POST",
    body: JSON.stringify(toBackendPayload(payload)),
  });

  return mapReference(response.data);
}

export async function updateReference(referenceId: string, payload: Partial<ReferencePayload>) {
  const response = await apiRequest<ApiEnvelope<BackendReference>>(`/references/${referenceId}`, {
    method: "PATCH",
    body: JSON.stringify(toBackendPayload(payload)),
  });

  return mapReference(response.data);
}

export async function deleteReference(referenceId: string) {
  await apiRequest<void>(`/references/${referenceId}`, { method: "DELETE" });
}
