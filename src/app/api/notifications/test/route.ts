import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export async function POST() {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "push_not_configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  type SubRow = { endpoint: string; p256dh: string; auth: string };
  const rows = (subs ?? []) as unknown as SubRow[];

  const payload = JSON.stringify({
    title: "English App",
    body: "Test notification — push is working!",
    url: "/dashboard",
  });

  const stale: string[] = [];
  await Promise.allSettled(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          stale.push(sub.endpoint);
        }
      }
    }),
  );

  // Clean up expired subscriptions
  if (stale.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .in("endpoint", stale);
  }

  return NextResponse.json({ ok: true, sent: rows.length - stale.length }, { status: 200 });
}
