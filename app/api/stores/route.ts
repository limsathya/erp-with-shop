import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRoles } from "@/lib/auth";
import { handleApiError, apiSuccess, apiCreated, HttpError } from "@/lib/api-utils";

const storeInput = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const q = req.nextUrl.searchParams.get("search") || "";
    const items = await prisma.store.findMany({
      where: q ? { OR: [{ name: { contains: q } }, { code: { contains: q } }] } : {},
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(items);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER");
    const data = storeInput.parse(await req.json());
    const store = await prisma.store.create({ data });
    return apiCreated(store);
  } catch (e) {
    return handleApiError(e);
  }
}
