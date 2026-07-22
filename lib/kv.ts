import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.REDIS_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

/** Cache JSON with a TTL (seconds). Returns the fresh value. */
export async function cacheJson<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>
): Promise<T> {
  try {
    const hit = await redis.get<string>(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    /* cache miss / redis down → fall through to producer */
  }
  const value = await producer();
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch {
    /* ignore cache write failures */
  }
  return value;
}

export async function invalidate(prefix: string): Promise<void> {
  try {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length) await redis.del(...keys);
  } catch {
    /* ignore */
  }
}

export async function kvIncr(key: string): Promise<number> {
  try {
    return await redis.incr(key);
  } catch {
    return Date.now() % 1_000_000;
  }
}

export async function kvGet(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: string, ex?: number): Promise<void> {
  try {
    if (ex) await redis.set(key, value, { ex });
    else await redis.set(key, value);
  } catch {
    /* ignore */
  }
}

export async function kvDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    /* ignore */
  }
}
