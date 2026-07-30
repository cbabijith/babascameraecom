"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { adminNavigationSections } from "@/features/navigation/navigation-items";
import { cn } from "@babascamera/ui";

export function AdminSidebarNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav className="grid gap-3" aria-label="Admin modules">
      {adminNavigationSections.map((section) => (
        <div key={section.label} className="grid gap-1">
          {!collapsed ? (
            <p className="px-2 text-xs font-medium text-[var(--admin-faint)]">
              {section.label}
            </p>
          ) : null}
          {section.items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const pending = pendingHref === href && !active;
            return (
              <Link
                key={href}
                href={href}
                prefetch
                title={collapsed ? label : undefined}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setPendingHref(href);
                  router.prefetch(href);
                }}
                onFocus={() => router.prefetch(href)}
                onPointerEnter={() => router.prefetch(href)}
                className={cn(
                  "group flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-[var(--admin-muted)] transition-colors hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)]",
                  active && "bg-[#e7e7e7] text-[var(--admin-text)] hover:bg-[#e7e7e7]",
                  pending && "bg-[var(--admin-surface-hover)] text-[var(--admin-text)]",
                  collapsed && "justify-center px-2",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
                {!collapsed && pending ? (
                  <span className="ml-auto size-1.5 rounded-full bg-[var(--admin-muted)]" aria-hidden="true" />
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
