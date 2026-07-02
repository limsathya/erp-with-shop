import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

const visitInput = z.object({
  customerId: z.string().min(1),
  storeId: z.string().optional().nullable(),
  status: z.enum(["SCHEDULED", "CHECKED_IN", "COMPLETED", "CANCELLED"]).default("SCHEDULED"),
  scheduledAt: z.coerce.date(),
  note: z.string().optional(),
});

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const q = (req.query.search as string) || "";
    const status = (req.query.status as string) || undefined;
    const storeId = (req.query.storeId as string) || undefined;
    const customerId = (req.query.customerId as string) || undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);

    const where = {
      ...(status ? { status: status as any } : {}),
      ...(storeId ? { storeId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(q
        ? {
            customer: {
              OR: [{ name: { contains: q } }, { phone: { contains: q } }],
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        include: { customer: true, store: true },
        orderBy: { scheduledAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.visit.count({ where }),
    ]);

    res.json({ items, total, page, pageSize, pages: Math.ceil(total / pageSize) });
  })
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const visit = await prisma.visit.findUnique({
      where: { id: req.params.id },
      include: { customer: true, store: true },
    });
    if (!visit) throw new HttpError(404, "Visit not found");
    res.json(visit);
  })
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  asyncHandler(async (req, res) => {
    const data = visitInput.parse(req.body);

    // Ensure customer exists — a visit must belong to a customer.
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) throw new HttpError(400, "Customer not found");

    if (data.storeId) {
      const store = await prisma.store.findUnique({ where: { id: data.storeId } });
      if (!store) throw new HttpError(400, "Store not found");
    }

    const visit = await prisma.visit.create({
      data: {
        customerId: data.customerId,
        storeId: data.storeId || null,
        status: data.status,
        scheduledAt: data.scheduledAt,
        note: data.note,
      },
      include: { customer: true, store: true },
    });
    res.status(201).json(visit);
  })
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  asyncHandler(async (req, res) => {
    const data = visitInput.partial().parse(req.body);
    const existing = await prisma.visit.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Visit not found");

    if (data.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) throw new HttpError(400, "Customer not found");
    }
    if (data.storeId) {
      const store = await prisma.store.findUnique({ where: { id: data.storeId } });
      if (!store) throw new HttpError(400, "Store not found");
    }

    const visit = await prisma.visit.update({
      where: { id: req.params.id },
      data: {
        ...data,
        storeId: data.storeId === undefined ? undefined : data.storeId || null,
      },
      include: { customer: true, store: true },
    });
    res.json(visit);
  })
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  asyncHandler(async (req, res) => {
    const { status } = z
      .object({ status: z.enum(["SCHEDULED", "CHECKED_IN", "COMPLETED", "CANCELLED"]) })
      .parse(req.body);
    const visit = await prisma.visit.update({
      where: { id: req.params.id },
      data: { status },
      include: { customer: true, store: true },
    });
    res.json(visit);
  })
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    await prisma.visit.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

export default router;
