import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

const input = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    const suppliers = await prisma.supplier.findMany({ orderBy: { createdAt: "desc" } });
    res.json(suppliers);
  })
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = input.parse(req.body);
    const supplier = await prisma.supplier.create({ data });
    res.status(201).json(supplier);
  })
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = input.partial().parse(req.body);
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
    res.json(supplier);
  })
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

export default router;
