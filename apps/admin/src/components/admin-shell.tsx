"use client";

import {
  ExternalLink, LogOut, Menu, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { AdminUser } from "@/features/auth/server/admin";
import { logoutAction } from "@/features/auth/server/actions";
import { AdminSidebarNav } from "@/features/navigation/components/admin-sidebar-nav";
import { Topbar } from "@/components/topbar";
import { cn } from "@babascamera/ui";

export function AdminShell({ admin, children }: { admin: AdminUser; children: React.ReactNode }) {
  const storefront = process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={cn("min-h-screen bg-[var(--admin-bg)] lg:grid", collapsed ? "lg:grid-cols-[4.5rem_1fr]" : "lg:grid-cols-[15rem_1fr]")}>
      <aside className={cn("fixed inset-y-0 hidden flex-col border-r border-[var(--admin-border)] bg-[#f1f1f1] transition-[width] lg:flex", collapsed ? "w-[4.5rem] p-2" : "w-[15rem] p-3")}>
        <div className="flex items-center gap-2">
        <Link href="/dashboard" className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-[var(--admin-text)]", collapsed && "justify-center")}>
          <span className="grid size-8 place-items-center rounded-md bg-white ring-1 ring-[var(--admin-border)]">
            <Image src="/navbarLogo.svg" alt="Baba's Camera" width={26} height={26} className="h-6 w-auto" priority />
          </span>
          {!collapsed ? <span><b className="block text-sm font-semibold">Baba&apos;s Camera</b><small className="text-xs text-[var(--admin-muted)]">Commerce admin</small></span> : null}
        </Link>
        <button type="button" onClick={() => setCollapsed((value) => !value)} className="hidden size-8 shrink-0 place-items-center rounded-md text-[var(--admin-muted)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)] lg:grid" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
        </div>
        <div className="my-3 h-px bg-[var(--admin-border)]" />
        <div className="flex-1"><AdminSidebarNav collapsed={collapsed} /></div>
        <a href={storefront} target="_blank" rel="noreferrer" title={collapsed ? "View storefront" : undefined} className={cn("mb-2 flex h-9 items-center justify-between rounded-md px-2 text-sm font-medium text-[var(--admin-muted)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)]", collapsed && "justify-center")}>
          {collapsed ? <span className="sr-only">View storefront</span> : "View storefront"} <ExternalLink className="size-4" />
        </a>
        <div className={cn("flex items-center gap-2 rounded-md border border-[var(--admin-border)] bg-white p-2 text-[var(--admin-text)]", collapsed && "grid justify-items-center")}>
          <span className="grid size-7 place-items-center rounded-md bg-[#303030] text-xs font-semibold text-white">{admin.fullName.slice(0, 1).toUpperCase()}</span>
          {!collapsed ? <span className="min-w-0 flex-1"><b className="block truncate text-sm font-medium">{admin.fullName}</b><small className="text-xs text-[var(--admin-muted)]">Administrator</small></span> : null}
          <form action={logoutAction}>
            <button type="submit" aria-label="Sign out" title="Sign out" className="grid size-8 place-items-center rounded-md text-[var(--admin-muted)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)]">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-[var(--admin-border)] bg-white/95 px-4 backdrop-blur lg:px-6">
          <details className="relative lg:hidden">
            <summary className="grid size-9 cursor-pointer place-items-center rounded-md border border-[var(--admin-border)]"><Menu className="size-5" /></summary>
            <div className="absolute left-0 top-11 w-64 rounded-lg border border-[var(--admin-border)] bg-white p-2 shadow-xl">
              <Link href="/dashboard" className="mb-2 flex items-center gap-2 rounded-md px-2 py-2 text-[var(--admin-text)]">
                <span className="grid size-8 place-items-center rounded-md bg-white ring-1 ring-[var(--admin-border)]">
                  <Image src="/navbarLogo.svg" alt="Baba's Camera" width={30} height={30} className="h-7 w-auto" />
                </span>
                <span className="text-sm font-semibold">Baba&apos;s Camera</span>
              </Link>
              <AdminSidebarNav />
              <div className="mt-2 border-t border-[var(--admin-border)] pt-2">
                <a href={storefront} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-[var(--admin-muted)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)]">
                  View storefront <ExternalLink className="size-4" />
                </a>
                <form action={logoutAction}>
                  <button type="submit" className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-[var(--admin-muted)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)]">
                    <LogOut className="size-4" /> Sign out
                  </button>
                </form>
              </div>
            </div>
          </details>
          <Topbar adminName={admin.fullName} avatarUrl={admin.avatarUrl} />
        </header>
        <main className="mx-auto grid max-w-[1280px] gap-5 p-4 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
