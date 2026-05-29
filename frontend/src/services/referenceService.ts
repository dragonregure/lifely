import type { ApiEnvelope, BackendReference } from "@/services/backendTypes";
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
  const response = await apiRequest<ApiEnvelope<BackendReference[]>>("/references");
  return response.data.map(mapReference);
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
