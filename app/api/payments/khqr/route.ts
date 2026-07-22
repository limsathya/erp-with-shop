import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { kvSet, kvGet, invalidate } from "@/lib/kv";
import { requireAuth } from "@/lib/auth";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";
import { generateInvoiceKhqr, checkBakongTransaction } from "@/lib/khqr";

const md5Key = (md5: string) => `khqr:${md5}`;

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const { invoiceId } = z.object({ invoiceId: z.string() }).parse(await req.json());
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new HttpError(404, "Invoice not found");
    if (invoice.status === "PAID") throw new HttpError(400, "Invoice already paid");

    const { qr, md5 } = generateInvoiceKhqr({
      amount: Number(invoice.total),
      currency: invoice.currency,
      billNumber: invoice.number,
    });
    await kvSet(md5Key(md5), invoice.id, 900);
    return apiSuccess({ qr, md5, amount: Number(invoice.total), currency: invoice.currency, invoiceNumber: invoice.number });
  } catch (e) {
    return handleApiError(e);
  }
}
