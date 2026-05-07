import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminUserListQuery } from "@/lib/schemas/admin";

export type AdminUserRow = {
  id: string;
  email: string | null;
  created_at: string | null;
  display_name: string | null;
  level: string | null;
  is_active: boolean;
  tier: string;
};

export type AdminUserListResult = {
  users: AdminUserRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/**
 * Lists users for the admin surface. Reads auth.users via the service-role
 * client (RLS does not apply here), then enriches with profile and tier
 * data in two batched queries.
 */
export async function listAdminUsers(
  supabaseAdmin: SupabaseClient,
  query: AdminUserListQuery,
): Promise<AdminUserListResult> {
  const { q, page, pageSize } = query;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const baseQuery = supabaseAdmin
    .schema("auth")
    .from("users")
    .select("id, email, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const filtered = q ? baseQuery.ilike("email", `%${q}%`) : baseQuery;
  const { data: authRows, count, error } = await filtered;
  if (error) {
    console.error("[admin-list-users] auth", error);
    throw new Error("list_failed");
  }

  const ids = (authRows ?? []).map((row) => (row as { id: string }).id);

  const [{ data: profiles }, { data: subs }] = await Promise.all([
    ids.length === 0
      ? Promise.resolve({ data: [] })
      : supabaseAdmin
          .from("profiles")
          .select("id, display_name, level, is_active")
          .in("id", ids),
    ids.length === 0
      ? Promise.resolve({ data: [] })
      : supabaseAdmin
          .from("user_subscriptions")
          .select("user_id, tier")
          .in("user_id", ids),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((row) => [
      (row as { id: string }).id,
      row as { display_name: string | null; level: string | null; is_active: boolean },
    ]),
  );
  const tierById = new Map(
    (subs ?? []).map((row) => [
      (row as { user_id: string }).user_id,
      ((row as { tier?: string }).tier ?? "free") as string,
    ]),
  );

  const users: AdminUserRow[] = (authRows ?? []).map((row) => {
    const r = row as { id: string; email: string | null; created_at: string | null };
    const profile = profileById.get(r.id);
    return {
      id: r.id,
      email: r.email,
      created_at: r.created_at,
      display_name: profile?.display_name ?? null,
      level: profile?.level ?? null,
      is_active: profile?.is_active ?? true,
      tier: tierById.get(r.id) ?? "free",
    };
  });

  const total = count ?? users.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { users, page, pageSize, total, totalPages };
}
