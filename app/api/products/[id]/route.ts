import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidate } from "@/lib/kv";
import { requireRoles } from "@/lib/auth";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";
import { put } from "@vercel/blob";

const productInput = z.object({
  sku: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  nameKm: z.string().optional(),
  nameZh: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative().optional(),
  cost: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().optional(),
  lowStockAt: z.coerce.number().int().optional(),
  categoryId: z.string().optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { category: true, movements: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!product) throw new HttpError(404, "Product not found");
    return apiSuccess(product);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER");
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const body: Record<string, unknown> = {};
    formData.forEach((v, k) => { if (k !== "image") body[k] = v; });
    const data = productInput.parse(body);

    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing) throw new HttpError(404, "Product not found");

    let imageUrl = undefined;
    if (image && image.size > 0) {
      const blob = await put(`products/${Date.now()}-${image.name}`, image, { access: "public" });
      imageUrl = blob.url;
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...data,
        categoryId: data.categoryId === undefined ? undefined : data.categoryId || null,
        ...(imageUrl ? { imageUrl } : {}),
      },
      include: { category: true },
    });
    await invalidate("dashboard:");
    return apiSuccess(product);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER");
    await prisma.product.delete({ where: { id: params.id } });
    await invalidate("dashboard:");
    return apiSuccess({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
