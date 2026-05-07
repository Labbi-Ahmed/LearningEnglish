import { handleGameResult } from "@/lib/games/submit-result";

export async function POST(req: Request) {
  return handleGameResult(req, "quiz");
}
