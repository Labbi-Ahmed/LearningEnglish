import "server-only";

import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

const url = env.UPSTASH_REDIS_REST_URL;
const token = env.UPSTASH_REDIS_REST_TOKEN;

export const redis: Redis | null =
  url && token ? new Redis({ url, token }) : null;

function logError(op: string, err: unknown) {
  console.error(`[cache:redis] ${op}`, err);
}

export async function safeGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return (await redis.get<T>(key)) ?? null;
  } catch (err) {
    logError(`get ${key}`, err);
    return null;
  }
}

export async function safeSet(
  key: string,
  value: unknown,
  ttlSeconds?: number,
): Promise<void> {
  if (!redis) return;
  try {
    if (ttlSeconds && ttlSeconds > 0) {
      await redis.set(key, value, { ex: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
  } catch (err) {
    logError(`set ${key}`, err);
  }
}

export async function safeSadd(key: string, member: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.sadd(key, member);
  } catch (err) {
    logError(`sadd ${key}`, err);
  }
}

export async function safeSaddMany(
  key: string,
  members: readonly string[],
): Promise<void> {
  if (!redis || members.length === 0) return;
  try {
    await redis.sadd(key, members[0]!, ...members.slice(1));
  } catch (err) {
    logError(`sadd ${key} *many*`, err);
  }
}

export async function safeSrem(key: string, member: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.srem(key, member);
  } catch (err) {
    logError(`srem ${key}`, err);
  }
}

export async function safeSismember(
  key: string,
  member: string,
): Promise<boolean | null> {
  if (!redis) return null;
  try {
    const r = await redis.sismember(key, member);
    return r === 1;
  } catch (err) {
    logError(`sismember ${key}`, err);
    return null;
  }
}

export async function safeExists(key: string): Promise<boolean | null> {
  if (!redis) return null;
  try {
    const n = await redis.exists(key);
    return n > 0;
  } catch (err) {
    logError(`exists ${key}`, err);
    return null;
  }
}

export async function safeExpire(
  key: string,
  ttlSeconds: number,
): Promise<void> {
  if (!redis || ttlSeconds <= 0) return;
  try {
    await redis.expire(key, ttlSeconds);
  } catch (err) {
    logError(`expire ${key}`, err);
  }
}
