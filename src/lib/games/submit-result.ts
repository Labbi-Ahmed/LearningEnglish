import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ResultBodySchema } from "@/lib/schemas/games";
import type { GameType } from "@/lib/schemas/games";

export async function handleGameResult(req: Request, gameType: GameType): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ResultBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_result" }, { status: 400 });
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const allWordIds = data.items.map((i) => i.word_id);

  // Verify caller owns every referenced word
  const { data: owned } = await supabase
    .from("user_words")
    .select("word_id")
    .eq("user_id", user.id)
    .in("word_id", allWordIds);

  const ownedSet = new Set((owned ?? []).map((r: { word_id: string }) => r.word_id));
  if (allWordIds.some((id) => !ownedSet.has(id))) {
    return NextResponse.json({ error: "unknown_word_id" }, { status: 400 });
  }

  // Insert one game_sessions row
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .insert({
      user_id: user.id,
      game_type: gameType,
      score: data.score,
      duration_seconds: Math.round(data.duration_ms / 1000),
      words_practiced: allWordIds,
    })
    .select("id")
    .single();

  if (sessionError) {
    console.error("game_sessions insert failed", sessionError);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  // Phase 4: SM-2 (`repetitions`/`ease_factor`) is now the mastery signal,
  // updated by the dedicated review flow. Game results no longer bump
  // `mastery_level` — it lingers as a derived display value.
  return NextResponse.json({ session_id: session.id }, { status: 201 });
}
