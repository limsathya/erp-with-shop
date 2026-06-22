import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";

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
  asyncHandler(async (req, res) => {
    const q = (req.query.search as string) || "";
    const customers = await prisma.customer.findMany({
      where: q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }] } : {},
      orderBy: { createdAt: "desc" },
    });
    res.json(customers);
  })
);

router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = input.parse(req.body);
    const customer = await prisma.customer.create({ data });
    res.status(201).json(customer);
  })
);

router.put(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = input.partial().parse(req.body);
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data });
    res.json(customer);
  })
);

router.delete(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

export default router;
