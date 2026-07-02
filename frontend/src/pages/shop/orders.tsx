import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { shopApi } from "@/lib/shop-api";
import { useShopAuth } from "@/context/shop-auth-context";
import { formatMoney, formatDate } from "@/lib/utils";

type StatusVariant = "default" | "secondary" | "destructive" | "success" | "warning";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  PAID: "success",
  UNPAID: "warning",
  DRAFT: "secondary",
  CANCELLED: "destructive",
};

export default function ShopOrdersPage() {
  const { customer, loading: authLoading } = useShopAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !customer) {
      navigate("/shop/login", { replace: true });
    }
  }, [customer, authLoading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["shop-orders"],
    queryFn: async () => (await shopApi.get("/orders")).data,
    enabled: !!customer,
  });

  // Still resolving auth or redirecting
  if (authLoading || !customer) return null;

  const orders: any[] = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/shop">
            <ArrowLeft className="h-4 w-4" />
            Shop
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
          <p className="text-sm text-muted-foreground">Hello, {customer.name}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <ShoppingBag className="h-14 w-14 text-muted-foreground/25" />
          <p className="font-semibold">No orders yet</p>
          <p className="text-sm text-muted-foreground">
            Your purchase history will appear here.
          </p>
          <Button asChild>
            <Link to="/shop">Browse products</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/shop/orders/${order.id}`}
              className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-mono text-sm font-semibold">{order.number}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {order.items.map((item: any) => (
                      <span
                        key={item.id}
                        className="rounded-md bg-muted px-2 py-0.5 text-xs"
                      >
                        {item.name} × {item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-shrink-0 flex-col items-end gap-2">
                <span className="font-bold">{formatMoney(order.total)}</span>
                <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
                  {order.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
