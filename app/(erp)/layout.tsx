"use client";

import { useAuth } from "@/components/auth-context";
import { ErpLayout } from "@/components/erp-layout";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ErpRouteLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return null;

  return <ErpLayout>{children}</ErpLayout>;
}
