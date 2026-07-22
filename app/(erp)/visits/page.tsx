"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Visit { id: string; status: string; scheduledAt: string; note?: string; customer: { name: string }; store?: { name: string } }

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    api.get("/visits", { params: { search: search || undefined, status: filter || undefined } }).then(({ data }) => setVisits(data.items));
  }, [search, filter]);

  const updateStatus = async (id: string, status: string) => {
    try { await api.patch(`/visits/${id}/status`, { status }); toast.success("Status updated"); setVisits((prev) => prev.map((v) => v.id === id ? { ...v, status } : v)); }
    catch (err: any) { toast.error("Failed"); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Visits</h1>
      <div className="flex gap-4">
        <Input placeholder="Search customer..." className="max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="CHECKED_IN">Checked In</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Store</TableHead><TableHead>Scheduled</TableHead><TableHead>Status</TableHead><TableHead>Note</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {visits.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.customer.name}</TableCell>
                <TableCell>{v.store?.name || "—"}</TableCell>
                <TableCell>{formatDate(v.scheduledAt)}</TableCell>
                <TableCell><span className={`px-2 py-0.5 rounded text-xs ${v.status === "COMPLETED" ? "bg-green-100 text-green-800" : v.status === "SCHEDULED" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>{v.status}</span></TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.note || "—"}</TableCell>
                <TableCell>
                  {v.status === "SCHEDULED" && <Button variant="outline" size="sm" onClick={() => updateStatus(v.id, "CHECKED_IN")}>Check In</Button>}
                  {v.status === "CHECKED_IN" && <Button variant="outline" size="sm" onClick={() => updateStatus(v.id, "COMPLETED")}>Complete</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
