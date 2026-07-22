import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("search") || "";
    const categoryId = req.nextUrl.searchParams.get("categoryId") || undefined;
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Number(req.nextUrl.searchParams.get("pageSize")) || 48);

    const where: Record<string, unknown> = { active: true, stock: { gt: 0 } };
    if (q) where.OR = [{ name: { contains: q } }, { sku: { contains: q } }];
    if (categoryId) where.categoryId = categoryId;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);
    return apiSuccess({ items, total, page, pageSize, pages: Math.ceil(total / pageSize) });
  } catch (e) {
    return handleApiError(e);
  }
}
