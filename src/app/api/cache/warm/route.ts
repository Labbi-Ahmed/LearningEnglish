import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { redis, safeDel, safeSetNxEx } from "@/lib/cache/redis";
import { warmWordCache } from "@/lib/cache/warm";
import { writeLastRun } from "@/lib/cache/run-log";

const LOCK_KEY = "cache:warm:lock";
const LOCK_TTL_SECONDS = 5 * 60;

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
    const result = await warmWordCache();
    await writeLastRun("words", "cron", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cache:warm] failed", err);
    return NextResponse.json({ error: "warm_failed" }, { status: 500 });
  } finally {
    await safeDel(LOCK_KEY);
  }
}

// Vercel cron triggers GET; allow POST for manual curl use too.
export const GET = handle;
export const POST = handle;
