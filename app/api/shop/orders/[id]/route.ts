import { prisma } from "@/lib/prisma";
import { kvSet } from "@/lib/kv";
import { getAuthUser } from "@/lib/auth";
import { generateInvoiceKhqr } from "@/lib/khqr";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) throw new HttpError(401, "Not authenticated");
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, customerId: user.id },
      include: {
        items: { select: { id: true, name: true, quantity: true, unitPrice: true, lineTotal: true } },
        payments: { select: { id: true, method: true, amount: true, status: true, createdAt: true } },
      },
    });
    if (!invoice) throw new HttpError(404, "Order not found");
    return apiSuccess(invoice);
  } catch (e) {
    return handleApiError(e);
  }
}
