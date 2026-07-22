import { z } from "zod";
import { verifyRefreshToken, revokeRefreshToken } from "@/lib/jwt";
import { handleApiError, apiSuccess } from "@/lib/api-utils";

const schema = z.object({ refreshToken: z.string() });

export async function POST(req: Request) {
  try {
    const { refreshToken } = schema.parse(await req.json());
    try {
      const payload = await verifyRefreshToken(refreshToken);
      await revokeRefreshToken(payload.sub, payload.jti);
    } catch { /* already invalid */ }
    return apiSuccess({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
