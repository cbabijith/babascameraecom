import Image from "next/image";
import Link from "next/link";
import { Heart, Search, ShoppingBag, UserRound } from "lucide-react";
import { Button } from "@babascamera/ui";
import { getCartOwner } from "@/lib/cart-session";
import {
  getCartCount,
  isUserCartOwner,
  listBrands,
  listCategories,
} from "@/lib/data/storefront";
import { SearchBox } from "./search-box";

const navigation = [
  { href: "/products", label: "All products" },
  { href: "/categories/cameras", label: "Cameras" },
  { href: "/categories/lenses", label: "Lenses" },
  { href: "/brands", label: "Brands" },
];

export async function SiteHeader() {
  const owner = await getCartOwner();
  const [cartCount, categories, brands] = await Promise.all([
    getCartCount(owner),
    listCategories(),
    listBrands(),
  ]);

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
              <Link
                href={item.href}
                className="transition hover:text-[#E94560]"
              >
                {item.label}
              </Link>
              {item.label === "All products" ? (
                <div className="invisible absolute left-0 top-6 z-50 grid w-[36rem] grid-cols-2 gap-7 rounded-2xl border border-slate-200 bg-white p-6 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Categories
                    </p>
                    <div className="mt-3 grid gap-2">
                      {categories.slice(0, 8).map((category) => (
                        <Link
                          key={category.id}
                          href={`/categories/${category.slug}`}
                          className="hover:text-[#E94560]"
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Brands
                    </p>
                    <div className="mt-3 grid gap-2">
                      {brands.slice(0, 8).map((brand) => (
                        <Link
                          key={brand.id}
                          href={`/brands/${brand.slug}`}
                          className="hover:text-[#E94560]"
                        >
                          {brand.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
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
            <Link
              href={isUserCartOwner(owner) ? "/account" : "/auth/login"}
              aria-label="Account"
            >
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
