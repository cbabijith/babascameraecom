"use client";

/* eslint-disable @next/next/no-img-element -- Administrator avatars use runtime Supabase URLs. */

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Topbar({ adminName, avatarUrl }: { adminName: string; avatarUrl: string | null }) {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <nav aria-label="Breadcrumb" className="mr-auto hidden min-w-0 items-center gap-2 text-xs text-slate-500 sm:flex">
        <Link href="/dashboard" className="font-semibold hover:text-slate-950">Admin</Link>
        {parts.map((part, index) => {
          const href = `/${parts.slice(0, index + 1).join("/")}`;
          const label = /^[0-9a-f-]{36}$/i.test(part) ? "Detail" : part.replaceAll("-", " ");
          return <span key={href} className="flex min-w-0 items-center gap-2"><span>/</span><Link href={href} className="max-w-40 truncate capitalize hover:text-slate-950">{label}</Link></span>;
        })}
      </nav>
      <details className="relative">
        <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-xl border bg-white text-slate-600" aria-label="Notifications">
          <Bell className="size-4" />
        </summary>
        <div className="absolute right-0 top-11 z-30 w-72 rounded-xl border bg-white p-4 shadow-xl">
          <b className="text-sm">Notifications</b>
          <p className="mt-2 text-sm text-slate-500">No new notifications.</p>
        </div>
      </details>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="size-9 rounded-xl object-cover" />
      ) : (
        <span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-xs font-black text-amber-400">{adminName.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}
