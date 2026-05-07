import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
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

const FETCH_PAGE_SIZE = 1000;
const MAX_USERS = 5000;

/**
 * Lists users for the admin surface.
 *
 * The `auth` schema is not exposed via PostgREST, so we use the GoTrue
 * admin API (`auth.admin.listUsers`) and enrich with profile + tier data
 * from the public schema. For the free-tier scale this app targets, this
 * is fine; if the user count outgrows MAX_USERS, switch to a SQL RPC that
 * runs the join server-side.
 */
export async function listAdminUsers(
  supabaseAdmin: SupabaseClient,
  query: AdminUserListQuery,
): Promise<AdminUserListResult> {
  const { q, page, pageSize } = query;
  const needle = q?.toLowerCase() ?? "";

  const allUsers: User[] = [];
  for (let p = 1; allUsers.length < MAX_USERS; p++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: p,
      perPage: FETCH_PAGE_SIZE,
    });
    if (error) {
      console.error("[admin-list-users] auth.admin.listUsers", error);
      throw new Error("list_failed");
    }
    if (!data.users.length) break;
    allUsers.push(...data.users);
    if (data.users.length < FETCH_PAGE_SIZE) break;
  }

  const filtered = needle
    ? allUsers.filter((u) => (u.email ?? "").toLowerCase().includes(needle))
    : allUsers;

  filtered.sort((a, b) => {
    const at = a.created_at ? Date.parse(a.created_at) : 0;
    const bt = b.created_at ? Date.parse(b.created_at) : 0;
    return bt - at;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fromIdx = (page - 1) * pageSize;
  const slice = filtered.slice(fromIdx, fromIdx + pageSize);
  const ids = slice.map((u) => u.id);

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

  const users: AdminUserRow[] = slice.map((u) => {
    const profile = profileById.get(u.id);
    return {
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at ?? null,
      display_name: profile?.display_name ?? null,
      level: profile?.level ?? null,
      is_active: profile?.is_active ?? true,
      tier: tierById.get(u.id) ?? "free",
    };
  });

  return { users, page, pageSize, total, totalPages };
}
