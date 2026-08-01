// src/components/common/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { Home, LayoutGrid, Package, Handbag } from "lucide-react";

type CartItem = { quantity?: number };

function isItemsObj(v: unknown): v is { items: CartItem[] } {
  return typeof v === "object" && v !== null && Array.isArray((v as { items?: unknown }).items);
}
function isItemsArr(v: unknown): v is CartItem[] {
  return Array.isArray(v);
}
function hasCount(v: unknown): v is { count: number } {
  const obj = v as { count?: unknown };
  return typeof v === "object" && v !== null && typeof obj.count === "number";
}

export default function BottomNav() {
  const pathname = usePathname();

  // read cart count safely from multiple slice shapes
  const cartCount = useSelector((state: RootState) => {
    const cart = (state as unknown as { cart?: unknown }).cart;
    if (isItemsObj(cart)) return cart.items.reduce((n, it) => n + (typeof it.quantity === "number" ? it.quantity : 1), 0);
    if (isItemsArr(cart)) return cart.reduce((n, it) => n + (typeof it.quantity === "number" ? it.quantity : 1), 0);
    if (hasCount(cart)) return cart.count;
    return 0;
  });

  /**
   * Visibility rules
   * - Hide on product detail page: /products/[id]
   * - Hide on checkout/admin
   * - Hide on common auth routes (group (auth) is invisible in URL, so match by path)
   */
  const hideOnPatterns: RegExp[] = [
    /^\/products\/[^/]+$/,           // product detail page (your exception)
    /^\/checkout(?:\/|$)/,           // checkout
    /^\/admin(?:\/|$)/,              // admin
    /^\/login(?:\/|$)/,              // auth screens (since (auth) group doesn't appear in URL)
    /^\/register(?:\/|$)/,
    /^\/forgot-password(?:\/|$)/,
    /^\/verify(?:\/|$)/,
  ];
  const hideBottomNav = pathname && hideOnPatterns.some((re) => re.test(pathname));
  if (hideBottomNav) return null;

  // Active state: Products active ONLY on exact "/products"
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/products") return pathname === "/products";
    return pathname === href;
  };

  const Item = ({
    href,
    label,
    active,
    children,
  }: {
    href: string;
    label: string;
    active: boolean;
    children: React.ReactNode;
  }) => (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[12px]"
    >
      {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-[#E72429] rounded-t" />}
      {children}
      <span className={`${active ? "text-[#E72429] font-semibold" : "text-gray-500 font-medium"} leading-none`}>
        {label}
      </span>
    </Link>
  );

  return (
    <nav
      role="navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-gray-200 px-2 pb-[max(6px,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-4 items-end">
        <Item href="/" label="Home" active={isActive("/")}>
          <Home className={`h-6 w-6 ${isActive("/") ? "text-[#E72429]" : "text-gray-500"}`} />
        </Item>

        <Item href="/products" label="Products" active={isActive("/products")}>
          <LayoutGrid className={`h-6 w-6 ${isActive("/products") ? "text-[#E72429]" : "text-gray-500"}`} />
        </Item>

        <Item href="/orders" label="Orders" active={isActive("/orders")}>
          <Package className={`h-6 w-6 ${isActive("/orders") ? "text-[#E72429]" : "text-gray-500"}`} />
        </Item>

        <Item href="/cart" label="Cart" active={isActive("/cart")}>
          <div className="relative">
            <Handbag className={`h-6 w-6 ${isActive("/cart") ? "text-[#E72429]" : "text-gray-500"}`} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E72429] text-white text-[10px] leading-[18px] text-center font-semibold">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </div>
        </Item>
      </div>
    </nav>
  );
}
