import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { kvIncr, invalidate } from "@/lib/kv";
import { getAuthUser } from "@/lib/auth";
import { verifyAccessToken } from "@/lib/jwt";
import { handleApiError, apiCreated, apiSuccess, HttpError } from "@/lib/api-utils";

const orderInput = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.coerce.number().int().positive() })).min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

async function nextNumber(prefix: string, key: string): Promise<string> {
  const n = await kvIncr(key);
  return `${prefix}-${String(n).padStart(6, "0")}`;
}

export async function POST(req: Request) {
  try {
    const data = orderInput.parse(await req.json());
    let customerId: string | undefined;

    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      try {
        const payload = await verifyAccessToken(auth.slice(7));
        if (payload.role === "CUSTOMER") customerId = payload.sub;
      } catch { /* ignore */ }
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
        if (product.stock < i.quantity) {
          throw new HttpError(409, `Not enough stock for ${product.name}. Only ${product.stock} left.`);
        }
        const lineTotal = Number(product.price) * i.quantity;
        subtotal += lineTotal;
        return { productId: product.id, name: product.name, quantity: i.quantity, unitPrice: Number(product.price), lineTotal };
      });

      const number = await nextNumber("ORD", "seq:shop-order");

      if (!customerId) {
        if (data.email) {
          const existing = await tx.customer.findUnique({ where: { email: data.email } });
          if (existing) {
            if (existing.password) throw new HttpError(409, "This email is registered. Please sign in to place an order.");
            customerId = existing.id;
          }
        }
        if (!customerId) {
          const guest = await tx.customer.create({
            data: { name: data.name || "Guest", email: data.email || `${number.toLowerCase().replace(/-/g, "")}@guest.local`, phone: data.phone || null },
          });
          customerId = guest.id;
        }
      }

      const created = await tx.invoice.create({
        data: { number, customerId, currency: "USD", subtotal, total: subtotal, status: "UNPAID", items: { create: itemRows } },
        include: { items: true },
      });

      for (const row of itemRows) {
        await tx.product.update({ where: { id: row.productId }, data: { stock: { decrement: row.quantity } } });
        await tx.inventoryMovement.create({ data: { productId: row.productId, type: "OUT", quantity: row.quantity, note: `Shop order ${number}` } });
      }
      return created;
    });

    await invalidate("dashboard:");
    return apiCreated({ id: invoice.id, number: invoice.number, status: invoice.status, total: invoice.total });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) throw new HttpError(401, "Not authenticated");
    const items = await prisma.invoice.findMany({
      where: { customerId: user.id },
      include: { items: { select: { id: true, name: true, quantity: true, unitPrice: true, lineTotal: true } } },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess({ items });
  } catch (e) {
    return handleApiError(e);
  }
}
