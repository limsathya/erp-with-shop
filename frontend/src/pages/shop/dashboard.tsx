import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, User, ArrowRight, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { shopApi } from "@/lib/shop-api";
import { useShopAuth } from "@/context/shop-auth-context";
import { formatMoney, formatDate } from "@/lib/utils";

interface ShopOrder {
  id: string;
  number: string;
  total: string;
  status: string;
  createdAt: string;
  items: { name: string; quantity: number; unitPrice: string; lineTotal: string }[];
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PAID: "success",
  UNPAID: "warning",
  DRAFT: "secondary",
  CANCELLED: "destructive",
};

export default function ShopCustomerDashboard() {
  const { customer, loading } = useShopAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["shop-orders"],
    queryFn: async () => (await shopApi.get("/orders")).data,
    enabled: !!customer,
  });

  useEffect(() => {
    if (!loading && !customer) navigate("/shop/login", { replace: true });
  }, [customer, loading, navigate]);

  if (loading || !customer) return null;

  const orders: ShopOrder[] = data?.items ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">My Account</h1>
        <p className="text-muted-foreground">Welcome back, {customer?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{customer?.email ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Phone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{customer?.phone ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{orders.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent orders</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/shop/orders">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : orders.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              You have not placed any orders yet.
              <div className="mt-3">
                <Button asChild>
                  <Link to="/shop">Start shopping</Link>
                </Button>
              </div>
            </div>
          ) : (
            orders.slice(0, 5).map((order) => (
              <Link
                key={order.id}
                to={`/shop/orders/${order.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{order.number}</span>
                    <Badge variant={statusVariant[order.status] ?? "secondary"}>{order.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                  </p>
                </div>
                <span className="font-bold">{formatMoney(order.total)}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
