import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EmailWeeklyBodySchema } from "@/lib/schemas/engagement";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = EmailWeeklyBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { enabled } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("profiles")
    .update({ email_weekly: enabled })
    .eq("id", user.id);

  if (error) {
    console.error("[email-weekly] update failed:", error.message);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, enabled }, { status: 200 });
}
