import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidate } from "@/lib/kv";
import { requireAuth } from "@/lib/auth";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth(_req);
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true, store: true,
        items: { include: { product: true } },
        payments: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!invoice) throw new HttpError(404, "Invoice not found");
    return apiSuccess(invoice);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth(req);
    const { status } = z.object({ status: z.enum(["DRAFT", "UNPAID", "PAID", "CANCELLED"]) }).parse(await req.json());
    const invoice = await prisma.invoice.update({ where: { id: params.id }, data: { status } });
    await invalidate("dashboard:");
    return apiSuccess(invoice);
  } catch (e) {
    return handleApiError(e);
  }
}
