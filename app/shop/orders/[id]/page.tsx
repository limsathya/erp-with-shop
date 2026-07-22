"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import shopApi from "@/lib/shop-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface OrderDetail {
  id: string; number: string; total: string | number; status: string; currency: string; createdAt: string;
  items: { id: string; name: string; quantity: number; unitPrice: string | number; lineTotal: string | number }[];
  payments: { id: string; method: string; amount: string | number; status: string; createdAt: string }[];
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [khqr, setKhqr] = useState<{ qr: string; md5: string } | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    shopApi.get(`/orders/${id}`).then(({ data }) => setOrder(data));
  }, [id]);

  useEffect(() => {
    if (!polling || !khqr) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await shopApi.get(`/orders/pay/status/${khqr.md5}`);
        if (data.paid) {
          setPolling(false);
          toast.success("Payment received!");
          const { data: updated } = await shopApi.get(`/orders/${id}`);
          setOrder(updated);
          setKhqr(null);
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [polling, khqr, id]);

  const payKhqr = async () => {
    try {
      const { data } = await shopApi.post(`/orders/${id}/pay/khqr`);
      setKhqr({ qr: data.qr, md5: data.md5 });
      setPolling(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to generate QR");
    }
  };

  if (!order) return <div className="container mx-auto p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background"><div className="container mx-auto flex items-center h-16 px-4"><Link href="/" className="text-xl font-bold">☕ ERP Store</Link></div></header>
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => router.push("/shop/orders")} className="mb-6"><ArrowLeft className="h-4 w-4 mr-2" />Orders</Button>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Order {order.number}</h1>
          <span className={`px-2 py-1 rounded text-sm font-medium ${order.status === "PAID" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{order.status}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{formatDate(order.createdAt)}</p>

        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Items</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">x{item.quantity}</p></div>
                <p className="font-bold">{formatMoney(item.lineTotal)}</p>
              </div>
            ))}
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span><span>{formatMoney(order.total, order.currency)}</span>
            </div>
          </CardContent>
        </Card>

        {order.status !== "PAID" && (
          <div className="space-y-4">
            {khqr ? (
              <Card>
                <CardContent className="flex flex-col items-center py-6">
                  <QRCodeSVG value={khqr.qr} size={200} />
                  <p className="mt-4 text-sm text-muted-foreground">Scan with any Bakong app to pay</p>
                  <p className="text-xs text-muted-foreground mt-1">Polling for payment...</p>
                </CardContent>
              </Card>
            ) : (
              <Button className="w-full" onClick={payKhqr}>Pay with KHQR</Button>
            )}
          </div>
        )}

        {order.payments.length > 0 && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-lg">Payments</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {order.payments.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>{p.method}</span>
                  <span className="font-medium">{formatMoney(p.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
