"use client";

import {
  BadgePercent, Boxes, ChartNoAxesCombined, ExternalLink, FolderTree, LogOut,
  Menu, PackageCheck, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, ShoppingBag, Star, Tags, UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { AdminUser } from "@/lib/auth/admin";
import { logoutAction } from "@/lib/auth/actions";
import { Topbar } from "@/components/topbar";
import { cn } from "@babascamera/ui";

const links = [
  ["/dashboard", "Dashboard", ChartNoAxesCombined],
  ["/orders", "Orders", PackageCheck],
  ["/products", "Products", ShoppingBag],
  ["/categories", "Categories", FolderTree],
  ["/brands", "Brands", Tags],
  ["/customers", "Customers", UsersRound],
  ["/users", "Users & access", ShieldCheck],
  ["/coupons", "Coupons", BadgePercent],
  ["/reviews", "Reviews", Star],
  ["/settings", "Settings", Settings],
] as const;

function Nav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-1">
      {links.map(([href, label, Icon]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
        <Link
          key={href}
          href={href}
          title={collapsed ? label : undefined}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white",
            active && "bg-white/10 text-white",
            collapsed && "justify-center px-2",
          )}
        >
          <Icon className="size-4 shrink-0" />{collapsed ? <span className="sr-only">{label}</span> : label}
        </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ admin, children }: { admin: AdminUser; children: React.ReactNode }) {
  const storefront = process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={cn("min-h-screen lg:grid", collapsed ? "lg:grid-cols-[5rem_1fr]" : "lg:grid-cols-[17rem_1fr]")}>
      <aside className={cn("fixed inset-y-0 hidden flex-col bg-[#0F172A] transition-[width] lg:flex", collapsed ? "w-20 p-3" : "w-[17rem] p-5")}>
        <div className="flex items-center gap-2">
        <Link href="/dashboard" className={cn("flex min-w-0 flex-1 items-center gap-3 text-white", collapsed && "justify-center")}>
          <span className="grid size-10 place-items-center rounded-xl bg-amber-400 text-slate-950"><Boxes className="size-5" /></span>
          {!collapsed ? <span><b className="block">BABA&apos;S CAMERA</b><small className="text-slate-400">Commerce admin</small></span> : null}
        </Link>
        <button type="button" onClick={() => setCollapsed((value) => !value)} className="hidden size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white lg:grid" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
        </div>
        <div className="mt-9 flex-1"><Nav collapsed={collapsed} /></div>
        <a href={storefront} target="_blank" rel="noreferrer" title={collapsed ? "View storefront" : undefined} className={cn("mb-3 flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-white/10", collapsed && "justify-center px-2")}>
          {collapsed ? <span className="sr-only">View storefront</span> : "View storefront"} <ExternalLink className="size-4" />
        </a>
        <div className={cn("flex items-center gap-3 rounded-xl bg-white/5 p-3 text-white", collapsed && "grid justify-items-center gap-2 p-2")}>
          <span className="grid size-9 place-items-center rounded-lg bg-amber-400 font-black text-slate-950">{admin.fullName.slice(0, 1).toUpperCase()}</span>
          {!collapsed ? <span className="min-w-0 flex-1"><b className="block truncate text-sm">{admin.fullName}</b><small className="text-slate-500">Administrator</small></span> : null}
          <form action={logoutAction}>
            <button type="submit" aria-label="Sign out" title="Sign out" className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 bg-white lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b bg-white/90 px-4 backdrop-blur lg:px-8">
          <details className="relative lg:hidden">
            <summary className="grid size-10 cursor-pointer place-items-center rounded-xl border"><Menu className="size-5" /></summary>
            <div className="absolute left-0 top-12 w-64 rounded-2xl bg-[#0F172A] p-3 shadow-2xl">
              <Nav />
              <div className="mt-3 border-t border-white/10 pt-3">
                <a href={storefront} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white">
                  View storefront <ExternalLink className="size-4" />
                </a>
                <form action={logoutAction}>
                  <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white">
                    <LogOut className="size-4" /> Sign out
                  </button>
                </form>
              </div>
            </div>
          </details>
          <Topbar adminName={admin.fullName} avatarUrl={admin.avatarUrl} />
        </header>
        <main className="mx-auto grid max-w-[1500px] gap-7 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
