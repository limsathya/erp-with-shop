import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRoles } from "@/lib/auth";
import { handleApiError, apiSuccess, apiCreated, HttpError } from "@/lib/api-utils";

const visitInput = z.object({
  customerId: z.string().min(1),
  storeId: z.string().optional().nullable(),
  status: z.enum(["SCHEDULED", "CHECKED_IN", "COMPLETED", "CANCELLED"]).default("SCHEDULED"),
  scheduledAt: z.coerce.date(),
  note: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const q = req.nextUrl.searchParams.get("search") || "";
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const storeId = req.nextUrl.searchParams.get("storeId") || undefined;
    const customerId = req.nextUrl.searchParams.get("customerId") || undefined;
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Number(req.nextUrl.searchParams.get("pageSize")) || 20);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (storeId) where.storeId = storeId;
    if (customerId) where.customerId = customerId;
    if (q) where.customer = { OR: [{ name: { contains: q } }, { phone: { contains: q } }] };

    const [items, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        include: { customer: true, store: true },
        orderBy: { scheduledAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.visit.count({ where }),
    ]);
    return apiSuccess({ items, total, page, pageSize, pages: Math.ceil(total / pageSize) });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER", "STAFF");
    const data = visitInput.parse(await req.json());
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new HttpError(400, "Customer not found");
    if (data.storeId) {
      const store = await prisma.store.findUnique({ where: { id: data.storeId } });
      if (!store) throw new HttpError(400, "Store not found");
    }
    const visit = await prisma.visit.create({
      data: { ...data, storeId: data.storeId || null },
      include: { customer: true, store: true },
    });
    return apiCreated(visit);
  } catch (e) {
    return handleApiError(e);
  }
}
