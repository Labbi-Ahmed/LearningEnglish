import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const GAMES = [
  {
    type: "spell",
    title: "Spell it",
    description: "Hear the word and type the spelling.",
    href: "/games/spell",
  },
  {
    type: "sentence",
    title: "Build a sentence",
    description: "Reorder shuffled words into the correct sentence.",
    href: "/games/sentence",
  },
  {
    type: "synonym",
    title: "Find the synonym",
    description: "Pick the correct synonym from four options.",
    href: "/games/synonym",
  },
  {
    type: "quiz",
    title: "Meaning quiz",
    description: "Choose the right definition for each word.",
    href: "/games/quiz",
  },
] as const;

type GameSession = { game_type: string; score: number | null; created_at: string };

export default async function GamesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let lastByType = new Map<string, GameSession>();

  if (user) {
    const { data } = await supabase
      .from("game_sessions")
      .select("game_type, score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40);

    for (const row of (data ?? []) as GameSession[]) {
      if (!lastByType.has(row.game_type)) {
        lastByType.set(row.game_type, row);
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Games</h1>
        <p className="text-muted-foreground mt-1">
          Practice your saved words. You need at least 4 saved words to play.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {GAMES.map((game) => {
          const session = lastByType.get(game.type);
          return (
            <Card key={game.type}>
              <CardHeader>
                <CardTitle>{game.title}</CardTitle>
                <CardDescription>{game.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {session ? (
                    <>
                      Last score: <span className="font-medium text-foreground">{session.score}</span>
                      <span className="ml-2">
                        {new Date(session.created_at).toLocaleDateString()}
                      </span>
                    </>
                  ) : (
                    "Not played yet"
                  )}
                </div>
                <Button asChild size="sm">
                  <Link href={game.href}>Play</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
