import { prisma } from "@/lib/prisma";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id, active: true },
      include: { category: true },
    });
    if (!product) throw new HttpError(404, "Product not found");
    return apiSuccess(product);
  } catch (e) {
    return handleApiError(e);
  }
}
