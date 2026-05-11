import { NextResponse } from "next/server";
import { requireAuthor } from "@/lib/auth/require-author";
import { adminErrorResponse } from "@/lib/admin/handle-error";
import { readLastRun } from "@/lib/cache/run-log";

export async function GET() {
  try {
    await requireAuthor();
    const [words, users] = await Promise.all([
      readLastRun("words"),
      readLastRun("users"),
    ]);
    return NextResponse.json({ words, users });
  } catch (error) {
    const mapped = adminErrorResponse(error);
    if (mapped) return mapped;
    console.error("[admin:last-run] unexpected", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
