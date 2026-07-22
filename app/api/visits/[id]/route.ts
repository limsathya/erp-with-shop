import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRoles } from "@/lib/auth";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

const visitInput = z.object({
  customerId: z.string().min(1).optional(),
  storeId: z.string().optional().nullable(),
  status: z.enum(["SCHEDULED", "CHECKED_IN", "COMPLETED", "CANCELLED"]).optional(),
  scheduledAt: z.coerce.date().optional(),
  note: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth(_req);
    const visit = await prisma.visit.findUnique({
      where: { id: params.id },
      include: { customer: true, store: true },
    });
    if (!visit) throw new HttpError(404, "Visit not found");
    return apiSuccess(visit);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER", "STAFF");
    const data = visitInput.parse(await req.json());
    const existing = await prisma.visit.findUnique({ where: { id: params.id } });
    if (!existing) throw new HttpError(404, "Visit not found");
    if (data.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) throw new HttpError(400, "Customer not found");
    }
    if (data.storeId) {
      const store = await prisma.store.findUnique({ where: { id: data.storeId } });
      if (!store) throw new HttpError(400, "Store not found");
    }
    const visit = await prisma.visit.update({
      where: { id: params.id },
      data: { ...data, storeId: data.storeId === undefined ? undefined : data.storeId || null },
      include: { customer: true, store: true },
    });
    return apiSuccess(visit);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER");
    await prisma.visit.delete({ where: { id: params.id } });
    return apiSuccess({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
