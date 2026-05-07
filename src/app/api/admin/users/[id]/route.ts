import { NextResponse } from "next/server";
import { requireAuthor } from "@/lib/auth/require-author";
import { writeAuditLog } from "@/lib/admin/audit";
import { assertNotLastActiveAuthor } from "@/lib/admin/last-author";
import { deleteUserStorage } from "@/lib/admin/storage";
import { adminErrorResponse } from "@/lib/admin/handle-error";
import { deleteUserBodySchema } from "@/lib/schemas/admin";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: targetId } = await ctx.params;

  try {
    const { user, supabaseAdmin } = await requireAuthor();

    if (targetId === user.id) {
      return NextResponse.json({ error: "cannot_target_self" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    const parsed = deleteUserBodySchema.safeParse(body);
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
      action: "delete",
      reason: parsed.data.reason,
    });

    try {
      await deleteUserStorage(supabaseAdmin, targetId);
    } catch (error) {
      console.error("[DELETE /api/admin/users/:id] storage", error);
      return NextResponse.json({ error: "storage_cleanup_failed" }, { status: 500 });
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetId);
    if (deleteError) {
      console.error("[DELETE /api/admin/users/:id] auth delete", deleteError);
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const mapped = adminErrorResponse(error);
    if (mapped) return mapped;
    console.error("[DELETE /api/admin/users/:id] unexpected", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
