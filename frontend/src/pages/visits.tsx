import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, apiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Visit, Customer, Store } from "@/types";

const STATUS_VARIANT: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CHECKED_IN: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function VisitsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerId: "",
    storeId: "",
    status: "SCHEDULED" as Visit["status"],
    scheduledAt: "",
    note: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["visits"],
    queryFn: async () => (await api.get("/visits")).data as { items: Visit[] },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await api.get("/customers")).data as Customer[],
  });

  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => (await api.get("/stores")).data as Store[],
  });

  const upsert = useMutation({
    mutationFn: () =>
      editingId ? api.put(`/visits/${editingId}`, form) : api.post("/visits", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visits"] });
      toast.success(editingId ? "Visit updated" : "Visit created");
      setOpen(false);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/visits/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visits"] });
      toast.success("Visit deleted");
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({
      customerId: "",
      storeId: stores?.[0]?.id ?? "",
      status: "SCHEDULED",
      scheduledAt: new Date().toISOString().slice(0, 16),
      note: "",
    });
    setOpen(true);
  };

  const openEdit = (v: Visit) => {
    setEditingId(v.id);
    setForm({
      customerId: v.customerId,
      storeId: v.storeId ?? "",
      status: v.status,
      scheduledAt: v.scheduledAt.slice(0, 16),
      note: v.note ?? "",
    });
    setOpen(true);
  };

  const canSave = form.customerId && form.scheduledAt;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("visits.title", { defaultValue: "Visits" })}</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t("common.add")}
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {v.customer.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{v.store?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(v.scheduledAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                        (STATUS_VARIANT[v.status] ?? "bg-muted")
                      }
                    >
                      {v.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirm(`Delete visit for ${v.customer.name}?`) && remove.mutate(v.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!data?.items?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
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
            <DialogTitle>{editingId ? t("common.edit") : t("common.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Store</Label>
              <Select
                value={form.storeId}
                onValueChange={(v) => setForm((f) => ({ ...f, storeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {(stores ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Scheduled at *</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as Visit["status"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending || !canSave}>
              {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
