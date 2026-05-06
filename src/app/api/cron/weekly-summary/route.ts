import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getServiceRoleKey, env } from "@/lib/env";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const cronSecret = env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!env.RESEND_API_KEY) {
    return NextResponse.json({ error: "email_not_configured" }, { status: 503 });
  }

  const service = createServiceClient(env.SUPABASE_URL, getServiceRoleKey());
  const resend = new Resend(env.RESEND_API_KEY);

  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch users who opted in to weekly emails
  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select("id, display_name, email, xp, streak_count")
    .eq("email_weekly", true);

  if (profilesError) {
    console.error("[weekly-summary] profiles fetch failed:", profilesError.message);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  type ProfileRow = { id: string; display_name: string | null; email: string | null; xp: number | null; streak_count: number | null };
  const rows = (profiles ?? []) as unknown as ProfileRow[];

  // Guard: cap at 90% of Resend free tier (100/day → 700/wk, use 630 max)
  const MAX_EMAILS = 630;
  if (rows.length > MAX_EMAILS) {
    console.warn(`[weekly-summary] ${rows.length} recipients exceeds cap, truncating to ${MAX_EMAILS}`);
    rows.splice(MAX_EMAILS);
  }

  let sent = 0;
  for (const profile of rows) {
    if (!profile.email) continue;

    // Fetch weekly XP for this user
    const { data: xpRows } = await service
      .from("user_xp_events")
      .select("amount")
      .eq("user_id", profile.id)
      .gte("created_at", weekAgoIso);

    const weeklyXp = ((xpRows ?? []) as { amount: number }[]).reduce(
      (sum, r) => sum + r.amount,
      0,
    );

    const displayName = profile.display_name ?? "Learner";
    const streak = profile.streak_count ?? 0;

    try {
      await resend.emails.send({
        from: env.RESEND_FROM,
        to: profile.email,
        subject: `Your weekly English learning summary`,
        html: `
          <h2>Hi ${displayName}!</h2>
          <p>Here's your learning summary for this week:</p>
          <ul>
            <li><strong>Weekly XP:</strong> +${weeklyXp}</li>
            <li><strong>Total XP:</strong> ${profile.xp ?? 0}</li>
            <li><strong>Current streak:</strong> ${streak} day${streak === 1 ? "" : "s"}</li>
          </ul>
          <p><a href="${env.APP_URL}/dashboard">Keep learning →</a></p>
          <p style="font-size:12px;color:#888">
            <a href="${env.APP_URL}/api/email/unsubscribe">Unsubscribe from weekly emails</a>
          </p>
        `,
      });
      sent++;
    } catch (err) {
      console.error("[weekly-summary] send failed for", profile.email, err);
    }
  }

  return NextResponse.json({ ok: true, sent }, { status: 200 });
}
