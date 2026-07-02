import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  ArrowLeft, Package, CheckCircle2, Loader2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { shopApi, shopApiError } from "@/lib/shop-api";
import { useShopAuth } from "@/context/shop-auth-context";
import { formatMoney, formatDate } from "@/lib/utils";

interface ShopOrderDetail {
  id: string;
  number: string;
  total: string;
  currency: "USD" | "KHR";
  status: string;
  createdAt: string;
  items: { id: string; name: string; quantity: number; unitPrice: string; lineTotal: string }[];
  payments: { id: string; method: string; amount: string; status: string; createdAt: string }[];
}

interface KhqrData {
  qr: string;
  md5: string;
  amount: number;
  currency: "USD" | "KHR";
  invoiceNumber: string;
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PAID: "success",
  UNPAID: "warning",
  DRAFT: "secondary",
  CANCELLED: "destructive",
};

export default function ShopOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { customer, loading: authLoading } = useShopAuth();

  const [khqr, setKhqr] = useState<KhqrData | null>(null);
  const [khqrLoading, setKhqrLoading] = useState(false);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authLoading && !customer) navigate("/shop/login", { replace: true });
  }, [customer, authLoading, navigate]);

  const { data: order, isLoading } = useQuery({
    queryKey: ["shop-order", id],
    queryFn: async () => (await shopApi.get(`/orders/${id}`)).data as ShopOrderDetail,
    enabled: !!id && !!customer,
  });

  useEffect(() => {
    if (order?.status === "PAID") setPaid(true);
  }, [order?.status]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPoll = (md5: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await shopApi.get(`/orders/pay/status/${md5}`);
        if (res.data.paid) {
          setPaid(true);
          if (pollRef.current) clearInterval(pollRef.current);
          toast.success("Payment received");
          qc.invalidateQueries({ queryKey: ["shop-order", id] });
          qc.invalidateQueries({ queryKey: ["shop-orders"] });
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
  };

  const generateKhqr = async () => {
    if (!id) return;
    setKhqrLoading(true);
    setPaid(false);
    try {
      const res = await shopApi.post(`/orders/${id}/pay/khqr`);
      setKhqr(res.data);
      startPoll(res.data.md5);
    } catch (e) {
      toast.error(shopApiError(e));
    } finally {
      setKhqrLoading(false);
    }
  };

  if (authLoading || !customer) return null;

  if (isLoading || !order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/shop/orders">
          <ArrowLeft className="mr-1 h-4 w-4" />
          My orders
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{order.number}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
        </div>
        <Badge variant={statusVariant[order.status] ?? "secondary"}>{order.status}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span className="font-medium">{formatMoney(item.lineTotal, order.currency)}</span>
              </div>
            ))}
            <div className="border-t pt-2">
              <div className="flex items-center justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatMoney(order.total, order.currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.payments.length > 0 ? (
              <div className="space-y-2 text-sm">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {p.method}
                    </span>
                    <span>{formatMoney(p.amount, order.currency)}</span>
                  </div>
                ))}
              </div>
            ) : paid ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Payment received</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Pay instantly with any Bakong-supported app by scanning the KHQR code.
                </p>
                {khqrLoading && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!khqrLoading && !khqr && (
                  <Button className="w-full" onClick={generateKhqr}>
                    Pay with KHQR
                  </Button>
                )}
                {khqr && !paid && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-xl border bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-6 border-b border-dashed pb-2">
                        <span className="text-base font-bold text-red-600">KHQR</span>
                        <span className="text-xs text-neutral-500">{khqr.invoiceNumber}</span>
                      </div>
                      <QRCodeSVG value={khqr.qr} size={216} level="M" includeMargin={false} />
                      <div className="mt-3 border-t border-dashed pt-2 text-center">
                        <div className="text-xs text-neutral-500">Amount due</div>
                        <div className="text-xl font-bold text-neutral-900">
                          {formatMoney(khqr.amount, khqr.currency)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Waiting for payment…
                    </div>
                    <Button variant="outline" size="sm" onClick={generateKhqr}>
                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                      New QR
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
