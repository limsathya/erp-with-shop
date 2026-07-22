import { prisma } from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/lib/api-utils";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { products: { some: { active: true, stock: { gt: 0 } } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return apiSuccess({ items: categories });
  } catch (e) {
    return handleApiError(e);
  }
}
