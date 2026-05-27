const ACCESS_TOKEN_KEY = "lifely.accessToken";
const REFRESH_TOKEN_KEY = "lifely.refreshToken";

export function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: { accessToken: string; refreshToken: string }) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
