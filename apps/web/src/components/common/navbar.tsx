"use client"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"
import { Search, Menu, Handbag, Heart, X, Loader2, ArrowLeft, CircleUserRound } from "lucide-react"
import { searchProducts } from "@/instances/searchInstance"
import type { Product } from "@/types/product"
import { getImageUrl, getThumbnailUrl } from "@/lib/apiClient"
import { getAuthToken } from "@/instances/authInstance"
import { selectWishlistCount } from "@/store/slice/wishlistSlice";
import { selectCartItems } from "@/store/slice/cartSlice"


interface SearchSuggestion {
  type: "product" | "category" | "brand"
  id: string
  name: string
  image?: string
  category?: string
}
export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()

  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mobile menu sheet
  const [mobileOpen, setMobileOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Detect mobile viewport for full-screen suggestions
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  // track auth for user button (avoid hydration mismatch)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  useEffect(() => {
    setIsLoggedIn(Boolean(getAuthToken()))
  }, [])

  const iconBtn =
    "relative inline-flex items-center justify-center rounded-full p-2 bg-[#EFEFEF] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-300"

  const bareIconBtn =
  "inline-flex items-center justify-center p-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-300";

  const loginCtaBtn =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-[#EFEFEF] whitespace-nowrap shrink-0";
  // ---------- Type-safe cart selector (no 'any') ----------
  // function isItemsObj(v: unknown): v is { items: CartItem[] } {
  //   return typeof v === "object" && v !== null && "items" in v && Array.isArray((v as { items: unknown }).items)
  // }
  // function isItemsArray(v: unknown): v is CartItem[] { return Array.isArray(v) }
  // function hasCount(v: unknown): v is { count: number } {
  //   return typeof v === "object" && v !== null && "count" in v && typeof (v as { count: unknown }).count === "number"
  // }

 // Get raw items from the slice
  const rawCartItems = useSelector((state: RootState) => selectCartItems(state));

  // Count ONLY valid rows (ACTIVE + has product + has product._id)
  const cartCount = rawCartItems
    .filter((it) => it?.status === "ACTIVE" && it?.product && it?.product?._id)
    .reduce((n, it) => n + (typeof it?.quantity === "number" ? it.quantity : 1), 0);

  const wishlistCount = useSelector((state: RootState) => selectWishlistCount(state));


  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      const q = searchQuery.trim()
      if (q.length > 0) {
        fetchSuggestions(q)
      } else {
        setSuggestions([])
        if (!isMobile) setShowSuggestions(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, isMobile])

  // Close desktop suggestions on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (isMobile) return
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [isMobile])

  // Close overlays with Esc
useEffect(() => {
  if (!mobileOpen) return;

  const onPointerDown = (e: PointerEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      setMobileOpen(false);
    }
  };

  const onScroll = () => setMobileOpen(false);

  document.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    document.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("scroll", onScroll);
  };
}, [mobileOpen]);

// Close when route changes
useEffect(() => {
  if (mobileOpen) setMobileOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [pathname]);

// (Optional) also close if viewport jumps to desktop
useEffect(() => {
  const onResize = () => {
    if (mobileOpen && window.matchMedia("(min-width: 768px)").matches) {
      setMobileOpen(false);
    }
  };
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, [mobileOpen]);

  const fetchSuggestions = async (query: string) => {
    try {
      setIsSearching(true)
      const response = await searchProducts({ search: query})
      const productItems: SearchSuggestion[] = []
      const categoryMap = new Map<string, SearchSuggestion>()
      const brandMap = new Map<string, SearchSuggestion>()

      response.results.forEach((product: Product) => {
        productItems.push({
          type: "product",
          id: product._id,
          name: product.name,
          image: product.images?.[0] ? getImageUrl(product.images[0].key) : undefined,
          category: product.category?.name,
        })
        if (product.category && !categoryMap.has(product.category._id)) {
          categoryMap.set(product.category._id, {
            type: "category",
            id: product.category._id,
            name: product.category?.name,
            image: product.category.image ? getThumbnailUrl(product.category.image.key) : undefined,
          })
        }
        if (product.brand && !brandMap.has(product.brand._id)) {
          brandMap.set(product.brand._id, {
            type: "brand",
            id: product.brand._id,
            name: product.brand?.name,
            image: product.brand.image ? getThumbnailUrl(product.brand.image.key) : undefined,
          })
        }
      })

      const combined: SearchSuggestion[] = [
        ...productItems,
        ...Array.from(categoryMap.values()),
        ...Array.from(brandMap.values()),
      ]

      setSuggestions(combined.slice(0, 8))
      setShowSuggestions(true)
    } catch (e) {
      console.error("Search suggestions error:", e)
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = (query?: string) => {
    const term = query || searchQuery.trim()
    if (term) {
      router.push(`/products/search?q=${encodeURIComponent(term)}`)
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  const handleSuggestionClick = (s: SearchSuggestion) => {
    router.push(`/products/search?q=${encodeURIComponent(s.name)}`)
    setShowSuggestions(false)
    setSearchQuery("")
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSuggestions([])
    if (!isMobile) setShowSuggestions(false)
    inputRef.current?.focus()
  }


return (
  <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-100">
    {/* BAR */}
    <div className="constrained-width flex items-center gap-3 py-2 md:py-2.5">
      {/* ==== MOBILE LEFT: Hamburger then Logo ==== */}
      <div className="md:hidden flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className={bareIconBtn}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-top-sheet"
        >
          <Menu className="h-6 w-6 text-black" />
        </button>

        <Link
          href="/"
          className="relative h-12 w-[100px] shrink-0 flex items-center justify-center"
        >
          <Image
            src="/PHOTO_STORE_black.svg"
            alt="babas"
            fill
            className="object-contain"
            priority
          />
        </Link>
      </div>

      {/* ==== DESKTOP Logo ==== */}
      <Link
        href="/"
        className="relative h-[56px] w-[140px] shrink-0 hidden md:flex items-center justify-center"
      >
        <Image
          src="/PHOTO_STORE_black.svg"
          alt="babas"
          fill
          className="object-contain"
          priority
        />
      </Link>
  


        {/* Search (desktop only input) */}
        <div className="relative flex-1 max-w-full" ref={searchRef}>
          {/* DESKTOP input */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/50 z-10" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              onFocus={() => setShowSuggestions(searchQuery.trim().length > 0)}
              placeholder="Search for Cameras, Audio, Lighting etc..."
              className="w-full rounded-full bg-gray-100 pl-10 pr-12 py-2 text-[14px] leading-none font-medium text-black placeholder:text-black/50 outline-none focus:ring-2 focus:ring-gray-200"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3 w-3 text-black/50" />
              </button>
            )}
            {isSearching && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-black/50" />
              </div>
            )}
          </div>

          {/* Suggestions (kept same) */}
          {showSuggestions && (
            <>
              {/* Desktop dropdown */}
              <div className="hidden md:block absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
                {suggestions.length > 0 ? (
                  <div className="p-2">
                    {suggestions.map((s) => (
                      <button
                        key={`${s.type}-${s.id}`}
                        onClick={() => handleSuggestionClick(s)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                      >
                        {s.image && (
                          <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={s.image}
                              alt={s.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/placeholder.svg"
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{s.name}</p>
                          {s.category && <p className="text-xs text-gray-500 mt-1">in {s.category}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-gray-500">Start typing to search…</div>
                )}
              </div>

              {/* Mobile full-screen overlay (unchanged) */}
              <div className="md:hidden fixed inset-0 z-[60] bg-white">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
                  <button
                    className="p-2 rounded-full hover:bg-gray-100"
                    aria-label="Close search"
                    onClick={() => setShowSuggestions(false)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/50" />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Search for Cameras, Audio, Lighting etc..."
                      className="w-full rounded-full bg-gray-100 pl-10 pr-12 py-2 text-[14px] leading-none font-medium text-black placeholder:text-black/50 outline-none focus:ring-2 focus:ring-gray-200"
                    />
                    {isSearching ? (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-black/50" />
                    ) : (
                      searchQuery && (
                        <button
                          onClick={clearSearch}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                          aria-label="Clear search"
                        >
                          <X className="h-3 w-3 text-black/50" />
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="p-2 overflow-y-auto h-[calc(100vh-56px)] bg-white">
                  {suggestions.length > 0 ? (
                    suggestions.map((s) => (
                      <button
                        key={`${s.type}-${s.id}`}
                        onClick={() => handleSuggestionClick(s)}
                        className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-lg transition-colors text-left mb-2"
                      >
                        {s.image && (
                          <div className="w-11 h-11 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={s.image}
                              alt={s.name}
                              width={44}
                              height={44}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/placeholder.svg"
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{s.name}</p>
                          {s.category && <p className="text-xs text-gray-500 mt-1">in {s.category}</p>}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 pt-4 text-sm text-gray-500">Start typing to search…</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ==== MOBILE RIGHT: Search icon + User ==== */}
        <div className="md:hidden flex items-center gap-2 ml-auto">
          {/* Search icon opens overlay */}
          <button
            onClick={() => setShowSuggestions(true)}
            aria-label="Open search"
            className={bareIconBtn}               
          >
            <Search className="h-5 w-5 text-black" />
          </button>

          {/* User: show icon + text when logged out; icon-only when logged in */}
        <button
          onClick={() => {
            const token = getAuthToken()
            router.push(token ? "/profile" : "/login")
          }}
          aria-label="User"
          className={isLoggedIn ? bareIconBtn : loginCtaBtn}   // ← uses the updated no-wrap class
        >
          <CircleUserRound className="h-5 w-5 text-[#E72429]" />
          {!isLoggedIn && (
            <span className="text-[13px] font-medium text-[#E72429] whitespace-nowrap">
              {"Login\u00a0/\u00a0Sign\u00a0Up"}
            </span>
          )}
        </button>
        </div>

        {/* Desktop nav (unchanged) */}
        <nav className="hidden md:flex items-center gap-6 ml-4">
          {[
            { name: "Services", href: "https://babas.in/" },
            { name: "About Us", href: "/about" },
            { name: "Contact", href: "/contact" },
            { name: "My Orders", href: "/orders" },
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              target={item.name === "Services" ? "_blank" : undefined}
              rel={item.name === "Services" ? "noopener noreferrer" : undefined}
              className="text-[14px] font-normal text-black transition-colors duration-150 hover:font-semibold hover:text-black"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop icon buttons (unchanged) */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <button
            onClick={() => router.push("/cart")}
            aria-pressed={pathname === "/cart"}
            aria-label="Cart"
            className={`${iconBtn} ${pathname === "/cart" ? "ring-2 ring-red-300" : ""}`}
          >
            <Handbag className={`h-5 w-5 ${pathname === "/cart" ? "text-red-600" : "text-black"}`} strokeWidth={1.75} />
            {cartCount > 0 && (
              <span
                aria-label={`${cartCount} items in cart`}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center font-semibold"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => router.push("/wishlist")}
            aria-pressed={pathname === "/wishlist"}
            aria-label="Wishlist"
            className={`${iconBtn} ${pathname === "/wishlist" ? "ring-2 ring-red-300" : ""}`}
          >
            <Heart
              className={`h-5 w-5 ${pathname === "/wishlist" ? "text-red-600" : "text-black"}`}
              fill="currentColor"
              strokeWidth={1.75}
            />
            {wishlistCount > 0 && (
              <span
                aria-label={`${wishlistCount} items in wishlist`}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center font-semibold"
              >
                {wishlistCount > 99 ? "99+" : wishlistCount}
              </span>
            )}
          </button>

          {/* User: show icon + text when logged out; icon-only when logged in (same as mobile) */}
          <button
            onClick={() => {
              const token = getAuthToken()
              router.push(token ? "/profile" : "/login")
            }}
            aria-pressed={pathname === "/login" || pathname === "/profile"}
            aria-label="User"
            className={
              isLoggedIn === null
                ? iconBtn // SSR: always show icon only
                : isLoggedIn
                ? iconBtn
                : loginCtaBtn + " " + (pathname === "/login" || pathname === "/profile" ? "ring-2 ring-red-300" : "")
            }
          >
            <CircleUserRound className="h-5 w-5 text-[#E72429]" />
            {isLoggedIn === false && (
              <span className="text-[13px] font-medium text-[#E72429]">
                Login / Sign Up
              </span>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE TOP SHEET (POPOVER) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title">
          {/* Overlay */}
          <button className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close menu overlay" />

          {/* Panel */}
          <div
            id="mobile-top-sheet"
            ref={panelRef}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[720px] bg-white text-gray-900 shadow-xl border-b border-gray-200 rounded-b-2xl animate-in slide-in-from-top duration-200"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <h2 id="mobile-menu-title" className="text-base font-semibold">Menu</h2>
              <button onClick={() => setMobileOpen(false)} className={iconBtn} aria-label="Close menu">
                <X className="h-5 w-5 text-black" />
              </button>
            </div>

            <nav className="px-2 pb-2">
 <MobileLink
    href="https://babas.in/"
    target="_blank"
    rel="noopener noreferrer"
    onClick={() => setMobileOpen(false)}
  >
    Services
  </MobileLink>              <MobileLink href="/about" onClick={() => setMobileOpen(false)}>About Us</MobileLink>
              <MobileLink href="/contact" onClick={() => setMobileOpen(false)}>Contact</MobileLink>

              <div className="my-2 h-px bg-gray-200" />

              {/* Removed Orders & Cart per request */}
              <MobileLink href="/wishlist" onClick={() => setMobileOpen(false)}>
                <span className="inline-flex items-center gap-3">
                  <Heart className="h-4 w-4" /> Wishlist
                </span>
              </MobileLink>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}

/* ---------- Small helpers for mobile sheet ---------- */

function MobileLink({
  href,
  children,
  onClick,
  target,
  rel,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  target?: string;
  rel?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      target={target}
      rel={rel}
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-[15px] text-gray-900 hover:bg-gray-50 active:bg-gray-100"
    >
      {children}
    </Link>
  );
}

