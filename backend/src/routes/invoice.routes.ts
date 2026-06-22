import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { redis, invalidate } from "../config/redis.js";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

/** Sequential, human-friendly document number backed by a Redis counter. */
async function nextNumber(prefix: string, key: string): Promise<string> {
  let n: number;
  try {
    n = await redis.incr(key);
  } catch {
    n = Date.now() % 1_000_000; // fallback if Redis is unavailable
  }
  return `${prefix}-${String(n).padStart(6, "0")}`;
}

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
    const where = status ? { status: status as any } : {};

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { customer: true, _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json({ items, total, page, pageSize, pages: Math.ceil(total / pageSize) });
  })
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!invoice) throw new HttpError(404, "Invoice not found");
    res.json(invoice);
  })
);

const invoiceInput = z.object({
  customerId: z.string().optional().nullable(),
  currency: z.enum(["USD", "KHR"]).default("USD"),
  discount: z.coerce.number().nonnegative().default(0),
  tax: z.coerce.number().nonnegative().default(0),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.coerce.number().int().positive(),
        unitPrice: z.coerce.number().nonnegative().optional(),
      })
    )
    .min(1),
});

router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = invoiceInput.parse(req.body);

    const invoice = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: data.items.map((i) => i.productId) } },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      const itemRows = data.items.map((i) => {
        const product = byId.get(i.productId);
        if (!product) throw new HttpError(400, `Unknown product: ${i.productId}`);
        const unitPrice = i.unitPrice ?? Number(product.price);
        const lineTotal = unitPrice * i.quantity;
        subtotal += lineTotal;
        return {
          productId: product.id,
          name: product.name,
          quantity: i.quantity,
          unitPrice,
          lineTotal,
        };
      });

      const total = Math.max(0, subtotal - data.discount + data.tax);
      const number = await nextNumber("INV", "seq:invoice");

      const created = await tx.invoice.create({
        data: {
          number,
          customerId: data.customerId || null,
          currency: data.currency,
          subtotal,
          discount: data.discount,
          tax: data.tax,
          total,
          note: data.note,
          createdById: req.user!.id,
          items: { create: itemRows },
        },
        include: { items: true, customer: true },
      });

      // Deduct stock and log an OUT movement per line.
      for (const row of itemRows) {
        await tx.product.update({
          where: { id: row.productId },
          data: { stock: { decrement: row.quantity } },
        });
        await tx.inventoryMovement.create({
          data: { productId: row.productId, type: "OUT", quantity: row.quantity, note: `Sold on ${number}` },
        });
      }
      return created;
    });

    await invalidate("dashboard:");
    res.status(201).json(invoice);
  })
);

router.patch(
  "/:id/status",
  authenticate,
  asyncHandler(async (req, res) => {
    const { status } = z
      .object({ status: z.enum(["DRAFT", "UNPAID", "PAID", "CANCELLED"]) })
      .parse(req.body);
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status },
    });
    await invalidate("dashboard:");
    res.json(invoice);
  })
);

export default router;
