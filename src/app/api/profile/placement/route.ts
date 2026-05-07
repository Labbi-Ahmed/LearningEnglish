import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PlacementBodySchema } from "@/lib/schemas/placement";
import { PLACEMENT_QUESTION_MAP } from "@/lib/placement/questions";
import { bandForScore } from "@/lib/placement/score";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = PlacementBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let score = 0;
  for (const a of parsed.data.answers) {
    const q = PLACEMENT_QUESTION_MAP[a.question_id];
    if (!q) {
      return NextResponse.json({ error: "unknown_question" }, { status: 400 });
    }
    if (a.answer === q.answer) score += 1;
  }

  const total = parsed.data.answers.length;
  const band = bandForScore(score, total);

  const { error } = await supabase
    .from("profiles")
    .update({ level: band })
    .eq("id", user.id);
  if (error) {
    console.error("profiles.level update failed", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json(
    { level: band, score, total, band },
    { status: 200 },
  );
}
