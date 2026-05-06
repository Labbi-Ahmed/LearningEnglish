import Link from "next/link";
import { SynonymGame } from "./synonym-game";

export default function SynonymPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">
          ← Games
        </Link>
        <h1 className="text-2xl font-bold mt-2">Find the synonym</h1>
        <p className="text-muted-foreground">Pick the word closest in meaning.</p>
        {/* TODO: add ?mode=antonym variant when needed */}
      </div>
      <SynonymGame mode="synonym" />
    </div>
  );
}
