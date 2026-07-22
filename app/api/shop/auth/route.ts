import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, issueRefreshToken } from "@/lib/jwt";
import { handleApiError, apiSuccess, apiCreated, HttpError } from "@/lib/api-utils";

const shopCustomerInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

const shopLoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request, { params }: { params?: { action?: string[] } }) {
  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json();

    if (action === "register") {
      const { name, email, password, phone } = shopCustomerInput.parse(body);
      const existing = await prisma.customer.findUnique({ where: { email } });
      if (existing) throw new HttpError(409, "An account with this email already exists");
      const hashed = await bcrypt.hash(password, 10);
      const customer = await prisma.customer.create({ data: { name, email, phone, password: hashed } });
      const accessToken = await signAccessToken(customer.id, "CUSTOMER");
      const refreshToken = await issueRefreshToken(customer.id);
      return apiCreated({
        accessToken, refreshToken,
        customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
      });
    }

    if (action === "login") {
      const { email, password } = shopLoginInput.parse(body);
      const customer = await prisma.customer.findUnique({ where: { email } });
      if (!customer || !customer.password) throw new HttpError(401, "Invalid email or password");
      const valid = await bcrypt.compare(password, customer.password);
      if (!valid) throw new HttpError(401, "Invalid email or password");
      const accessToken = await signAccessToken(customer.id, "CUSTOMER");
      const refreshToken = await issueRefreshToken(customer.id);
      return apiSuccess({
        accessToken, refreshToken,
        customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
      });
    }

    if (action === "logout") {
      return apiSuccess({ ok: true });
    }

    if (action === "refresh") {
      const { refreshToken } = z.object({ refreshToken: z.string() }).parse(body);
      const { verifyRefreshToken, revokeRefreshToken: revoke } = await import("@/lib/jwt");
      let payload;
      try { payload = await verifyRefreshToken(refreshToken); } catch { throw new HttpError(401, "Invalid or expired refresh token"); }
      await revoke(payload.sub, payload.jti);
      const customer = await prisma.customer.findUnique({ where: { id: payload.sub } });
      if (!customer) throw new HttpError(401, "Account unavailable");
      const accessToken = await signAccessToken(customer.id, "CUSTOMER");
      const newRefresh = await issueRefreshToken(customer.id);
      return apiSuccess({ accessToken, refreshToken: newRefresh });
    }

    throw new HttpError(404, "Not found");
  } catch (e) {
    return handleApiError(e);
  }
}
