import Image from "next/image";
import Link from "next/link";
import { Heart, Search, ShoppingBag, UserRound } from "lucide-react";
import { headers } from "next/headers";
import { Button } from "@babascamera/ui";
import { fetchCartSummary } from "@/features/cart/api/get-cart-summary";
import { getStorefrontOrigin } from "@/lib/api/server-origin";
import { SearchBox } from "./search-box";

const navigation = [
  { href: "/products", label: "All products" },
  { href: "/categories/cameras", label: "Cameras" },
  { href: "/categories/lenses", label: "Lenses" },
  { href: "/brands", label: "Brands" },
];

export async function SiteHeader() {
  let cartCount = 0;
  let authenticated = false;
  const requestHeaders = await headers();
  try {
    const summary = await fetchCartSummary(
      await getStorefrontOrigin(),
      requestHeaders.get("cookie") ?? "",
    );
    cartCount = summary.count;
    authenticated = summary.authenticated;
  } catch (error) {
    console.error("Storefront header cart summary failed", error);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="page-shell flex h-18 items-center gap-5">
        <Link href="/" aria-label="Baba's Camera home" className="shrink-0">
          <Image
            src="/Babasnewlogo.svg"
            alt="Baba's Camera"
            width={156}
            height={48}
            priority
            className="h-10 w-auto"
          />
        </Link>

        <nav className="hidden flex-1 items-center gap-5 text-sm font-medium lg:flex">
          {navigation.map((item) => (
            <div key={item.href} className="group relative">
              <Link href={item.href} className="transition hover:text-[#E94560]">
                {item.label}
              </Link>
            </div>
          ))}
        </nav>

        <SearchBox />

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/search" aria-label="Search" className="md:hidden">
              <Search className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/wishlist" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cart" aria-label="Shopping cart" className="relative">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#E94560] px-1 text-[10px] font-bold text-white">
                  {Math.min(cartCount, 99)}
                </span>
              ) : null}
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href={authenticated ? "/account" : "/auth/login"} aria-label="Account">
              <UserRound className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
      <nav className="page-shell flex gap-5 overflow-x-auto pb-3 text-sm font-medium lg:hidden">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} className="shrink-0">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
