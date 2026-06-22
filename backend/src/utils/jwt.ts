import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";

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

export function signAccessToken(userId: string, role: string): string {
  const payload: AccessPayload = { sub: userId, role, type: "access" };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });
}

/** Creates a refresh token and stores its id in Redis so it can be revoked. */
export async function issueRefreshToken(userId: string): Promise<string> {
  const jti = randomUUID();
  const payload: RefreshPayload = { sub: userId, jti, type: "refresh" };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });
  // TTL in seconds derived from the JWT exp claim
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 604800;
  await redis.set(refreshKey(userId, jti), "1", "EX", Math.max(ttl, 1));
  return token;
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
}

/** Verifies a refresh token AND that it is still present in Redis (not revoked). */
export async function verifyRefreshToken(token: string): Promise<RefreshPayload> {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
  const exists = await redis.get(refreshKey(payload.sub, payload.jti));
  if (!exists) throw new Error("Refresh token revoked");
  return payload;
}

export async function revokeRefreshToken(userId: string, jti: string): Promise<void> {
  await redis.del(refreshKey(userId, jti));
}

export async function revokeAllSessions(userId: string): Promise<void> {
  const keys = await redis.keys(`refresh:${userId}:*`);
  if (keys.length) await redis.del(keys);
}
