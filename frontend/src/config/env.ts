export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "");
export const APP_MODE = (import.meta.env.LIFELY_APP_MODE ?? "").trim().toLowerCase();
export const IS_DEMO_MODE = APP_MODE === "demo";
