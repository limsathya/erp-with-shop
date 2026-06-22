import Redis from "ioredis";
import { env } from "./env.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (e) => console.error("Redis error:", e.message));

/** Cache JSON with a TTL (seconds). Returns the fresh value. */
export async function cacheJson<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>
): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    /* cache miss / redis down → fall through to producer */
  }
  const value = await producer();
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    /* ignore cache write failures */
  }
  return value;
}

export async function invalidate(prefix: string): Promise<void> {
  try {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length) await redis.del(keys);
  } catch {
    /* ignore */
  }
}
