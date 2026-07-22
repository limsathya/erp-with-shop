import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccessToken, issueRefreshToken, verifyRefreshToken, revokeRefreshToken } from "@/lib/jwt";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

const schema = z.object({ refreshToken: z.string() });

export async function POST(req: Request) {
  try {
    const { refreshToken } = schema.parse(await req.json());
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      throw new HttpError(401, "Invalid or expired refresh token");
    }
    await revokeRefreshToken(payload.sub, payload.jti);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) throw new HttpError(401, "Account unavailable");
    const accessToken = await signAccessToken(user.id, user.role);
    const newRefresh = await issueRefreshToken(user.id);
    return apiSuccess({ accessToken, refreshToken: newRefresh });
  } catch (e) {
    return handleApiError(e);
  }
}
