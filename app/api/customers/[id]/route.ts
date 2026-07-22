import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

const input = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth(req);
    const data = input.parse(await req.json());
    if (data.email) {
      const existing = await prisma.customer.findFirst({
        where: { email: data.email, NOT: { id: params.id } },
      });
      if (existing) throw new HttpError(409, "A customer with this email already exists");
    }
    const customer = await prisma.customer.update({ where: { id: params.id }, data });
    return apiSuccess(customer);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth(req);
    await prisma.customer.delete({ where: { id: params.id } });
    return apiSuccess({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
