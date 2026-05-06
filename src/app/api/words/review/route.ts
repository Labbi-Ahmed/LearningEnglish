import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ReviewBodySchema } from "@/lib/schemas/review";
import { nextSchedule } from "@/lib/spaced-repetition";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ReviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_quality" }, { status: 400 });
  }
  const { user_word_id, quality } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // RLS-scoped read: missing → not owned → 404.
  const { data: row } = await supabase
    .from("user_words")
    .select("id, ease_factor, interval_days, repetitions")
    .eq("id", user_word_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const r = row as {
    ease_factor: number;
    interval_days: number;
    repetitions: number;
  };

  const schedule = nextSchedule(
    {
      ease_factor: r.ease_factor,
      interval_days: r.interval_days,
      repetitions: r.repetitions,
    },
    quality,
  );

  const { error } = await supabase
    .from("user_words")
    .update({
      ease_factor: schedule.ease_factor,
      interval_days: schedule.interval_days,
      repetitions: schedule.repetitions,
      next_review_at: schedule.next_review_at,
    })
    .eq("id", user_word_id)
    .eq("user_id", user.id);

  if (error) {
    console.error("review update failed", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json(schedule, { status: 200 });
}
