import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRoles } from "@/lib/auth";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

const storeInput = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  active: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth(_req);
    const store = await prisma.store.findUnique({
      where: { id: params.id },
      include: { _count: { select: { users: true, visits: true } } },
    });
    if (!store) throw new HttpError(404, "Store not found");
    return apiSuccess(store);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER");
    const data = storeInput.parse(await req.json());
    const existing = await prisma.store.findUnique({ where: { id: params.id } });
    if (!existing) throw new HttpError(404, "Store not found");
    const store = await prisma.store.update({ where: { id: params.id }, data });
    return apiSuccess(store);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER");
    await prisma.store.delete({ where: { id: params.id } });
    return apiSuccess({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
