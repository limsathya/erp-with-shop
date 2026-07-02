import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DollarSign, Users, Package, FileText, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/utils";

interface DashboardData {
  counts: { products: number; customers: number; invoices: number; revenue: number };
  lowStock: { id: string; name: string; sku: string; stock: number; lowStockAt: number }[];
  recentInvoices: {
    id: string;
    number: string;
    total: string;
    currency: "USD" | "KHR";
    status: string;
    createdAt: string;
    customer?: { name: string } | null;
  }[];
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PAID: "success",
  UNPAID: "warning",
  DRAFT: "secondary",
  CANCELLED: "destructive",
};

export default function ManagerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/dashboard")).data,
    refetchInterval: 15_000,
  });

  const stats = [
    { key: "revenue", label: t("dashboard.revenue"), icon: DollarSign, value: formatMoney(data?.counts.revenue ?? 0) },
    { key: "invoices", label: t("dashboard.invoices"), icon: FileText, value: data?.counts.invoices ?? 0 },
    { key: "products", label: t("dashboard.products"), icon: Package, value: data?.counts.products ?? 0 },
    { key: "customers", label: t("dashboard.customers"), icon: Users, value: data?.counts.customers ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">Sales, inventory, and team overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{s.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low stock alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : data?.lowStock.length ? (
              data.lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{p.sku}</div>
                  </div>
                  <Badge variant={p.stock === 0 ? "destructive" : "warning"}>{p.stock} left</Badge>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.allGood")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              data?.recentInvoices.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium">{inv.number}</span>
                    <span className="text-muted-foreground">{inv.customer?.name ?? t("invoices.walkIn")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</span>
                    <Badge variant={statusVariant[inv.status]}>{t(`status.${inv.status}`)}</Badge>
                    <span className="w-20 text-right font-medium">{formatMoney(inv.total, inv.currency)}</span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Products", to: "/products", icon: Package },
          { label: "Invoices", to: "/invoices", icon: FileText },
          { label: "Customers", to: "/customers", icon: Users },
          { label: "Suppliers", to: "/suppliers", icon: Users },
        ].map((item) => (
          <Button key={item.to} variant="outline" className="h-auto justify-between p-4" onClick={() => navigate(item.to)}>
            <span className="flex items-center gap-2">
              <item.icon className="h-4 w-4" />
              {item.label}
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        ))}
      </div>
    </div>
  );
}
