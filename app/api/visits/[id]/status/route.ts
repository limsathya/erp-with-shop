import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRoles } from "@/lib/auth";
import { handleApiError, apiSuccess } from "@/lib/api-utils";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER", "STAFF");
    const { status } = z.object({ status: z.enum(["SCHEDULED", "CHECKED_IN", "COMPLETED", "CANCELLED"]) }).parse(await req.json());
    const visit = await prisma.visit.update({
      where: { id: params.id },
      data: { status },
      include: { customer: true, store: true },
    });
    return apiSuccess(visit);
  } catch (e) {
    return handleApiError(e);
  }
}
