import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { upload, fileUrl } from "../middleware/upload.js";
import { invalidate } from "../config/redis.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.search as string) || "";
    const categoryId = (req.query.categoryId as string) || undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);

    const where = {
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
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, movements: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!product) throw new HttpError(404, "Product not found");
    res.json(product);
  })
);

const productInput = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  nameKm: z.string().optional(),
  nameZh: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative().default(0),
  stock: z.coerce.number().int().default(0),
  lowStockAt: z.coerce.number().int().default(5),
  categoryId: z.string().optional().nullable(),
});

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const data = productInput.parse(req.body);
    const product = await prisma.product.create({
      data: {
        ...data,
        categoryId: data.categoryId || null,
        imageUrl: req.file ? fileUrl(req.file.filename) : null,
        movements: data.stock
          ? { create: { type: "IN", quantity: data.stock, note: "Initial stock" } }
          : undefined,
      },
      include: { category: true },
    });
    await invalidate("dashboard:");
    res.status(201).json(product);
  })
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const data = productInput.partial().parse(req.body);
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Product not found");

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...data,
        categoryId: data.categoryId === undefined ? undefined : data.categoryId || null,
        ...(req.file ? { imageUrl: fileUrl(req.file.filename) } : {}),
      },
      include: { category: true },
    });
    await invalidate("dashboard:");
    res.json(product);
  })
);

// Adjust stock and record an inventory movement (ERP audit trail).
router.post(
  "/:id/stock",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { type, quantity, note } = z
      .object({
        type: z.enum(["IN", "OUT", "ADJUST"]),
        quantity: z.coerce.number().int(),
        note: z.string().optional(),
      })
      .parse(req.body);

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.findUnique({ where: { id: req.params.id } });
      if (!p) throw new HttpError(404, "Product not found");
      const delta = type === "OUT" ? -Math.abs(quantity) : type === "IN" ? Math.abs(quantity) : quantity;
      await tx.inventoryMovement.create({
        data: { productId: p.id, type, quantity: Math.abs(quantity), note },
      });
      return tx.product.update({
        where: { id: p.id },
        data: { stock: Math.max(0, p.stock + delta) },
      });
    });
    await invalidate("dashboard:");
    res.json(product);
  })
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    await prisma.product.delete({ where: { id: req.params.id } });
    await invalidate("dashboard:");
    res.json({ ok: true });
  })
);

export default router;
