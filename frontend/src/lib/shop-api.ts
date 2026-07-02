import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const shopToken = {
  get access() {
    return localStorage.getItem("shopAccessToken");
  },
  get refresh() {
    return localStorage.getItem("shopRefreshToken");
  },
  set(access: string, refresh?: string) {
    localStorage.setItem("shopAccessToken", access);
    if (refresh) localStorage.setItem("shopRefreshToken", refresh);
  },
  clear() {
    localStorage.removeItem("shopAccessToken");
    localStorage.removeItem("shopRefreshToken");
  },
};

export const shopApi = axios.create({ baseURL: `${BASE_URL}/shop` });

shopApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = shopToken.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh the access token once on a 401, then retry the original request.
let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  const refresh = shopToken.refresh;
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${BASE_URL}/shop/auth/refresh`, { refreshToken: refresh });
    shopToken.set(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  } catch {
    shopToken.clear();
    return null;
  }
}

shopApi.interceptors.response.use(
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
        return shopApi(original);
      }
      // Refresh failed → bounce to login.
      if (location.pathname !== "/shop/login") location.href = "/shop/login";
    }
    return Promise.reject(error);
  }
);

export function shopApiError(e: unknown): string {
  const err = e as AxiosError<{ error?: string }>;
  return err.response?.data?.error || err.message || "Something went wrong";
}
