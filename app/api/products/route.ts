import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidate } from "@/lib/kv";
import { requireRoles } from "@/lib/auth";
import { handleApiError, apiSuccess, apiCreated, HttpError } from "@/lib/api-utils";
import { put } from "@vercel/blob";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("search") || "";
    const categoryId = req.nextUrl.searchParams.get("categoryId") || undefined;
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Number(req.nextUrl.searchParams.get("pageSize")) || 20);

    const where: Record<string, unknown> = {};
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

const productInput = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  nameKm: z.string().optional(),
  nameZh: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative().default(0),
  stock: z.coerce.number().int().default(0),
  lowStockAt: z.coerce.number().int().default(5),
  categoryId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER");
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const body: Record<string, unknown> = {};
    formData.forEach((v, k) => { if (k !== "image") body[k] = v; });
    const data = productInput.parse(body);

    let imageUrl: string | null = null;
    if (image && image.size > 0) {
      const blob = await put(`products/${Date.now()}-${image.name}`, image, { access: "public" });
      imageUrl = blob.url;
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        categoryId: data.categoryId || null,
        imageUrl,
        movements: data.stock
          ? { create: { type: "IN", quantity: data.stock, note: "Initial stock" } }
          : undefined,
      },
      include: { category: true },
    });
    await invalidate("dashboard:");
    return apiCreated(product);
  } catch (e) {
    return handleApiError(e);
  }
}
