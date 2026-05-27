import type { ApiEnvelope, AuthPayload, BackendUser } from "@/services/backendTypes";
import { apiRequest } from "@/services/httpClient";
import { mapUser } from "@/services/mappers";
import { clearTokens, getRefreshToken, setTokens } from "@/services/tokenStorage";

function persistAuth(payload: AuthPayload) {
  setTokens({
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
  });

  return mapUser(payload.user);
}

export async function login(payload: { email: string; password: string }) {
  const response = await apiRequest<ApiEnvelope<AuthPayload>>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ ...payload, device_name: "lifely-frontend" }),
  });

  return persistAuth(response.data);
}

export async function register(payload: {
  tenantName: string;
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}) {
  const response = await apiRequest<ApiEnvelope<AuthPayload>>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      tenant_name: payload.tenantName,
      name: payload.name,
      email: payload.email,
      password: payload.password,
      password_confirmation: payload.passwordConfirmation,
      device_name: "lifely-frontend",
    }),
  });

  return persistAuth(response.data);
}

export async function getCurrentUser() {
  const response = await apiRequest<ApiEnvelope<{ user: BackendUser }>>("/auth/me");

  return mapUser(response.data.user);
}

export async function logout() {
  const refreshToken = getRefreshToken();

  await apiRequest<{ message: string }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => undefined);

  clearTokens();
}
