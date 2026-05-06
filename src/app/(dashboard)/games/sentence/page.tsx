import Link from "next/link";
import { SentenceGame } from "./sentence-game";

export default function SentencePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">
          ← Games
        </Link>
        <h1 className="text-2xl font-bold mt-2">Build a sentence</h1>
        <p className="text-muted-foreground">Tap words in the correct order.</p>
      </div>
      <SentenceGame />
    </div>
  );
}
