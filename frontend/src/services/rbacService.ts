import type { ApiEnvelope, BackendPermission, BackendRole, BackendUser, BackendUserAccess } from "@/services/backendTypes";
import { apiRequest } from "@/services/httpClient";
import { mapPermission, mapRole, mapUser, mapUserAccess } from "@/services/mappers";

type RolePayload = {
  name: string;
  permissions?: string[];
};

type PermissionPayload = {
  name: string;
};

export type RoleInclude = "permissions";
export type PermissionInclude = "roles";

type RoleRequestOptions = Pick<RequestInit, "signal"> & {
  include?: readonly RoleInclude[];
};

type PermissionRequestOptions = Pick<RequestInit, "signal"> & {
  include?: readonly PermissionInclude[];
};

function tenantHeaders(tenantId?: string) {
  return tenantId ? { "X-Tenant-Id": tenantId } : undefined;
}

function toIncludeQueryString(includes: readonly string[] = []) {
  const query = new URLSearchParams();

  includes.forEach((include) => query.append("include[]", include));

  return query.toString();
}

export async function getRoles(options: RoleRequestOptions = {}) {
  const { include = [], ...requestOptions } = options;
  const queryString = toIncludeQueryString(include);
  const response = await apiRequest<ApiEnvelope<BackendRole[]>>(`/roles${queryString ? `?${queryString}` : ""}`, requestOptions);
  return response.data.map(mapRole);
}

export async function getRole(roleId: number, options: RoleRequestOptions = {}) {
  const { include = [], ...requestOptions } = options;
  const queryString = toIncludeQueryString(include);
  const response = await apiRequest<ApiEnvelope<BackendRole>>(`/roles/${roleId}${queryString ? `?${queryString}` : ""}`, requestOptions);
  return mapRole(response.data);
}

export async function createRole(payload: RolePayload) {
  const response = await apiRequest<ApiEnvelope<BackendRole>>("/roles", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      guard_name: "web",
      permissions: payload.permissions ?? [],
    }),
  });

  return mapRole(response.data);
}

export async function updateRole(roleId: number, payload: RolePayload) {
  const response = await apiRequest<ApiEnvelope<BackendRole>>(`/roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: payload.name,
      guard_name: "web",
      permissions: payload.permissions ?? [],
    }),
  });

  return mapRole(response.data);
}

export async function deleteRole(roleId: number) {
  await apiRequest<void>(`/roles/${roleId}`, { method: "DELETE" });
}

export async function getPermissions(options: PermissionRequestOptions = {}) {
  const { include = [], ...requestOptions } = options;
  const queryString = toIncludeQueryString(include);
  const response = await apiRequest<ApiEnvelope<BackendPermission[]>>(`/permissions${queryString ? `?${queryString}` : ""}`, requestOptions);
  return response.data.map(mapPermission);
}

export async function createPermission(payload: PermissionPayload) {
  const response = await apiRequest<ApiEnvelope<BackendPermission>>("/permissions", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      guard_name: "web",
    }),
  });

  return mapPermission(response.data);
}

export async function updatePermission(permissionId: number, payload: PermissionPayload) {
  const response = await apiRequest<ApiEnvelope<BackendPermission>>(`/permissions/${permissionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: payload.name,
      guard_name: "web",
    }),
  });

  return mapPermission(response.data);
}

export async function deletePermission(permissionId: number) {
  await apiRequest<void>(`/permissions/${permissionId}`, { method: "DELETE" });
}

export async function syncUserRoles(userId: string, roles: string[], tenantId?: string) {
  const response = await apiRequest<ApiEnvelope<BackendUser>>(`/users/${userId}/roles`, {
    method: "PUT",
    headers: tenantHeaders(tenantId),
    body: JSON.stringify({
      roles,
      guard_name: "web",
    }),
  });

  return mapUser(response.data);
}

export async function syncUserPermissions(userId: string, permissions: string[], tenantId?: string) {
  const response = await apiRequest<ApiEnvelope<BackendUser>>(`/users/${userId}/permissions`, {
    method: "PUT",
    headers: tenantHeaders(tenantId),
    body: JSON.stringify({
      permissions,
      guard_name: "web",
    }),
  });

  return mapUser(response.data);
}

export async function getMyPermissions() {
  const response = await apiRequest<ApiEnvelope<BackendUserAccess>>("/me/permissions");
  return mapUserAccess(response.data);
}
