import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidate } from "@/lib/kv";
import { requireRoles } from "@/lib/auth";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoles(req, "ADMIN", "MANAGER");
    const { type, quantity, note } = z
      .object({
        type: z.enum(["IN", "OUT", "ADJUST"]),
        quantity: z.coerce.number().int(),
        note: z.string().optional(),
      })
      .parse(await req.json());

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.findUnique({ where: { id: params.id } });
      if (!p) throw new HttpError(404, "Product not found");
      const delta = type === "OUT" ? -Math.abs(quantity) : type === "IN" ? Math.abs(quantity) : quantity;
      await tx.inventoryMovement.create({
        data: { productId: p.id, type, quantity: Math.abs(quantity), note },
      });
      return tx.product.update({
        where: { id: p.id },
        data: { stock: Math.max(0, p.stock + delta) },
      });
    });
    await invalidate("dashboard:");
    return apiSuccess(product);
  } catch (e) {
    return handleApiError(e);
  }
}
