import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { kvSet, kvGet, kvDel } from "./kv";

const getAccessSecret = () =>
  new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || "fallback-access-secret-change-me");
const getRefreshSecret = () =>
  new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret-change-me");

export interface AccessPayload {
  sub: string;
  role: string;
  type: "access";
}

export interface RefreshPayload {
  sub: string;
  jti: string;
  type: "refresh";
}

const refreshKey = (userId: string, jti: string) => `refresh:${userId}:${jti}`;

export async function signAccessToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ sub: userId, role, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getAccessSecret());
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const jti = randomUUID();
  const token = await new SignJWT({ sub: userId, jti, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getRefreshSecret());
  await kvSet(refreshKey(userId, jti), "1", 604800);
  return token;
}

export async function verifyAccessToken(token: string): Promise<AccessPayload> {
  const { payload } = await jwtVerify(token, getAccessSecret());
  return payload as unknown as AccessPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshPayload> {
  const { payload } = await jwtVerify(token, getRefreshSecret());
  const p = payload as unknown as RefreshPayload;
  const exists = await kvGet(refreshKey(p.sub, p.jti));
  if (!exists) throw new Error("Refresh token revoked");
  return p;
}

export async function revokeRefreshToken(userId: string, jti: string): Promise<void> {
  await kvDel(refreshKey(userId, jti));
}

export async function revokeAllSessions(userId: string): Promise<void> {
  // Cannot list keys with prefix easily in Vercel KV, skip for now
  // In production, store session keys in a set per user
}
