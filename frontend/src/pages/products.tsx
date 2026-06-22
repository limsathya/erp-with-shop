import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, apiError } from "@/lib/api";
import { formatMoney } from "@/lib/utils";

interface Product {
  id: string;
  sku: string;
  name: string;
  nameKm?: string;
  nameZh?: string;
  price: string;
  cost: string;
  stock: number;
  lowStockAt: number;
  imageUrl?: string | null;
  category?: { name: string } | null;
}

const emptyForm = { sku: "", name: "", nameKm: "", nameZh: "", price: "", cost: "", stock: "0", lowStockAt: "5" };

export default function ProductsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [image, setImage] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: async () => (await api.get("/products", { params: { search, pageSize: 100 } })).data,
  });

  const products: Product[] = data?.items ?? [];

  const upsert = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append("image", image);
      if (editingId) return api.put(`/products/${editingId}`, fd);
      return api.post("/products", fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(editingId ? "Product updated" : "Product created");
      setOpen(false);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setImage(null);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      sku: p.sku,
      name: p.name,
      nameKm: p.nameKm ?? "",
      nameZh: p.nameZh ?? "",
      price: String(p.price),
      cost: String(p.cost),
      stock: String(p.stock),
      lowStockAt: String(p.lowStockAt),
    });
    setImage(null);
    setOpen(true);
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("products.title")}</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t("products.addProduct")}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
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
                <TableHead className="w-14"></TableHead>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.sku")}</TableHead>
                <TableHead>{t("common.category")}</TableHead>
                <TableHead className="text-right">{t("common.price")}</TableHead>
                <TableHead className="text-right">{t("common.stock")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {(p.nameKm || p.nameZh) && (
                      <div className="text-xs text-muted-foreground">
                        {[p.nameZh, p.nameKm].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(p.price)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={p.stock === 0 ? "destructive" : p.stock <= p.lowStockAt ? "warning" : "secondary"}>
                      {p.stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Delete ${p.name}?`)) remove.mutate(p.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!products.length && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    {t("common.noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("products.editProduct") : t("products.addProduct")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("common.sku")}</Label>
              <Input value={form.sku} onChange={set("sku")} placeholder="COF-001" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.category")}</Label>
              <Input disabled placeholder="—" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("products.nameEn")}</Label>
              <Input value={form.name} onChange={set("name")} />
            </div>
            <div className="space-y-1.5">
              <Label className="font-zh">{t("products.nameZh")}</Label>
              <Input value={form.nameZh} onChange={set("nameZh")} className="font-zh" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-khmer">{t("products.nameKm")}</Label>
              <Input value={form.nameKm} onChange={set("nameKm")} className="font-khmer" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.price")}</Label>
              <Input type="number" step="0.01" value={form.price} onChange={set("price")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.cost")}</Label>
              <Input type="number" step="0.01" value={form.cost} onChange={set("cost")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.stock")}</Label>
              <Input type="number" value={form.stock} onChange={set("stock")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("products.lowStockAt")}</Label>
              <Input type="number" value={form.lowStockAt} onChange={set("lowStockAt")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("products.image")}</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
