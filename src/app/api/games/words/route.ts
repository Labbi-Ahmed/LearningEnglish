import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BatchQuerySchema } from "@/lib/schemas/games";
import {
  selectForSpell,
  selectForSentence,
  selectForQuiz,
  selectForSynonym,
} from "@/lib/games/select-batch";

const MIN_WORDS = 4;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = BatchQuerySchema.safeParse({
    game: url.searchParams.get("game") ?? undefined,
    size: url.searchParams.get("size") ?? undefined,
    mode: url.searchParams.get("mode") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }
  const { game, size, mode } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Fetch the user's preferred accent for TTS in the spell game
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_accent")
    .eq("id", user.id)
    .single();
  const accent = (profile?.preferred_accent as "uk" | "us") ?? "uk";

  let items;
  try {
    switch (game) {
      case "spell":
        items = await selectForSpell(supabase, user.id, size);
        break;
      case "sentence":
        items = await selectForSentence(supabase, user.id, size);
        break;
      case "quiz":
        items = await selectForQuiz(supabase, user.id, size);
        break;
      case "synonym":
        items = await selectForSynonym(supabase, user.id, size, mode);
        break;
    }
  } catch (err) {
    console.error("batch select failed", err);
    return NextResponse.json({ error: "batch_failed" }, { status: 500 });
  }

  if (items.length < MIN_WORDS) {
    return NextResponse.json(
      { error: "not_enough_words", min: MIN_WORDS },
      { status: 409 },
    );
  }

  return NextResponse.json({ items, meta: { accent } });
}
