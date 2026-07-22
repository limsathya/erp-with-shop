import { prisma } from "@/lib/prisma";
import { kvGet, invalidate } from "@/lib/kv";
import { requireAuth } from "@/lib/auth";
import { handleApiError, apiSuccess } from "@/lib/api-utils";
import { checkBakongTransaction } from "@/lib/khqr";

const md5Key = (md5: string) => `khqr:${md5}`;

export async function GET(req: Request, { params }: { params: { md5: string } }) {
  try {
    await requireAuth(req);
    const md5 = params.md5;
    const invoiceId = await kvGet(md5Key(md5));
    if (!invoiceId) return apiSuccess({ paid: false, reason: "QR expired or unknown" });

    const { paid } = await checkBakongTransaction(md5);
    if (!paid) return apiSuccess({ paid: false });

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });
    if (invoice && invoice.status !== "PAID") {
      await prisma.$transaction([
        prisma.payment.create({
          data: { invoiceId: invoice.id, method: "KHQR", amount: invoice.total, currency: invoice.currency, status: "COMPLETED", reference: md5 },
        }),
        prisma.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } }),
      ]);
      await invalidate("dashboard:");
    }
    return apiSuccess({ paid: true });
  } catch (e) {
    return handleApiError(e);
  }
}
