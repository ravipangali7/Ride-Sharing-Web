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
