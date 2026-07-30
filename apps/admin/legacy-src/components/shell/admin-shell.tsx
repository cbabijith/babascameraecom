import { ExternalLink, LogOut, Menu, Search } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import type { AdminUser } from "@/lib/auth/admin";
import { logoutAction } from "@/lib/auth/actions";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function roleLabel(role: AdminUser["role"]) {
  return role.replaceAll("_", " ");
}

export function AdminShell({
  admin,
  children,
}: {
  admin: AdminUser;
  children: React.ReactNode;
}) {
  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col overflow-y-auto bg-slate-950 px-4 py-5 lg:flex">
        <div className="px-2">
          <BrandMark inverse />
        </div>

        <div className="mt-9 flex-1">
          <p className="mb-2 px-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
            Workspace
          </p>
          <SidebarNav permissions={admin.permissions} />
        </div>

        <div className="mt-8 border-t border-white/[0.07] pt-4">
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl px-3.5 py-3 text-xs font-bold text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            View storefront
            <ExternalLink className="size-3.5" />
          </a>
          <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-400 text-xs font-black text-slate-950">
              {initials(admin.fullName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-extrabold text-white">{admin.fullName}</span>
              <span className="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {roleLabel(admin.role)}
              </span>
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <details className="group relative lg:hidden">
            <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-xl border border-slate-200 bg-white text-slate-700">
              <Menu className="size-5" />
            </summary>
            <div className="absolute left-0 top-12 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
              <div className="mb-4 flex items-center justify-between px-2 pt-1">
                <BrandMark />
              </div>
              <SidebarNav permissions={admin.permissions} compact />
              <form action={logoutAction} className="mt-3 border-t border-slate-100 pt-3">
                <button className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold text-rose-600 hover:bg-rose-50">
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </form>
            </div>
          </details>

          <form action="/products" className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              type="search"
              aria-label="Search products"
              placeholder="Search products, SKU or code…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/orders?status=pending"
              className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 sm:inline-flex"
            >
              Review new orders
            </Link>
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-2 py-1.5 sm:hidden">
              <span className="grid size-7 place-items-center rounded-lg bg-slate-950 text-[10px] font-black text-amber-400">
                {initials(admin.fullName)}
              </span>
              <span className="max-w-28 truncate text-xs font-bold text-slate-800">{admin.fullName}</span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
