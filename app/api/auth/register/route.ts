import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signAccessToken, issueRefreshToken } from "@/lib/jwt";
import { handleApiError, apiCreated, HttpError } from "@/lib/api-utils";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const data = schema.parse(await req.json());
    const count = await prisma.user.count();
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: await hashPassword(data.password),
        role: count === 0 ? "ADMIN" : "STAFF",
      },
    });
    const accessToken = await signAccessToken(user.id, user.role);
    const refreshToken = await issueRefreshToken(user.id);
    return apiCreated({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
      accessToken,
      refreshToken,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
