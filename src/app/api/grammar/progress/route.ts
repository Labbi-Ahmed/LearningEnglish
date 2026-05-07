import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ProgressBodySchema } from "@/lib/schemas/grammar";
import { grantXp } from "@/lib/engagement/xp";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ProgressBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { lesson_id, score, completed } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Fetch existing row to apply MAX(score) and preserve completed_at
  const { data: existing } = await supabase
    .from("lesson_progress")
    .select("score, completed, completed_at")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson_id)
    .maybeSingle();

  const existingScore = (existing as { score: number | null } | null)?.score ?? -1;
  const alreadyCompleted = (existing as { completed: boolean | null } | null)?.completed ?? false;
  const existingCompletedAt = (existing as { completed_at: string | null } | null)?.completed_at ?? null;

  const newScore = Math.max(score, existingScore);
  const newCompleted = alreadyCompleted || completed;
  // Only set completed_at if transitioning to completed for the first time
  const setCompletedAt = completed && !existingCompletedAt;

  const upsertPayload: Record<string, unknown> = {
    user_id: user.id,
    lesson_id,
    score: newScore,
    completed: newCompleted,
    completed_at: setCompletedAt ? new Date().toISOString() : (existingCompletedAt ?? null),
  };

  const { error } = await supabase
    .from("lesson_progress")
    .upsert(upsertPayload, { onConflict: "user_id,lesson_id" });

  if (error) {
    console.error("lesson_progress upsert failed", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  if (setCompletedAt) {
    await grantXp(supabase, { userId: user.id, source: "lesson", refId: lesson_id });
  }
  return NextResponse.json({ ok: true, score: newScore, completed: newCompleted }, { status: 200 });
}
