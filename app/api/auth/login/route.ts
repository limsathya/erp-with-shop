import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signAccessToken, issueRefreshToken } from "@/lib/jwt";
import { handleApiError, apiSuccess, HttpError } from "@/lib/api-utils";

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const { email, password } = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.active || !(await verifyPassword(password, user.password))) {
      throw new HttpError(401, "Invalid email or password");
    }
    const accessToken = await signAccessToken(user.id, user.role);
    const refreshToken = await issueRefreshToken(user.id);
    return apiSuccess({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
      accessToken,
      refreshToken,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
