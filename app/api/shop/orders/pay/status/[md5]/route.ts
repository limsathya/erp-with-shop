import { prisma } from "@/lib/prisma";
import { kvGet, invalidate } from "@/lib/kv";
import { getAuthUser } from "@/lib/auth";
import { checkBakongTransaction } from "@/lib/khqr";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

export async function GET(req: Request, { params }: { params: { md5: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) throw new HttpError(401, "Not authenticated");
    const md5 = params.md5;
    const invoiceId = await kvGet(`khqr:${md5}`);
    if (!invoiceId) return apiSuccess({ paid: false, reason: "QR expired or unknown" });

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, customerId: user.id },
    });
    if (!invoice) return apiSuccess({ paid: false, reason: "Order not found" });
    if (invoice.status === "PAID") return apiSuccess({ paid: true });

    const { paid } = await checkBakongTransaction(md5);
    if (!paid) return apiSuccess({ paid: false });

    await prisma.$transaction([
      prisma.payment.create({ data: { invoiceId: invoice.id, method: "KHQR", amount: invoice.total, currency: invoice.currency, status: "COMPLETED", reference: md5 } }),
      prisma.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } }),
    ]);
    await invalidate("dashboard:");
    return apiSuccess({ paid: true });
  } catch (e) {
    return handleApiError(e);
  }
}
