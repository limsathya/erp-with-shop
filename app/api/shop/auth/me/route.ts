import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const customer = await prisma.customer.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, phone: true },
    });
    if (!customer) throw new HttpError(401, "Customer not found");
    return apiSuccess(customer);
  } catch (e) {
    return handleApiError(e);
  }
}
