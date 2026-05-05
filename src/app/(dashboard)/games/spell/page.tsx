import Link from "next/link";
import { SpellGame } from "./spell-game";

export default function SpellPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">
          ← Games
        </Link>
        <h1 className="text-2xl font-bold mt-2">Spell it</h1>
        <p className="text-muted-foreground">Listen and type the word.</p>
      </div>
      <SpellGame />
    </div>
  );
}
