import axios from "axios";

const shopApi = axios.create({ baseURL: "/api/shop" });

shopApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("shop_access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

shopApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem("shop_refresh_token");
        if (!refreshToken) throw new Error("No refresh token");
        const { data } = await axios.post("/api/shop/auth/refresh", { refreshToken });
        localStorage.setItem("shop_access_token", data.accessToken);
        localStorage.setItem("shop_refresh_token", data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return shopApi(original);
      } catch {
        localStorage.removeItem("shop_access_token");
        localStorage.removeItem("shop_refresh_token");
        if (typeof window !== "undefined") window.location.href = "/shop/login";
      }
    }
    return Promise.reject(error);
  }
);

export default shopApi;
