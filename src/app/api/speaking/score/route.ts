import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ScoreBodySchema } from "@/lib/schemas/speaking";
import { grantXp } from "@/lib/engagement/xp";

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function wordAccuracy(target: string, transcript: string): number {
  const t = normalize(target);
  const s = normalize(transcript);
  if (t.length === 0) return 100;
  let matched = 0;
  const sSet = new Map<string, number>();
  for (const w of s) sSet.set(w, (sSet.get(w) ?? 0) + 1);
  for (const w of t) {
    const count = sSet.get(w) ?? 0;
    if (count > 0) {
      matched++;
      sSet.set(w, count - 1);
    }
  }
  return Math.round((matched / t.length) * 100);
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ScoreBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { recording_id, target_text, transcript } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: row } = await supabase
    .from("speaking_recordings")
    .select("id, audio_url")
    .eq("id", recording_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const accuracy_score = wordAccuracy(target_text, transcript);

  const { data: updated, error } = await supabase
    .from("speaking_recordings")
    .update({ target_text, transcript, accuracy_score })
    .eq("id", recording_id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("score update failed", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await grantXp(supabase, { userId: user.id, source: "speaking", refId: recording_id });
  return NextResponse.json(updated, { status: 200 });
}
