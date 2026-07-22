"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Invoice { id: string; number: string; total: string | number; status: string; currency: string; createdAt: string; customer?: { name: string }; _count: { items: number } }

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    api.get("/invoices", { params: { status: filter || undefined } }).then(({ data }) => setInvoices(data.items));
  }, [filter]);

  const markPaid = async (id: string) => {
    try {
      await api.patch(`/invoices/${id}`, { status: "PAID" });
      toast.success("Invoice marked as paid");
      setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status: "PAID" } : i));
    } catch (err: any) { toast.error("Failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono">{inv.number}</TableCell>
                  <TableCell>{inv.customer?.name || "—"}</TableCell>
                  <TableCell>{inv._count.items}</TableCell>
                  <TableCell>{formatMoney(inv.total, inv.currency)}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded text-xs ${inv.status === "PAID" ? "bg-green-100 text-green-800" : inv.status === "UNPAID" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>{inv.status}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(inv.createdAt)}</TableCell>
                  <TableCell>
                    {inv.status === "UNPAID" && <Button variant="outline" size="sm" onClick={() => markPaid(inv.id)}>Mark Paid</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
