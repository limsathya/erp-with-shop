import { verifyAccessToken } from "./jwt";

export interface AuthUser {
  id: string;
  role: string;
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = await verifyAccessToken(header.slice(7));
    return { id: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await getAuthUser(request);
  if (!user) throw new (await import("./api-utils")).HttpError(401, "Not authenticated");
  return user;
}

export async function requireRoles(
  request: Request,
  ...roles: string[]
): Promise<AuthUser> {
  const user = await requireAuth(request);
  if (roles.length && !roles.includes(user.role)) {
    throw new (await import("./api-utils")).HttpError(403, "Insufficient permissions");
  }
  return user;
}
