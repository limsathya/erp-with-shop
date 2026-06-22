import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Printer, QrCode, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KhqrDialog } from "@/components/khqr-dialog";
import { api } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/utils";

interface InvoiceDetail {
  id: string;
  number: string;
  currency: "USD" | "KHR";
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  status: string;
  note?: string | null;
  createdAt: string;
  customer?: { name: string; phone?: string; address?: string } | null;
  createdBy?: { name: string } | null;
  items: { id: string; name: string; quantity: number; unitPrice: string; lineTotal: string }[];
  payments: { id: string; method: string; amount: string; createdAt: string }[];
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PAID: "success",
  UNPAID: "warning",
  DRAFT: "secondary",
  CANCELLED: "destructive",
};

export default function InvoiceViewPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);

  const { data: inv, isLoading } = useQuery<InvoiceDetail>({
    queryKey: ["invoice", id],
    queryFn: async () => (await api.get(`/invoices/${id}`)).data,
    enabled: !!id,
  });

  if (isLoading || !inv) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const cur = inv.currency;

  return (
    <div className="space-y-6">
      {/* Toolbar — hidden when printing */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate("/invoices")}>
          <ArrowLeft className="h-4 w-4" /> {t("invoices.title")}
        </Button>
        <div className="flex gap-2">
          {inv.status !== "PAID" && (
            <Button onClick={() => setPayOpen(true)}>
              <QrCode className="h-4 w-4" /> {t("invoices.payNow")}
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> {t("common.print")}
          </Button>
        </div>
      </div>

      {/* Printable invoice */}
      <Card className="printable mx-auto max-w-3xl p-8">
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
                E
              </div>
              <span className="text-xl font-bold">{t("app.title")}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Phnom Penh, Cambodia</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tracking-tight">INVOICE</div>
            <div className="font-mono text-sm text-muted-foreground">{inv.number}</div>
            <div className="mt-2">
              <Badge variant={statusVariant[inv.status]}>{t(`status.${inv.status}`)}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6 text-sm">
          <div>
            <div className="mb-1 font-medium text-muted-foreground">{t("invoices.customer")}</div>
            <div className="font-medium">{inv.customer?.name ?? t("invoices.walkIn")}</div>
            {inv.customer?.phone && <div className="text-muted-foreground">{inv.customer.phone}</div>}
            {inv.customer?.address && <div className="text-muted-foreground">{inv.customer.address}</div>}
          </div>
          <div className="text-right">
            <div className="mb-1 font-medium text-muted-foreground">{t("common.date")}</div>
            <div>{formatDate(inv.createdAt)}</div>
            {inv.createdBy && (
              <div className="mt-2 text-muted-foreground">
                {t("invoices.issuedBy")}: {inv.createdBy.name}
              </div>
            )}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y text-left text-muted-foreground">
              <th className="py-2">{t("common.name")}</th>
              <th className="py-2 text-right">{t("common.quantity")}</th>
              <th className="py-2 text-right">{t("common.price")}</th>
              <th className="py-2 text-right">{t("common.total")}</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it) => (
              <tr key={it.id} className="border-b">
                <td className="py-2.5">{it.name}</td>
                <td className="py-2.5 text-right">{it.quantity}</td>
                <td className="py-2.5 text-right">{formatMoney(it.unitPrice, cur)}</td>
                <td className="py-2.5 text-right font-medium">{formatMoney(it.lineTotal, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{t("invoices.subtotal")}</span>
              <span>{formatMoney(inv.subtotal, cur)}</span>
            </div>
            {Number(inv.discount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{t("invoices.discount")}</span>
                <span>−{formatMoney(inv.discount, cur)}</span>
              </div>
            )}
            {Number(inv.tax) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{t("invoices.tax")}</span>
                <span>{formatMoney(inv.tax, cur)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>{t("invoices.grandTotal")}</span>
              <span>{formatMoney(inv.total, cur)}</span>
            </div>
          </div>
        </div>

        {inv.payments.length > 0 && (
          <div className="mt-6 border-t pt-4 text-sm">
            <div className="mb-2 font-medium text-muted-foreground">Payments</div>
            {inv.payments.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>
                  {p.method} · {formatDate(p.createdAt)}
                </span>
                <span className="font-medium">{formatMoney(p.amount, cur)}</span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Thank you for your business · សូមអរគុណ · 谢谢惠顾
        </p>
      </Card>

      <KhqrDialog
        invoiceId={inv.id}
        open={payOpen}
        onOpenChange={setPayOpen}
        onPaid={() => {
          qc.invalidateQueries({ queryKey: ["invoice", id] });
          qc.invalidateQueries({ queryKey: ["invoices"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />
    </div>
  );
}
