import { prisma } from "@/lib/prisma";
import { cacheJson } from "@/lib/kv";
import { requireAuth } from "@/lib/auth";
import { handleApiError, apiSuccess } from "@/lib/api-utils";

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    const data = await cacheJson("dashboard:summary", 30, async () => {
      const [products, customers, invoices, paidAgg, lowStock, recent, paidInvoices] =
        await Promise.all([
          prisma.product.count(),
          prisma.customer.count(),
          prisma.invoice.count(),
          prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "PAID" } }),
          prisma.product.findMany({
            where: { stock: { lte: 5 } },
            orderBy: { stock: "asc" },
            take: 5,
            select: { id: true, name: true, sku: true, stock: true, lowStockAt: true },
          }),
          prisma.invoice.findMany({
            orderBy: { createdAt: "desc" },
            take: 6,
            include: { customer: { select: { name: true } } },
          }),
          prisma.invoice.findMany({
            where: { status: "PAID", createdAt: { gte: new Date(Date.now() - 7 * 864e5) } },
            select: { total: true, createdAt: true },
          }),
        ]);

      const days: { date: string; total: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({ date: d.toISOString().slice(0, 10), total: 0 });
      }
      for (const inv of paidInvoices) {
        const key = new Date(inv.createdAt).toISOString().slice(0, 10);
        const bucket = days.find((x) => x.date === key);
        if (bucket) bucket.total += Number(inv.total);
      }

      return {
        counts: { products, customers, invoices, revenue: Number(paidAgg._sum.total ?? 0) },
        lowStock,
        recentInvoices: recent,
        revenueSeries: days,
      };
    });
    return apiSuccess(data);
  } catch (e) {
    return handleApiError(e);
  }
}
