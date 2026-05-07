import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminAction = "deactivate" | "reactivate" | "delete";

export async function writeAuditLog(
  supabaseAdmin: SupabaseClient,
  args: {
    actorId: string;
    targetId: string;
    action: AdminAction;
    reason?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const { error } = await supabaseAdmin.from("admin_audit_log").insert({
    actor_id: args.actorId,
    target_id: args.targetId,
    action: args.action,
    reason: args.reason ?? null,
    metadata: args.metadata ?? null,
  });
  if (error) {
    console.error("[admin-audit] insert failed", error);
    throw new Error("audit_log_failed");
  }
}
