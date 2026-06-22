import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, apiError } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: string;
  stock: number;
}
interface Customer {
  id: string;
  name: string;
}
interface InvoiceRow {
  id: string;
  number: string;
  total: string;
  currency: "USD" | "KHR";
  status: string;
  createdAt: string;
  customer?: { name: string } | null;
  _count?: { items: number };
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PAID: "success",
  UNPAID: "warning",
  DRAFT: "secondary",
  CANCELLED: "destructive",
};

export default function InvoicesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const [customerId, setCustomerId] = useState<string>("walk-in");
  const [currency, setCurrency] = useState<"USD" | "KHR">("USD");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [lines, setLines] = useState<{ productId: string; quantity: string }[]>([
    { productId: "", quantity: "1" },
  ]);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await api.get("/invoices", { params: { pageSize: 100 } })).data,
  });
  const { data: productData } = useQuery({
    queryKey: ["products", ""],
    queryFn: async () => (await api.get("/products", { params: { pageSize: 100 } })).data,
  });
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await api.get("/customers")).data,
  });

  const products: Product[] = productData?.items ?? [];
  const invoices: InvoiceRow[] = data?.items ?? [];

  const subtotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const p = products.find((x) => x.id === l.productId);
      return sum + (p ? Number(p.price) * Number(l.quantity || 0) : 0);
    }, 0);
  }, [lines, products]);

  const grandTotal = Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0));

  const create = useMutation({
    mutationFn: () =>
      api.post("/invoices", {
        customerId: customerId === "walk-in" ? null : customerId,
        currency,
        discount: Number(discount || 0),
        tax: Number(tax || 0),
        items: lines
          .filter((l) => l.productId && Number(l.quantity) > 0)
          .map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Created ${res.data.number}`);
      setOpen(false);
      navigate(`/invoices/${res.data.id}`);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const openCreate = () => {
    setCustomerId("walk-in");
    setCurrency("USD");
    setDiscount("0");
    setTax("0");
    setLines([{ productId: "", quantity: "1" }]);
    setOpen(true);
  };

  const hasItems = lines.some((l) => l.productId && Number(l.quantity) > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("invoices.title")}</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t("invoices.newInvoice")}
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("invoices.number")}</TableHead>
                <TableHead>{t("invoices.customer")}</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.total")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                >
                  <TableCell className="font-mono font-medium">{inv.number}</TableCell>
                  <TableCell>{inv.customer?.name ?? t("invoices.walkIn")}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(inv.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[inv.status]}>{t(`status.${inv.status}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(inv.total, inv.currency)}</TableCell>
                </TableRow>
              ))}
              {!invoices.length && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    {t("invoices.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("invoices.newInvoice")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("invoices.customer")}</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">{t("invoices.walkIn")}</SelectItem>
                  {(customers ?? []).map((c: Customer) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("invoices.currency")}</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as "USD" | "KHR")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="KHR">KHR (៛)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("invoices.items")}</Label>
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    value={line.productId}
                    onValueChange={(v) =>
                      setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, productId: v } : l)))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("invoices.selectProduct")} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatMoney(p.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  min="1"
                  className="w-20"
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)))
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== idx) : ls))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLines((ls) => [...ls, { productId: "", quantity: "1" }])}
            >
              <Plus className="h-3.5 w-3.5" /> {t("invoices.addItem")}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("invoices.discount")}</Label>
              <Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("invoices.tax")}</Label>
              <Input type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{t("invoices.subtotal")}</span>
              <span>{formatMoney(subtotal, currency)}</span>
            </div>
            <div className="mt-1 flex justify-between text-base font-semibold">
              <span>{t("invoices.grandTotal")}</span>
              <span>{formatMoney(grandTotal, currency)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => create.mutate()} disabled={!hasItems || create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
