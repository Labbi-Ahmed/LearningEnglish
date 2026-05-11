import { NextResponse } from "next/server";
import { requireAuthor } from "@/lib/auth/require-author";
import { adminErrorResponse } from "@/lib/admin/handle-error";
import { redis, safeDel, safeSetNxEx } from "@/lib/cache/redis";
import { warmActiveUserCaches } from "@/lib/cache/warm-users";
import { writeLastRun, readLastRun } from "@/lib/cache/run-log";

const LOCK_KEY = "cache:warm-users:lock";
const LOCK_TTL_SECONDS = 10 * 60;

export async function POST() {
  try {
    const { user } = await requireAuthor();

    if (!redis) {
      return NextResponse.json({ error: "cache_unavailable" }, { status: 503 });
    }

    const acquired = await safeSetNxEx(LOCK_KEY, "1", LOCK_TTL_SECONDS);
    if (!acquired) {
      return NextResponse.json({ already_running: true });
    }

    try {
      const result = await warmActiveUserCaches();
      await writeLastRun("users", user.id, result);
      const entry = await readLastRun("users");
      return NextResponse.json({
        ...result,
        ranAt: entry?.ranAt,
        actorId: entry?.actorId,
      });
    } catch (err) {
      console.error("[admin:warm-users] failed", err);
      return NextResponse.json({ error: "warm_failed" }, { status: 500 });
    } finally {
      await safeDel(LOCK_KEY);
    }
  } catch (error) {
    const mapped = adminErrorResponse(error);
    if (mapped) return mapped;
    console.error("[admin:warm-users] unexpected", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
