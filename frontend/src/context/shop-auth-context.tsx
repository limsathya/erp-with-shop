import { createContext, useContext, useEffect, useState } from "react";
import { shopApi, shopToken, shopApiError } from "@/lib/shop-api";

export interface ShopCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface ShopAuthContextValue {
  customer: ShopCustomer | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const ShopAuthContext = createContext<ShopAuthContextValue | null>(null);

export function ShopAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<ShopCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!shopToken.access) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await shopApi.get("/auth/me");
        setCustomer(data);
      } catch {
        shopToken.clear();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await shopApi.post("/auth/login", { email, password });
    shopToken.set(data.accessToken, data.refreshToken);
    setCustomer(data.customer);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone?: string
  ) => {
    const { data } = await shopApi.post("/auth/register", {
      name,
      email,
      password,
      phone,
    });
    shopToken.set(data.accessToken, data.refreshToken);
    setCustomer(data.customer);
  };

  const logout = async () => {
    try {
      if (shopToken.refresh) {
        await shopApi.post("/auth/logout", { refreshToken: shopToken.refresh });
      }
    } catch {
      /* ignore */
    }
    shopToken.clear();
    setCustomer(null);
  };

  return (
    <ShopAuthContext.Provider value={{ customer, loading, login, register, logout }}>
      {children}
    </ShopAuthContext.Provider>
  );
}

export function useShopAuth() {
  const ctx = useContext(ShopAuthContext);
  if (!ctx) throw new Error("useShopAuth must be used within ShopAuthProvider");
  return ctx;
}
