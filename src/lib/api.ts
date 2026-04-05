const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://ridesharingserver.luckyuser365.com/api";

export interface ListResponse<T> {
  resource: string;
  count: number;
  page: number;
  page_size: number;
  results: T[];
}

// ─── JWT token helpers ────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return sessionStorage.getItem("admin_access_token");
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem("admin_refresh_token");
}

export function storeTokens(access: string, refresh: string) {
  sessionStorage.setItem("admin_access_token", access);
  sessionStorage.setItem("admin_refresh_token", refresh);
}

export function clearTokens() {
  sessionStorage.removeItem("admin_access_token");
  sessionStorage.removeItem("admin_refresh_token");
  sessionStorage.removeItem("admin_user");
}

async function _refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access) {
      sessionStorage.setItem("admin_access_token", data.access);
      return data.access as string;
    }
  } catch {
    // ignore
  }
  return null;
}

async function request<T>(path: string, init?: RequestInit, _retry = true): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  // Auto-refresh on 401 (expired token) and retry once
  if (response.status === 401 && _retry) {
    const newToken = await _refreshAccessToken();
    if (newToken) return request<T>(path, init, false);
    clearTokens();
    window.location.href = "/admin/login";
    return undefined as unknown as T;
  }

  if (response.status === 204) return undefined as unknown as T;
  if (!response.ok) {
    const text = await response.text();
    let msg = text;
    try {
      const json = JSON.parse(text);
      msg = json.error || json.detail || text;
    } catch {
      // not JSON
    }
    throw new Error(msg || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// ─── Generic resource list / detail ──────────────────────────────────────────

export function fetchAdminResource<T>(
  resource: string,
  params?: Record<string, string | number | boolean>,
) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}` !== "") {
      query.set(k, String(v));
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<ListResponse<T>>(`/admin/${resource}/${suffix}`);
}

export function createAdminResource<T = any>(
  resource: string,
  data: Record<string, any>,
) {
  return request<T>(`/admin/${resource}/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAdminResource<T = any>(
  resource: string,
  id: string,
  data: Record<string, any>,
) {
  return request<T>(`/admin/${resource}/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAdminResource(resource: string, id: string) {
  return request<void>(`/admin/${resource}/${id}/`, { method: "DELETE" });
}

export interface ResourceStats {
  total: number;
  today: number;
  by_status: Record<string, number>;
  bool_counts: Record<string, number>;
  total_amount?: number;
  avg_amount?: number;
  today_amount?: number;
  out_of_stock?: number;
}

export function fetchAdminStats(resource: string) {
  return request<ResourceStats>(`/admin/${resource}/stats/`);
}

export function adjustAdminUserCoins(
  userId: string,
  payload: { amount: number; reason: string },
) {
  return request<{ user_id: string; coin_balance: number; transaction_id: string }>(
    `/admin/users/${userId}/adjust-coins/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function fetchDashboardOverview() {
  return request<Record<string, any>>("/admin/dashboard/overview/");
}

export function fetchDashboardActivity() {
  return request<{ icon: string; text: string; time: string }[]>(
    "/admin/dashboard/activity/",
  );
}

export function fetchDashboardRevenueSeries() {
  return request<
    { day: string; ride: number; parcel: number; food: number; ecom: number }[]
  >("/admin/dashboard/revenue/");
}

export function fetchDashboardTopPerformers() {
  return request<
    Record<string, { name: string; metric: string; extra: string }[]>
  >("/admin/dashboard/top-performers/");
}

// ─── Website ─────────────────────────────────────────────────────────────────

export function fetchWebsiteHome() {
  return request<Record<string, any>>("/website/home/");
}

export interface MobileAppPublic {
  current_app_version: number;
  android_file_url: string | null;
}

/** Public endpoint — no auth. */
export function fetchMobileAppRelease(): Promise<MobileAppPublic> {
  return request<MobileAppPublic>("/website/mobile-app/");
}

/** Media URL for a stored relative path (e.g. `releases/app.apk`). */
export function publicMediaUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  const base = API_BASE.replace(/\/api\/?$/, "");
  const path = relativePath.replace(/^\//, "");
  return `${base}/media/${path}`;
}

/**
 * PATCH admin resource with multipart/form-data (e.g. FileField). Upload progress 0–100.
 */
export function patchAdminResourceMultipart<T = Record<string, unknown>>(
  resource: string,
  id: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  const exec = (isRetry: boolean): Promise<T> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PATCH", `${API_BASE}/admin/${resource}/${id}/`);
      const token = getAccessToken();
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          onProgress?.(Math.round((100 * e.loaded) / e.total));
        }
      };
      xhr.onload = () => {
        if (xhr.status === 401 && !isRetry) {
          void _refreshAccessToken().then((tok) => {
            if (!tok) {
              clearTokens();
              window.location.href = "/admin/login";
              reject(new Error("Unauthorized"));
              return;
            }
            exec(true).then(resolve).catch(reject);
          });
          return;
        }
        if (xhr.status === 401) {
          clearTokens();
          window.location.href = "/admin/login";
          reject(new Error("Unauthorized"));
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(
              xhr.responseText ? (JSON.parse(xhr.responseText) as T) : ({} as T),
            );
          } catch {
            reject(new Error("Invalid response"));
          }
          return;
        }
        let msg = xhr.responseText;
        try {
          const j = JSON.parse(xhr.responseText) as { error?: string };
          msg = j.error || msg;
        } catch {
          // keep text
        }
        reject(new Error(msg || `HTTP ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(formData);
    });
  return exec(false);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AdminLoginResponse {
  access: string;
  refresh: string;
  user: Record<string, any>;
}

export function adminLogin(credentials: {
  phone?: string;
  email?: string;
  password: string;
}) {
  return request<AdminLoginResponse>("/auth/login/", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
