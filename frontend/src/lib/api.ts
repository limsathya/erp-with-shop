import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const tokenStore = {
  get access() {
    return localStorage.getItem("accessToken");
  },
  get refresh() {
    return localStorage.getItem("refreshToken");
  },
  set(access: string, refresh?: string) {
    localStorage.setItem("accessToken", access);
    if (refresh) localStorage.setItem("refreshToken", refresh);
  },
  clear() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh the access token once on a 401, then retry the original request.
let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  const refresh = tokenStore.refresh;
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh });
    tokenStore.set(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      refreshing = refreshing || refreshAccess();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      // Refresh failed → bounce to login.
      if (location.pathname !== "/login") location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export function apiError(e: unknown): string {
  const err = e as AxiosError<{ error?: string }>;
  return err.response?.data?.error || err.message || "Something went wrong";
}
