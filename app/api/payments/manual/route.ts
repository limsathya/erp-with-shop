import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidate } from "@/lib/kv";
import { requireAuth } from "@/lib/auth";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

export async function POST(req: Request) {
  try {
    await requireAuth(req);
    const { invoiceId, method, amount } = z
      .object({
        invoiceId: z.string(),
        method: z.enum(["CASH", "CARD"]),
        amount: z.coerce.number().positive(),
      })
      .parse(await req.json());

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new HttpError(404, "Invoice not found");

    await prisma.$transaction([
      prisma.payment.create({ data: { invoiceId, method, amount, currency: invoice.currency, status: "COMPLETED" } }),
      prisma.invoice.update({ where: { id: invoiceId }, data: { status: "PAID" } }),
    ]);
    await invalidate("dashboard:");
    return apiSuccess({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
