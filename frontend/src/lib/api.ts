const tokenRefreshUrl = "http://127.0.0.1:8000/api/accounts/token/refresh/";

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

function mergeHeaders(
  headers: HeadersInit | undefined,
  authHeaders: Record<string, string>
) {
  return {
    ...(headers instanceof Headers ? Object.fromEntries(headers.entries()) : headers),
    ...authHeaders,
  };
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return false;

  const res = await fetch(tokenRefreshUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    clearTokens();
    return false;
  }

  const data: { access: string } = await res.json();
  localStorage.setItem("access_token", data.access);
  return true;
}

export async function authenticatedFetch(
  input: string | URL | Request,
  init: RequestInit = {},
  onAuthExpired?: () => void
) {
  const firstResponse = await fetch(input, {
    ...init,
    headers: mergeHeaders(init.headers, getAuthHeaders()),
  });

  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    onAuthExpired?.();
    return firstResponse;
  }

  return fetch(input, {
    ...init,
    headers: mergeHeaders(init.headers, getAuthHeaders()),
  });
}
