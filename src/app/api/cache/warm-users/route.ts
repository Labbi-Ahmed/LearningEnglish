import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { redis, safeDel, safeSetNxEx } from "@/lib/cache/redis";
import { warmActiveUserCaches } from "@/lib/cache/warm-users";
import { writeLastRun } from "@/lib/cache/run-log";

const LOCK_KEY = "cache:warm-users:lock";
const LOCK_TTL_SECONDS = 10 * 60;

async function handle(req: Request) {
  const cronSecret = env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "cron_secret_unset" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!redis) {
    return NextResponse.json({ error: "cache_unavailable" }, { status: 503 });
  }

  const acquired = await safeSetNxEx(LOCK_KEY, "1", LOCK_TTL_SECONDS);
  if (!acquired) {
    return NextResponse.json({ already_running: true });
  }

  try {
    const result = await warmActiveUserCaches();
    await writeLastRun("users", "cron", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cache:warm-users] failed", err);
    return NextResponse.json({ error: "warm_failed" }, { status: 500 });
  } finally {
    await safeDel(LOCK_KEY);
  }
}

export const GET = handle;
export const POST = handle;
