import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleApiError, apiSuccess, apiCreated, HttpError } from "@/lib/api-utils";

const input = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const q = req.nextUrl.searchParams.get("search") || "";
    const customers = await prisma.customer.findMany({
      where: q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }] } : {},
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(customers);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth(req);
    const data = input.parse(await req.json());
    if (data.email) {
      const existing = await prisma.customer.findUnique({ where: { email: data.email } });
      if (existing) throw new HttpError(409, "A customer with this email already exists");
    }
    const customer = await prisma.customer.create({ data });
    return apiCreated(customer);
  } catch (e) {
    return handleApiError(e);
  }
}
