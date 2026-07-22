import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const u = await prisma.user.findUnique({ where: { id: user.id } });
    if (!u) throw new HttpError(404, "User not found");
    return apiSuccess({
      user: { id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
