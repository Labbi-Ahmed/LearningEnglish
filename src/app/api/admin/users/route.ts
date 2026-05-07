import { NextResponse } from "next/server";
import { requireAuthor } from "@/lib/auth/require-author";
import { adminErrorResponse } from "@/lib/admin/handle-error";
import { adminUserListQuerySchema } from "@/lib/schemas/admin";
import { listAdminUsers } from "@/lib/admin/list-users";

export async function GET(req: Request) {
  try {
    const { supabaseAdmin } = await requireAuthor();

    const { searchParams } = new URL(req.url);
    const parsed = adminUserListQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "invalid_query" },
        { status: 422 },
      );
    }

    const result = await listAdminUsers(supabaseAdmin, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = adminErrorResponse(error);
    if (mapped) return mapped;
    console.error("[GET /api/admin/users] unexpected", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
