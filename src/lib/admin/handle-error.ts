import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { LastActiveAuthorError } from "./last-author";

export function adminErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (error instanceof LastActiveAuthorError) {
    return NextResponse.json({ error: "last_active_author" }, { status: 409 });
  }
  return null;
}
