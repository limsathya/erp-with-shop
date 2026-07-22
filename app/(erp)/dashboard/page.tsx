"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatMoney } from "@/lib/utils";

interface DashboardData {
  counts: { products: number; customers: number; invoices: number; revenue: number };
  lowStock: { id: string; name: string; sku: string; stock: number; lowStockAt: number }[];
  recentInvoices: { id: string; number: string; total: string | number; status: string; customer?: { name: string } }[];
  revenueSeries: { date: string; total: number }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.get("/dashboard").then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="text-center py-12">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatMoney(data.counts.revenue)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Invoices</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.counts.invoices}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.counts.products}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.counts.customers}</div></CardContent></Card>
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader><CardTitle>Revenue (7 Days)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.revenueSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Low stock */}
        <Card>
          <CardHeader><CardTitle>Low Stock</CardTitle></CardHeader>
          <CardContent>
            {data.lowStock.length === 0 ? <p className="text-muted-foreground text-sm">All products well stocked.</p> : (
              <div className="space-y-2">
                {data.lowStock.map((p) => (
                  <div key={p.id} className="flex justify-between items-center">
                    <div><p className="font-medium text-sm">{p.name}</p><p className="text-xs text-muted-foreground">{p.sku}</p></div>
                    <span className="text-sm font-bold text-destructive">{p.stock} / {p.lowStockAt}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent invoices */}
        <Card>
          <CardHeader><CardTitle>Recent Invoices</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentInvoices.map((inv) => (
                <div key={inv.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">{inv.customer?.name || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatMoney(inv.total)}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${inv.status === "PAID" ? "bg-green-100 text-green-800" : inv.status === "UNPAID" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
