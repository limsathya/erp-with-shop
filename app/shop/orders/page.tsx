"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useShopAuth } from "@/components/shop-auth-context";
import shopApi from "@/lib/shop-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";

interface Order {
  id: string; number: string; total: string | number; status: string; createdAt: string;
  items: { id: string; name: string; quantity: number; unitPrice: string | number; lineTotal: string | number }[];
}

export default function OrdersPage() {
  const { customer } = useShopAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customer) {
      shopApi.get("/orders").then(({ data }) => setOrders(data.items)).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [customer]);

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-sm text-center p-6">
          <p className="mb-4">Please sign in to view your orders.</p>
          <Link href="/shop/login"><Button>Sign In</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b sticky top-0 bg-background z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="text-xl font-bold">☕ ERP Store</Link>
          <div className="flex items-center gap-2"><LanguageSwitcher /><ModeToggle /></div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/"><Button variant="ghost" className="mb-6"><ArrowLeft className="h-4 w-4 mr-2" />Back to Shop</Button></Link>
        <h1 className="text-2xl font-bold mb-6">My Orders</h1>
        {loading ? <p>Loading...</p> : orders.length === 0 ? <p className="text-muted-foreground">No orders yet.</p> : (
          <div className="space-y-4">
            {orders.map((o) => (
              <Link key={o.id} href={`/shop/orders/${o.id}`}>
                <Card className="hover:shadow transition-shadow">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{o.number}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(o.createdAt)} · {o.items.length} items</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatMoney(o.total)}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${o.status === "PAID" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{o.status}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
