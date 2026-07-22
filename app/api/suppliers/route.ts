import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRoles } from "@/lib/auth";
import { handleApiError, apiSuccess, apiCreated } from "@/lib/api-utils";

const input = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    const suppliers = await prisma.supplier.findMany({ orderBy: { createdAt: "desc" } });
    return apiSuccess(suppliers);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER");
    const data = input.parse(await req.json());
    const supplier = await prisma.supplier.create({ data });
    return apiCreated(supplier);
  } catch (e) {
    return handleApiError(e);
  }
}
