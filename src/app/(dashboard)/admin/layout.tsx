import { notFound } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requireAuthor } from "@/lib/auth/require-author";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAuthor();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Author-only tools.</p>
      </header>
      {children}
    </div>
  );
}
