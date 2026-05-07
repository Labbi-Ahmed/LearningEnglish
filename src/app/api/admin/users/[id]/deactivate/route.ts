import { NextResponse } from "next/server";
import { requireAuthor } from "@/lib/auth/require-author";
import { writeAuditLog } from "@/lib/admin/audit";
import { assertNotLastActiveAuthor } from "@/lib/admin/last-author";
import { adminErrorResponse } from "@/lib/admin/handle-error";
import { deactivateUserBodySchema } from "@/lib/schemas/admin";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: targetId } = await ctx.params;

  try {
    const { user, supabaseAdmin } = await requireAuthor();

    if (targetId === user.id) {
      return NextResponse.json({ error: "cannot_target_self" }, { status: 400 });
    }

    let body: unknown = {};
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    const parsed = deactivateUserBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "invalid_input" },
        { status: 422 },
      );
    }

    await assertNotLastActiveAuthor(supabaseAdmin, targetId);

    await writeAuditLog(supabaseAdmin, {
      actorId: user.id,
      targetId,
      action: "deactivate",
      reason: parsed.data.reason ?? null,
    });

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: false })
      .eq("id", targetId);
    if (updateError) {
      console.error("[POST /api/admin/users/:id/deactivate] update", updateError);
      return NextResponse.json({ error: "deactivate_failed" }, { status: 500 });
    }

    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(targetId);
    if (signOutError) {
      console.error("[POST /api/admin/users/:id/deactivate] signOut", signOutError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const mapped = adminErrorResponse(error);
    if (mapped) return mapped;
    console.error("[POST /api/admin/users/:id/deactivate] unexpected", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
