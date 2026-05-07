"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutConfirmModal } from "@/components/logout-confirm-modal";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

type Props = {
  items: readonly NavItem[];
  dueCount: number;
  displayName: string;
  email: string | null;
  initials: string;
  avatarUrl: string | null;
  signOutAction: () => void | Promise<void>;
};

export function MobileNav({
  items,
  dueCount,
  displayName,
  email,
  initials,
  avatarUrl,
  signOutAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent transition-colors md:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-card border-r flex flex-col shadow-xl">
            <div className="flex h-14 items-center justify-between px-4 border-b">
              <Link href="/dashboard" className="font-bold text-lg tracking-tight">
                English
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
              {items.map(({ href, label, icon }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span className="text-base leading-none">{icon}</span>
                    <span>{label}</span>
                    {href === "/review" && dueCount > 0 ? (
                      <span className="ml-auto rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 leading-none">
                        {dueCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t p-3 space-y-2">
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors"
              >
                <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted items-center justify-center text-xs font-medium uppercase">
                  {avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
                  {email ? (
                    <p className="truncate text-xs text-muted-foreground leading-tight mt-0.5">{email}</p>
                  ) : null}
                </div>
              </Link>
              <LogoutConfirmModal
                signOutAction={signOutAction}
                trigger={
                  <button
                    type="button"
                    className="w-full text-left rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
                  >
                    ↩ Sign out
                  </button>
                }
              />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
