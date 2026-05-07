import { requireAuthor } from "@/lib/auth/require-author";
import { listAdminUsers } from "@/lib/admin/list-users";
import { AdminUsersTable } from "./users-table";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { supabaseAdmin, user } = await requireAuthor();
  const params = await searchParams;
  const initial = await listAdminUsers(supabaseAdmin, {
    q: params.q?.trim() || undefined,
    page: Number(params.page) > 0 ? Number(params.page) : 1,
    pageSize: 20,
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Users</h2>
        <span className="text-xs text-muted-foreground">{initial.total} total</span>
      </div>
      <AdminUsersTable initial={initial} currentUserId={user.id} initialQuery={params.q ?? ""} />
    </section>
  );
}
