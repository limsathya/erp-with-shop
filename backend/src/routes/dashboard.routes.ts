import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { cacheJson } from "../config/redis.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
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

      // Build a 7-day revenue series for the chart.
      const days: { date: string; total: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ date: key, total: 0 });
      }
      for (const inv of paidInvoices) {
        const key = new Date(inv.createdAt).toISOString().slice(0, 10);
        const bucket = days.find((x) => x.date === key);
        if (bucket) bucket.total += Number(inv.total);
      }

      return {
        counts: {
          products,
          customers,
          invoices,
          revenue: Number(paidAgg._sum.total ?? 0),
        },
        lowStock,
        recentInvoices: recent,
        revenueSeries: days,
      };
    });

    res.json(data);
  })
);

export default router;
