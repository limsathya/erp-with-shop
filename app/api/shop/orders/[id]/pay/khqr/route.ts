import { prisma } from "@/lib/prisma";
import { kvSet } from "@/lib/kv";
import { getAuthUser } from "@/lib/auth";
import { generateInvoiceKhqr } from "@/lib/khqr";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) throw new HttpError(401, "Not authenticated");
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, customerId: user.id },
    });
    if (!invoice) throw new HttpError(404, "Order not found");
    if (invoice.status === "PAID") throw new HttpError(400, "Order already paid");

    const { qr, md5 } = generateInvoiceKhqr({
      amount: Number(invoice.total),
      currency: invoice.currency,
      billNumber: invoice.number,
    });
    await kvSet(`khqr:${md5}`, invoice.id, 900);
    return apiSuccess({ qr, md5, amount: Number(invoice.total), currency: invoice.currency, invoiceNumber: invoice.number });
  } catch (e) {
    return handleApiError(e);
  }
}
