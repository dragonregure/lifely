const explicitApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const backendMode = (import.meta.env.VITE_BACKEND_MODE ?? "Laravel").trim().toLowerCase();
const laravelPort = import.meta.env.VITE_BACKEND_LARAVEL_PORT ?? "8000";
const nestjsPort = import.meta.env.VITE_BACKEND_NESTJS_PORT ?? "3000";

function resolveApiBaseUrl() {
  if (explicitApiBaseUrl) {
    return explicitApiBaseUrl;
  }

  if (backendMode === "nest" || backendMode === "nestjs") {
    return `http://localhost:${nestjsPort}/api/v1`;
  }

  return `http://localhost:${laravelPort}/api/v1`;
}

export const API_BASE_URL = resolveApiBaseUrl().replace(/\/$/, "");
export const APP_MODE = (import.meta.env.LIFELY_APP_MODE ?? "").trim().toLowerCase();
export const IS_DEMO_MODE = APP_MODE === "demo";
