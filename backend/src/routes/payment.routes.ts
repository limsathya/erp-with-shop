import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { redis, invalidate } from "../config/redis.js";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { generateInvoiceKhqr, checkBakongTransaction } from "../utils/khqr.js";

const router = Router();
const md5Key = (md5: string) => `khqr:${md5}`;

// Generate a KHQR payment code for an invoice.
router.post(
  "/khqr",
  authenticate,
  asyncHandler(async (req, res) => {
    const { invoiceId } = z.object({ invoiceId: z.string() }).parse(req.body);
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new HttpError(404, "Invoice not found");
    if (invoice.status === "PAID") throw new HttpError(400, "Invoice already paid");

    const amount = Number(invoice.total);
    const { qr, md5 } = generateInvoiceKhqr({
      amount,
      currency: invoice.currency,
      billNumber: invoice.number,
    });

    // Remember which invoice this QR pays, for 15 minutes.
    try {
      await redis.set(md5Key(md5), invoice.id, "EX", 900);
    } catch {
      /* ignore */
    }

    res.json({ qr, md5, amount, currency: invoice.currency, invoiceNumber: invoice.number });
  })
);

// Check whether a KHQR (by md5) has been paid via the Bakong API, then settle.
router.get(
  "/status/:md5",
  authenticate,
  asyncHandler(async (req, res) => {
    const md5 = req.params.md5;
    const invoiceId = await redis.get(md5Key(md5)).catch(() => null);
    if (!invoiceId) {
      return res.json({ paid: false, reason: "QR expired or unknown" });
    }

    const { paid, raw } = await checkBakongTransaction(md5);
    if (!paid) return res.json({ paid: false, raw });

    // Settle once (idempotent): mark paid + record a payment.
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });
    if (invoice && invoice.status !== "PAID") {
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
    }
    res.json({ paid: true });
  })
);

// Record a cash or card payment manually.
router.post(
  "/manual",
  authenticate,
  asyncHandler(async (req, res) => {
    const { invoiceId, method, amount } = z
      .object({
        invoiceId: z.string(),
        method: z.enum(["CASH", "CARD"]),
        amount: z.coerce.number().positive(),
      })
      .parse(req.body);

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new HttpError(404, "Invoice not found");

    await prisma.$transaction([
      prisma.payment.create({
        data: { invoiceId, method, amount, currency: invoice.currency, status: "COMPLETED" },
      }),
      prisma.invoice.update({ where: { id: invoiceId }, data: { status: "PAID" } }),
    ]);
    await invalidate("dashboard:");
    res.json({ ok: true });
  })
);

export default router;
