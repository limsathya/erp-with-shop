import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

const storeInput = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  active: z.boolean().optional(),
});

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const q = (req.query.search as string) || "";
    const items = await prisma.store.findMany({
      where: q
        ? { OR: [{ name: { contains: q } }, { code: { contains: q } }] }
        : {},
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  })
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const store = await prisma.store.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { users: true, visits: true } } },
    });
    if (!store) throw new HttpError(404, "Store not found");
    res.json(store);
  })
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = storeInput.parse(req.body);
    const store = await prisma.store.create({ data });
    res.status(201).json(store);
  })
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = storeInput.partial().parse(req.body);
    const existing = await prisma.store.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Store not found");
    const store = await prisma.store.update({ where: { id: req.params.id }, data });
    res.json(store);
  })
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    await prisma.store.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

export default router;
