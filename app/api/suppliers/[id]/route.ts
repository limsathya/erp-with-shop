import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth";
import { handleApiError, apiSuccess } from "@/lib/api-utils";

const input = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER");
    const data = input.parse(await req.json());
    const supplier = await prisma.supplier.update({ where: { id: params.id }, data });
    return apiSuccess(supplier);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER");
    await prisma.supplier.delete({ where: { id: params.id } });
    return apiSuccess({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
