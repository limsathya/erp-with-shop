import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { redis, invalidate } from "../config/redis.js";
import { env } from "../config/env.js";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import {
  signAccessToken,
  issueRefreshToken,
  revokeRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
} from "../utils/jwt.js";
import { generateInvoiceKhqr } from "../utils/khqr.js";

const router = Router();

const shopCustomerInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

const shopLoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const productListWhere = {
  active: true,
  stock: { gt: 0 },
};

router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const q = (req.query.search as string) || "";
    const categoryId = (req.query.categoryId as string) || undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 48);
    const where = {
      ...productListWhere,
      ...(q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : {}),
      ...(categoryId ? { categoryId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);
    res.json({ items, total, page, pageSize, pages: Math.ceil(total / pageSize) });
  })
);

router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { products: { some: { active: true, stock: { gt: 0 } } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.json({ items: categories });
  })
);

router.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id, active: true },
      include: { category: true },
    });
    if (!product) throw new HttpError(404, "Product not found");
    res.json(product);
  })
);

const orderInput = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.coerce.number().int().positive(),
      })
    )
    .min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

async function nextNumber(prefix: string, key: string): Promise<string> {
  let n: number;
  try {
    n = await redis.incr(key);
  } catch {
    n = Date.now() % 1_000_000;
  }
  return `${prefix}-${String(n).padStart(6, "0")}`;
}

router.post(
  "/auth/register",
  asyncHandler(async (req, res) => {
    const { name, email, password, phone } = shopCustomerInput.parse(req.body);
    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, "An account with this email already exists");

    const hashed = await bcrypt.hash(password, 10);
    const customer = await prisma.customer.create({
      data: { name, email, phone, password: hashed },
    });

    const accessToken = signAccessToken(customer.id, "CUSTOMER");
    const refreshToken = await issueRefreshToken(customer.id);
    res.status(201).json({
      accessToken,
      refreshToken,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
    });
  })
);

router.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const { email, password } = shopLoginInput.parse(req.body);
    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer || !customer.password) throw new HttpError(401, "Invalid email or password");
    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) throw new HttpError(401, "Invalid email or password");

    const accessToken = signAccessToken(customer.id, "CUSTOMER");
    const refreshToken = await issueRefreshToken(customer.id);
    res.json({
      accessToken,
      refreshToken,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
    });
  })
);

router.post(
  "/auth/logout",
  asyncHandler(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    // We do not verify on logout, just revoke the Redis key if it exists.
    try {
      const payload = JSON.parse(Buffer.from(refreshToken.split(".")[1], "base64").toString()) as {
        sub?: string;
        jti?: string;
      };
      if (payload.sub && payload.jti) await revokeRefreshToken(payload.sub, payload.jti);
    } catch {
      /* ignore malformed tokens */
    }
    res.json({ ok: true });
  })
);

router.post(
  "/auth/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      throw new HttpError(401, "Invalid or expired refresh token");
    }
    await revokeRefreshToken(payload.sub, payload.jti);
    const customer = await prisma.customer.findUnique({ where: { id: payload.sub } });
    if (!customer) throw new HttpError(401, "Account unavailable");
    const accessToken = signAccessToken(customer.id, "CUSTOMER");
    const newRefresh = await issueRefreshToken(customer.id);
    res.json({ accessToken, refreshToken: newRefresh });
  })
);

router.get(
  "/auth/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, phone: true },
    });
    if (!customer) throw new HttpError(401, "Customer not found");
    res.json(customer);
  })
);

router.get(
  "/orders",
  authenticate,
  asyncHandler(async (req, res) => {
    const items = await prisma.invoice.findMany({
      where: { customerId: req.user!.id },
      include: { items: { select: { id: true, name: true, quantity: true, unitPrice: true, lineTotal: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  })
);

router.get(
  "/orders/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, customerId: req.user!.id },
      include: {
        items: { select: { id: true, name: true, quantity: true, unitPrice: true, lineTotal: true } },
        payments: { select: { id: true, method: true, amount: true, status: true, createdAt: true } },
      },
    });
    if (!invoice) throw new HttpError(404, "Order not found");
    res.json(invoice);
  })
);

router.post(
  "/orders/:id/pay/khqr",
  authenticate,
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, customerId: req.user!.id },
    });
    if (!invoice) throw new HttpError(404, "Order not found");
    if (invoice.status === "PAID") throw new HttpError(400, "Order already paid");

    const { qr, md5 } = generateInvoiceKhqr({
      amount: Number(invoice.total),
      currency: invoice.currency,
      billNumber: invoice.number,
    });

    try {
      await redis.set(`khqr:${md5}`, invoice.id, "EX", 900);
    } catch {
      /* ignore */
    }

    res.json({ qr, md5, amount: Number(invoice.total), currency: invoice.currency, invoiceNumber: invoice.number });
  })
);

router.get(
  "/orders/pay/status/:md5",
  authenticate,
  asyncHandler(async (req, res) => {
    const md5 = req.params.md5;
    const invoiceId = await redis.get(`khqr:${md5}`).catch(() => null);
    if (!invoiceId) return res.json({ paid: false, reason: "QR expired or unknown" });

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, customerId: req.user!.id },
    });
    if (!invoice) return res.json({ paid: false, reason: "Order not found" });
    if (invoice.status === "PAID") return res.json({ paid: true });

    // Poll Bakong if configured.
    if (env.BAKONG_API_TOKEN) {
      const bakongRes = await fetch(`${env.BAKONG_API_URL}/v1/check_transaction_by_md5`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.BAKONG_API_TOKEN}`,
        },
        body: JSON.stringify({ md5 }),
      });
      const raw = await bakongRes.json().catch(() => ({}));
      const settled = (raw as any)?.responseCode === 0 && !!(raw as any)?.data;
      if (settled) {
        await prisma.$transaction([
          prisma.payment.create({
            data: {
              invoiceId: invoice.id,
              method: "KHQR",
              amount: invoice.total,
              currency: invoice.currency,
              status: "COMPLETED",
              reference: md5,
            },
          }),
          prisma.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } }),
        ]);
        await invalidate("dashboard:");
        return res.json({ paid: true });
      }
    }

    res.json({ paid: false });
  })
);

router.post(
  "/orders",
  asyncHandler(async (req, res) => {
    const data = orderInput.parse(req.body);

    // Identify the customer: signed-in token > guest email > create a guest customer.
    let customerId: string | undefined;
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      try {
        const payload = verifyAccessToken(auth.slice(7));
        if (payload.role === "CUSTOMER") customerId = payload.sub;
      } catch {
        /* ignore invalid token */
      }
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
        return {
          productId: product.id,
          name: product.name,
          quantity: i.quantity,
          unitPrice: Number(product.price),
          lineTotal,
        };
      });

      const number = await nextNumber("ORD", "seq:shop-order");

      // For guest checkouts, link to or create a customer record.
      if (!customerId) {
        if (data.email) {
          const existing = await tx.customer.findUnique({ where: { email: data.email } });
          if (existing) {
            if (existing.password) {
              throw new HttpError(409, "This email is registered. Please sign in to place an order.");
            }
            customerId = existing.id;
          }
        }
        if (!customerId) {
          const guest = await tx.customer.create({
            data: {
              name: data.name || "Guest",
              email: data.email || `${number.toLowerCase().replace(/-/g, "")}@guest.local`,
              phone: data.phone || null,
            },
          });
          customerId = guest.id;
        }
      }

      const created = await tx.invoice.create({
        data: {
          number,
          customerId,
          currency: "USD",
          subtotal,
          total: subtotal,
          status: "UNPAID",
          items: { create: itemRows },
        },
        include: { items: true },
      });

      for (const row of itemRows) {
        await tx.product.update({
          where: { id: row.productId },
          data: { stock: { decrement: row.quantity } },
        });
        await tx.inventoryMovement.create({
          data: { productId: row.productId, type: "OUT", quantity: row.quantity, note: `Shop order ${number}` },
        });
      }
      return created;
    });

    await invalidate("dashboard:");
    res.status(201).json({ id: invoice.id, number: invoice.number, status: invoice.status, total: invoice.total });
  })
);

export default router;
