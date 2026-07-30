import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import type { CatalogProduct } from "@/lib/data/storefront";
import { formatMoney } from "@/lib/format";
import { productImageUrl } from "@/lib/storage";
import { HomeBannerCarousel } from "@/features/home-banners/components/home-banner-carousel";
import type { StorefrontHomeBanner } from "@/features/home-banners/types";

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface LegacyHomeProps {
  products: CatalogProduct[];
  categories: Category[];
  brands: Brand[];
  cartCount: number;
  accountHref: string;
  banners: StorefrontHomeBanner[];
}

function categoryFallback(slug: string) {
  const normalized = slug.toLowerCase();
  if (normalized.includes("light")) return "/product/light.png";
  if (normalized.includes("lens")) return "/camera3.png";
  return "/product/cameras.png";
}

function LegacyHeader({
  categories,
  cartCount,
  accountHref,
}: Pick<LegacyHomeProps, "categories" | "cartCount" | "accountHref">) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="legacy-constrained flex min-h-18 items-center gap-3 py-2 md:gap-5">
          <button
            type="button"
            aria-label="Open menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full md:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link
            href="/"
            aria-label="Baba's Camera home"
            className="relative h-12 w-25 shrink-0 md:h-14 md:w-35"
          >
            <Image
              src="/PHOTO_STORE_black.svg"
              alt="Baba's Camera"
              fill
              priority
              className="object-contain"
            />
          </Link>

          <form
            action="/search"
            className="relative hidden min-w-48 max-w-2xl flex-1 md:block"
          >
            <Search
              aria-hidden
              className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/45"
            />
            <input
              type="search"
              name="q"
              aria-label="Search products"
              placeholder="Search for Cameras, Audio, Lighting etc..."
              className="h-10 w-full rounded-full bg-[#EFEFEF] pl-11 pr-4 text-sm text-black outline-none ring-red-100 focus:ring-2"
            />
          </form>

          <nav className="ml-auto hidden items-center gap-5 text-sm text-black lg:flex">
            <a
              href="https://babas.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:font-semibold"
            >
              Services
            </a>
            <Link href="/about" className="hover:font-semibold">
              About Us
            </Link>
            <Link href="/contact" className="hover:font-semibold">
              Contact
            </Link>
            <Link href="/account/orders" className="hover:font-semibold">
              My Orders
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Link
              href="/search"
              aria-label="Search"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full md:hidden"
            >
              <Search className="h-5 w-5" />
            </Link>
            <Link
              href="/cart"
              aria-label="Shopping cart"
              className="relative hidden h-10 w-10 items-center justify-center rounded-full bg-[#EFEFEF] md:inline-flex"
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-4.5 rounded-full bg-[#E72429] px-1 text-center text-[10px] font-semibold leading-4.5 text-white">
                  {Math.min(cartCount, 99)}
                </span>
              ) : null}
            </Link>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="hidden h-10 w-10 items-center justify-center rounded-full bg-[#EFEFEF] md:inline-flex"
            >
              <Heart className="h-5 w-5" strokeWidth={1.75} />
            </Link>
            <Link
              href={accountHref}
              aria-label="Account"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#EFEFEF] px-3 text-sm font-medium text-[#E72429]"
            >
              <UserRound className="h-5 w-5" />
              <span className="hidden xl:inline">Login / Sign Up</span>
            </Link>
          </div>
        </div>
      </header>

      <nav className="border-b border-gray-200 bg-gray-50">
        <div className="legacy-constrained flex items-center justify-center gap-2 overflow-x-auto py-2.5 legacy-scrollbar-hide">
          <Link
            href="/products"
            className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-[#E72429]"
          >
            All Products
          </Link>
          {categories.slice(0, 10).map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold capitalize text-gray-700 hover:bg-gray-100 hover:text-[#E72429]"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

function ProductRail({ products }: { products: CatalogProduct[] }) {
  if (!products.length) return null;

  return (
    <section>
      <div className="legacy-constrained">
        <div className="mb-5 flex items-center justify-between sm:mb-6">
          <h2 className="text-xl font-[650] text-gray-900 sm:text-2xl lg:text-[28px]">
            Top Sellers
          </h2>
          <Link
            href="/products"
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            View all
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3 legacy-scrollbar-hide md:gap-5">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group w-[158px] shrink-0 sm:w-[210px] lg:w-[255px]"
            >
              <div className="relative h-[135px] overflow-hidden rounded-[14px] border border-gray-200 bg-gray-100 transition group-hover:-translate-y-0.5 sm:h-[180px] md:rounded-[24px]">
                <Image
                  src={productImageUrl(product.image)}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 158px, 255px"
                  className="object-contain p-3 sm:p-5"
                />
              </div>
              <div className="mt-2 min-h-24 text-left">
                <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-gray-900 group-hover:underline sm:text-base">
                  {product.name}
                </h3>
                <p className="mt-1 text-xs font-medium text-gray-500 sm:text-sm">
                  {product.categoryName ?? product.brandName ?? "Camera gear"}
                </p>
                <div className="mt-1.5 flex flex-col">
                  {Number(product.mrp) > Number(product.salePrice) ? (
                    <span className="text-xs text-gray-400 line-through sm:text-sm">
                      {formatMoney(product.mrp)}
                    </span>
                  ) : null}
                  <span className="text-base font-bold text-gray-900 sm:text-lg">
                    {formatMoney(product.salePrice)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function LegacyFooter({ categories }: Pick<LegacyHomeProps, "categories">) {
  const links = [
    ["Contact Us", "/contact"],
    ["Shipping", "/shipping"],
    ["Cancellation", "/cancellation"],
    ["Return Policy", "/returns"],
    ["Terms & Conditions", "/terms"],
    ["Privacy Policy", "/privacy"],
  ] as const;

  return (
    <footer className="legacy-constrained mt-12 border-t border-gray-200 bg-white py-9">
      <div className="grid gap-9 lg:grid-cols-[1.15fr_1fr_.7fr_.9fr]">
        <div>
          <div className="relative h-11 w-27">
            <Image
              src="/PHOTO_STORE_black.svg"
              alt="Baba's Camera"
              fill
              className="object-contain"
            />
          </div>
          <p className="mt-5 max-w-sm text-sm leading-6 text-black/55">
            Babas is a one-stop shop for everything camera and creative, from
            budget-friendly options to professional-grade equipment.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-black">About</h3>
          <p className="mt-4 max-w-sm text-sm leading-6 text-black/55">
            Cameras, lenses, studio essentials and creator gear backed by
            experienced support from Kerala.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-black">Shop</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/products">All Products</Link>
            </li>
            {categories.slice(0, 5).map((category) => (
              <li key={category.id}>
                <Link href={`/categories/${category.slug}`}>
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-black">Important Links</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {links.map(([label, href]) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex gap-4">
            {([
              [
                "https://in.linkedin.com/company/babasphoto",
                "/Linkedin.svg",
                "LinkedIn",
              ],
              [
                "https://www.facebook.com/babastvm/",
                "/facebook.svg",
                "Facebook",
              ],
              ["https://x.com", "/Twitter.svg", "Twitter"],
              [
                "https://www.instagram.com/babas_photostore/",
                "/logo-instagram.svg",
                "Instagram",
              ],
            ] as const).map(([href, src, label]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
              >
                <Image src={src} alt="" width={20} height={20} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LegacyHome({
  products,
  categories,
  brands,
  cartCount,
  accountHref,
  banners,
}: LegacyHomeProps) {
  return (
    <div className="legacy-home-page min-h-screen bg-white text-black">
      <LegacyHeader
        categories={categories}
        cartCount={cartCount}
        accountHref={accountHref}
      />

      <main className="pb-4">
        <div className="space-y-8 pb-5 sm:space-y-10">
          <section className="legacy-constrained pt-5 sm:pt-8">
            <HomeBannerCarousel banners={banners} />
          </section>

          {categories.length ? (
            <section className="legacy-constrained">
              <h2 className="mb-5 text-xl font-bold text-gray-900 sm:text-2xl">
                Categories
              </h2>
              <div className="grid grid-cols-3 gap-5 md:grid-cols-6 lg:grid-cols-7 lg:gap-6">
                {categories.slice(0, 7).map((category) => (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug}`}
                    className="flex min-w-0 flex-col items-center"
                  >
                    <div className="relative aspect-square w-[88%] rounded-3xl bg-gray-100 md:w-full md:rounded-[32px]">
                      <Image
                        src={productImageUrl(
                          category.imageUrl ?? categoryFallback(category.slug),
                        )}
                        alt={category.name}
                        fill
                        sizes="(max-width: 640px) 30vw, 12vw"
                        className="object-contain p-3 sm:p-4 lg:p-5"
                      />
                    </div>
                    <span className="mt-3 w-full truncate text-center text-xs font-medium text-gray-900 sm:text-base">
                      {category.name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <ProductRail products={products} />

          {brands.length ? (
            <section className="legacy-constrained">
              <div className="mb-5 flex items-center justify-between sm:mb-6">
                <h2 className="text-xl font-[650] text-gray-900 sm:text-2xl lg:text-[28px]">
                  Brands We Love
                </h2>
                <Link
                  href="/brands"
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  View all
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-3 legacy-scrollbar-hide md:gap-6">
                {brands.map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/brands/${brand.slug}`}
                    className="flex h-[170px] w-[140px] shrink-0 flex-col items-center overflow-hidden rounded-[18px] border border-gray-200 bg-white px-3 pt-4 shadow-sm md:h-[260px] md:w-[230px] md:rounded-[28px]"
                  >
                    <span className="text-center text-sm font-extrabold uppercase tracking-[0.12em] text-gray-900">
                      {brand.name}
                    </span>
                    <div className="relative mt-3 min-h-0 w-full flex-1">
                      {brand.logoUrl ? (
                        <Image
                          src={productImageUrl(brand.logoUrl)}
                          alt={`${brand.name} logo`}
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <Image
                          src="/camera1.png"
                          alt=""
                          fill
                          className="object-contain p-3"
                        />
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="legacy-constrained">
            <div className="overflow-hidden rounded-[18px] bg-[#F8F8F8] md:grid md:min-h-[400px] md:grid-cols-5 md:rounded-[36px]">
              <div className="flex items-center p-7 md:col-span-2 lg:p-10">
                <div>
                  <div className="relative mb-6 h-9 w-32">
                    <Image
                      src="/PHOTO_STORE_black.svg"
                      alt="Baba's Camera"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="text-sm leading-6">
                    At Babas, our mission is simple — to bring the best quality
                    gear into the hands of passionate photographers and
                    creatives who live to capture life&apos;s most precious
                    moments.
                  </p>
                  <p className="mt-4 text-sm leading-6">
                    We curate reliable equipment that empowers storytellers at
                    every level, from a first camera to a professional studio.
                  </p>
                </div>
              </div>
              <div className="relative min-h-[280px] md:col-span-3">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full object-cover"
                  aria-label="Baba's Camera creators"
                >
                  <source src="/Sequence 02.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </section>

          <section className="legacy-constrained pt-2">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {([
                ["/home/pro1.svg", "100% Safe & Secure Payments"],
                ["/home/pro2.svg", "Why Choose Us"],
                ["/home/pro3.svg", "Everything You Need, All In One Place"],
              ] as const).map(([src, alt]) => (
                <div
                  key={src}
                  className="overflow-hidden rounded-[24px] bg-gray-50"
                >
                  <Image
                    src={src}
                    alt={alt}
                    width={400}
                    height={300}
                    className="h-auto w-full"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <LegacyFooter categories={categories} />
    </div>
  );
}
