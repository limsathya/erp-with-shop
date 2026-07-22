import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { kvIncr, invalidate } from "@/lib/kv";
import { requireAuth } from "@/lib/auth";
import { handleApiError, apiSuccess, apiCreated, HttpError } from "@/lib/api-utils";

async function nextNumber(prefix: string, key: string): Promise<string> {
  const n = await kvIncr(key);
  return `${prefix}-${String(n).padStart(6, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Number(req.nextUrl.searchParams.get("pageSize")) || 20);
    const where = status ? { status: status as any } : {};

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { customer: true, store: true, _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);
    return apiSuccess({ items, total, page, pageSize, pages: Math.ceil(total / pageSize) });
  } catch (e) {
    return handleApiError(e);
  }
}

const invoiceInput = z.object({
  customerId: z.string().optional().nullable(),
  storeId: z.string().optional().nullable(),
  currency: z.enum(["USD", "KHR"]).default("USD"),
  discount: z.coerce.number().nonnegative().default(0),
  tax: z.coerce.number().nonnegative().default(0),
  note: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.coerce.number().int().positive(),
      unitPrice: z.coerce.number().nonnegative().optional(),
    })
  ).min(1),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const data = invoiceInput.parse(await req.json());

    if (data.storeId) {
      const store = await prisma.store.findUnique({ where: { id: data.storeId } });
      if (!store) throw new HttpError(400, "Store not found");
    }

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
        return { productId: product.id, name: product.name, quantity: i.quantity, unitPrice, lineTotal };
      });

      const total = Math.max(0, subtotal - data.discount + data.tax);
      const number = await nextNumber("INV", "seq:invoice");

      const created = await tx.invoice.create({
        data: {
          number,
          customerId: data.customerId || null,
          storeId: data.storeId || null,
          currency: data.currency,
          subtotal,
          discount: data.discount,
          tax: data.tax,
          total,
          note: data.note,
          createdById: user.id,
          items: { create: itemRows },
        },
        include: { items: true, customer: true, store: true },
      });

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
    return apiCreated(invoice);
  } catch (e) {
    return handleApiError(e);
  }
}
