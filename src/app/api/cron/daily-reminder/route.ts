import { NextResponse } from "next/server";
import webpush from "web-push";
import { getServiceRoleKey, env } from "@/lib/env";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const cronSecret = env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "push_not_configured" }, { status: 503 });
  }

  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

  // Service role client — needed to read all users' subscriptions
  const service = createServiceClient(env.SUPABASE_URL, getServiceRoleKey());

  const { data: subs, error } = await service
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (error) {
    console.error("[daily-reminder] fetch subs failed:", error.message);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  type SubRow = { endpoint: string; p256dh: string; auth: string };
  const rows = (subs ?? []) as unknown as SubRow[];

  const payload = JSON.stringify({
    title: "Time to learn!",
    body: "Keep your streak alive — review your words today.",
    url: "/dashboard",
  });

  const stale: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          stale.push(sub.endpoint);
        }
      }
    }),
  );

  if (stale.length > 0) {
    await service.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return NextResponse.json({ ok: true, sent, stale: stale.length }, { status: 200 });
}
