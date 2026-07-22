import { put } from "@vercel/blob";
import { requireAuth } from "@/lib/auth";
import { handleApiError, apiCreated, HttpError } from "@/lib/api-utils";

export async function POST(req: Request) {
  try {
    await requireAuth(req);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) throw new HttpError(400, "No file uploaded");

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) {
      throw new HttpError(415, "Only JPG, PNG, WEBP or GIF images are allowed");
    }

    const blob = await put(`uploads/${Date.now()}-${file.name}`, file, { access: "public" });
    return apiCreated({ url: blob.url, filename: file.name });
  } catch (e) {
    return handleApiError(e);
  }
}
