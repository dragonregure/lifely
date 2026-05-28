import { API_BASE_URL } from "@/config/env";
import type { ApiEnvelope, AuthPayload } from "@/services/backendTypes";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/services/tokenStorage";

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("Missing refresh token.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
      device_name: "lifely-frontend",
    }),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error("Session expired.");
  }

  const payload = (await response.json()) as ApiEnvelope<AuthPayload>;
  setTokens({
    accessToken: payload.data.access_token,
    refreshToken: payload.data.refresh_token,
  });
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  const accessToken = getAccessToken();

  headers.set("Accept", "application/json");

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && retry && getRefreshToken()) {
    await refreshAccessToken();
    return apiRequest<T>(path, options, false);
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null;
    const message = error?.message ?? Object.values(error?.errors ?? {})[0]?.[0] ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
