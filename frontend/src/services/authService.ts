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

export async function refreshTokens() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("Missing refresh token.");
  }

  const response = await apiRequest<ApiEnvelope<AuthPayload>>(
    "/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({
        refresh_token: refreshToken,
        device_name: "lifely-frontend",
      }),
    },
    false,
  );

  return persistAuth(response.data);
}

export async function logout() {
  const refreshToken = getRefreshToken();

  await apiRequest<{ message: string }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => undefined);

  clearTokens();
}

export async function revokeAllTokens() {
  await apiRequest<{ message: string }>("/auth/revoke-all", {
    method: "POST",
  });

  clearTokens();
}

export async function updatePassword(payload: {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}) {
  await apiRequest<{ message: string }>("/auth/password", {
    method: "PUT",
    body: JSON.stringify({
      current_password: payload.currentPassword,
      password: payload.password,
      password_confirmation: payload.passwordConfirmation,
    }),
  });

  clearTokens();
}
