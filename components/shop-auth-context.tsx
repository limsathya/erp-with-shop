"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import shopApi from "@/lib/shop-api";

interface Customer {
  id: string; name: string; email: string; phone?: string;
}

interface ShopAuthState {
  customer: Customer | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
}

const ShopAuthContext = createContext<ShopAuthState>({
  customer: null, loading: true,
  login: async () => {}, register: async () => {}, logout: () => {},
});

export function ShopAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("shop_access_token");
    if (!token) { setLoading(false); return; }
    shopApi.get("/auth/me").then(({ data }) => setCustomer(data)).catch(() => {
      localStorage.removeItem("shop_access_token");
      localStorage.removeItem("shop_refresh_token");
    }).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await shopApi.post("/auth/login", { email, password });
    localStorage.setItem("shop_access_token", data.accessToken);
    localStorage.setItem("shop_refresh_token", data.refreshToken);
    setCustomer(data.customer);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, phone?: string) => {
    const { data } = await shopApi.post("/auth/register", { name, email, password, phone });
    localStorage.setItem("shop_access_token", data.accessToken);
    localStorage.setItem("shop_refresh_token", data.refreshToken);
    setCustomer(data.customer);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("shop_access_token");
    localStorage.removeItem("shop_refresh_token");
    setCustomer(null);
  }, []);

  return <ShopAuthContext.Provider value={{ customer, loading, login, register, logout }}>{children}</ShopAuthContext.Provider>;
}

export const useShopAuth = () => useContext(ShopAuthContext);
