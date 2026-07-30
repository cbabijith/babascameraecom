"use client";

import {
  Boxes,
  Building2,
  ChartNoAxesCombined,
  ChevronRight,
  MessageSquareText,
  PackageCheck,
  Settings,
  ShoppingBag,
  TicketPercent,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@babascamera/ui";

import type { Permission } from "@/lib/auth/admin";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
};

const navigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: ChartNoAxesCombined, permission: "dashboard" },
  { href: "/orders", label: "Orders", icon: PackageCheck, permission: "orders" },
  { href: "/products", label: "Products", icon: ShoppingBag, permission: "catalog" },
  { href: "/categories", label: "Categories", icon: Boxes, permission: "catalog" },
  { href: "/brands", label: "Brands", icon: Building2, permission: "catalog" },
  { href: "/customers", label: "Customers", icon: Users, permission: "customers" },
  { href: "/coupons", label: "Coupons", icon: TicketPercent, permission: "promotions" },
  { href: "/reviews", label: "Reviews", icon: MessageSquareText, permission: "reviews" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings" },
];

export function SidebarNav({
  permissions,
  compact = false,
}: {
  permissions: Permission[];
  compact?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className={cn("grid gap-1.5", compact && "gap-1")}>
      {navigation
        .filter((item) => permissions.includes(item.permission))
        .map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition",
                active
                  ? "bg-amber-400 text-slate-950 shadow-[0_8px_24px_rgba(251,191,36,0.16)]"
                  : compact
                    ? "text-slate-700 hover:bg-slate-100"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {!compact ? (
                <ChevronRight
                  className={cn(
                    "size-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-70",
                    active && "opacity-50",
                  )}
                />
              ) : null}
            </Link>
          );
        })}
    </nav>
  );
}

export function NavigationSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 px-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
      {children}
    </p>
  );
}

export function NavigationSummary({ permissions }: { permissions: Permission[] }) {
  const available = navigation.filter((item) => permissions.includes(item.permission));
  const Icon = available.length > 5 ? ChartNoAxesCombined : ShoppingBag;
  return <Icon className="size-4 text-amber-500" aria-hidden="true" />;
}
