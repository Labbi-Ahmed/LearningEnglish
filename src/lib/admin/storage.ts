import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKETS_TO_PURGE = ["speaking", "avatars"] as const;

/**
 * Removes every storage object owned by the user from the buckets that
 * key paths by user id. Throws on partial failure so the caller aborts
 * before deleting the auth row.
 *
 * Idempotent: a second invocation on a clean prefix does nothing.
 */
export async function deleteUserStorage(
  supabaseAdmin: SupabaseClient,
  userId: string,
) {
  for (const bucket of BUCKETS_TO_PURGE) {
    const { data: entries, error: listError } = await supabaseAdmin.storage
      .from(bucket)
      .list(userId, { limit: 1000 });

    if (listError) {
      // Bucket may not exist yet on a fresh install — treat as empty.
      const message = listError.message?.toLowerCase() ?? "";
      if (message.includes("not found") || message.includes("no such")) continue;
      console.error(`[admin-storage] list ${bucket}/${userId} failed`, listError);
      throw new Error("storage_cleanup_failed");
    }

    if (!entries || entries.length === 0) continue;

    const paths = entries.map((entry) => `${userId}/${entry.name}`);
    const { error: removeError } = await supabaseAdmin.storage
      .from(bucket)
      .remove(paths);
    if (removeError) {
      console.error(`[admin-storage] remove ${bucket}/${userId} failed`, removeError);
      throw new Error("storage_cleanup_failed");
    }
  }
}
