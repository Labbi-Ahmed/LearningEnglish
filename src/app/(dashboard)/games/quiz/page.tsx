import Link from "next/link";
import { QuizGame } from "./quiz-game";

export default function QuizPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">
          ← Games
        </Link>
        <h1 className="text-2xl font-bold mt-2">Meaning quiz</h1>
        <p className="text-muted-foreground">Choose the correct definition.</p>
      </div>
      <QuizGame />
    </div>
  );
}
