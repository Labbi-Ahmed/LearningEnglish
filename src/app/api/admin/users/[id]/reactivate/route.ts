import { NextResponse } from "next/server";
import { requireAuthor } from "@/lib/auth/require-author";
import { writeAuditLog } from "@/lib/admin/audit";
import { adminErrorResponse } from "@/lib/admin/handle-error";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: targetId } = await ctx.params;

  try {
    const { user, supabaseAdmin } = await requireAuthor();

    const { data: profile, error: readError } = await supabaseAdmin
      .from("profiles")
      .select("is_active")
      .eq("id", targetId)
      .maybeSingle();
    if (readError) {
      console.error("[POST /api/admin/users/:id/reactivate] read", readError);
      return NextResponse.json({ error: "reactivate_failed" }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    const isActive = (profile as { is_active?: boolean }).is_active ?? true;
    if (isActive) {
      return NextResponse.json({ ok: true, noop: true });
    }

    await writeAuditLog(supabaseAdmin, {
      actorId: user.id,
      targetId,
      action: "reactivate",
    });

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: true })
      .eq("id", targetId);
    if (updateError) {
      console.error("[POST /api/admin/users/:id/reactivate] update", updateError);
      return NextResponse.json({ error: "reactivate_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const mapped = adminErrorResponse(error);
    if (mapped) return mapped;
    console.error("[POST /api/admin/users/:id/reactivate] unexpected", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
