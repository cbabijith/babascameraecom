"use client"

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Category, BrandAssociation } from "@/types/product";
import { getThumbnailUrl } from "@/lib/apiClient";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/store";
import { hydrateCategories } from "@/store/slice/categorySlice";

export default function Header() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { categories, verifiedIds, status } = useAppSelector((s) => s.categories);

  useEffect(() => { dispatch(hydrateCategories()); }, [dispatch]);

  const [openId, setOpenId] = useState<string | null>(null);

  // scroll state
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflowing = scrollWidth > clientWidth + 1;
    setIsOverflowing(overflowing);
    setCanScrollLeft(overflowing && scrollLeft > 0);
    setCanScrollRight(overflowing && scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollButtons();
    const onScroll = () => updateScrollButtons();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", onScroll); ro.disconnect(); };
  }, [updateScrollButtons]);

  const scrollByAmount = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(240, Math.min(560, Math.floor(el.clientWidth * 0.8)));
    el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
  };

  useEffect(() => { setOpenId(null); }, [pathname]);

  // TOUCH DRAG vs TAP GUARD (same as yours)
  const touchState = useRef({ startX: 0, startY: 0, dragging: false, lastDragTs: 0 });
  const DRAG_THRESHOLD_PX = 6;
  const OPEN_COOLDOWN_MS = 150;

  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.touches[0];
    touchState.current.startX = t.clientX;
    touchState.current.startY = t.clientY;
    touchState.current.dragging = false;
  };
  const handleTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - touchState.current.startX);
    const dy = Math.abs(t.clientY - touchState.current.startY);
    if (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX) {
      if (!touchState.current.dragging) {
        touchState.current.dragging = true;
        touchState.current.lastDragTs = Date.now();
      }
    }
  };
  const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {};
  const justDragged = () => {
    const recently = Date.now() - touchState.current.lastDragTs < OPEN_COOLDOWN_MS;
    return touchState.current.dragging || recently;
  };

  // const getActiveBrands = (brands?: BrandAssociation[]) =>
  //   (brands ?? [])
  //     .filter((b) => b.status === "Active" && b.visibility === "Show")
  //     .sort((a, b) => a.position - b.position);

  const isActiveRoute = (categoryId: string) => pathname?.includes(`/products/category/${categoryId}`) || false;
  const isBrandRoute = (brandId: string) => pathname?.includes(`/products/brand/${brandId}`) || false;
  const handleNavigateClose = () => setOpenId(null);

  // ✅ never hide; verified first, then position
  const categoriesToShow: Category[] = useMemo(() => {
    if (!categories.length) return [];
    const set = new Set(verifiedIds);
    return categories
      .slice()
      .sort((a, b) => {
        const av = set.has(a._id) ? 1 : 0;
        const bv = set.has(b._id) ? 1 : 0;
        if (av !== bv) return bv - av;
        return a.position - b.position;
      });
  }, [categories, verifiedIds]);

  // Skeleton
  if (status === "loading") {
    const SKELETON_COUNT = 6;
    return (
      <header className="bg-gray-50 border-b border-gray-200">
        <div className="constrained-width">
          <div className="relative">
            <div ref={scrollerRef} className="overflow-x-auto scroll-smooth" style={{ scrollbarWidth: "none" }}>
              <div className="flex w-full justify-center">
                <nav className="inline-flex items-center gap-2 py-3 w-max">
                  <Skeleton className="h-8 w-28 rounded-md" />
                  {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24 rounded-md" />
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Fallback
  if (status === "failed" && categoriesToShow.length === 0) {
    return (
      <header className="bg-gray-50 border-b border-gray-200">
        <div className="constrained-width">
          <nav className="flex items-center justify-center gap-6 py-3">
            <Link
              href="/products"
              className={cn(
                "text-sm font-[600] whitespace-nowrap hover:text-red-600 transition-colors",
                pathname === "/products" ? "text-red-600 border-b-2 border-red-600 pb-1" : "text-gray-700"
              )}
            >
              All Products
            </Link>
            <Link href="/products" className="text-sm text-gray-600 hover:text-red-600">
              Browse Categories →
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-gray-50 border-b border-gray-200">
      <div className="relative constrained-width">
        <div className="relative">
          {isOverflowing && canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-gray-50 to-transparent hidden md:block" />
          )}
          {isOverflowing && canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-gray-50 to-transparent hidden md:block" />
          )}

          {isOverflowing && canScrollLeft && (
            <button
              aria-label="Scroll left"
              onClick={() => scrollByAmount("left")}
              className="hidden md:flex items-center justify-center absolute left-1 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white p-1 shadow hover:bg-gray-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {isOverflowing && canScrollRight && (
            <button
              aria-label="Scroll right"
              onClick={() => scrollByAmount("right")}
              className="hidden md:flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white p-1 shadow hover:bg-gray-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <div
            ref={scrollerRef}
            className="overflow-x-auto scroll-smooth"
            style={{ scrollbarWidth: "none" }}
            onScroll={updateScrollButtons}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className={cn("flex w-full", isOverflowing ? "justify-start" : "justify-center")}>
              <nav className="inline-flex items-center gap-4 py-3 w-max">
                {/* All Products */}
                <Link
                  href="/products"
                  onClick={handleNavigateClose}
                  className={cn(
                    "text-sm font-[600] whitespace-nowrap px-3 py-2 rounded-md transition-colors hidden md:inline-flex",
                    pathname === "/products" ? "text-red-600 bg-red-50" : "text-gray-700 hover:text-red-600 hover:bg-gray-100"
                  )}
                >
                  All Products
                </Link>

                {/* Categories */}
                {categoriesToShow.map((category) => {
                  const activeBrands = (category.brands ?? [])
                    .filter((b) => b.status === "Active" && b.visibility === "Show")
                    .sort((a, b) => a.position - b.position);

                  const hasActiveBrands = activeBrands.length > 0;

                  if (!hasActiveBrands) {
                    return (
                      <Link
                        key={category._id}
                        href={`/products/category/${category._id}`}
                        onClick={handleNavigateClose}
                        className={cn(
                          "text-sm font-[600] whitespace-nowrap px-3 py-2 rounded-md transition-colors capitalize",
                          isActiveRoute(category._id)
                            ? "text-red-600 bg-red-50"
                            : "text-gray-700 hover:text-red-600 hover:bg-gray-100"
                        )}
                      >
                        {category.name}
                      </Link>
                    );
                  }

                  return (
                    <DropdownMenu
                      key={category._id}
                      open={openId === category._id}
                      onOpenChange={(o) => {
                        if (o && justDragged()) return;
                        setOpenId(o ? category._id : null);
                      }}
                    >
                      <DropdownMenuTrigger
                        onPointerDown={(e) => {
                          if (e.pointerType === "touch" && justDragged()) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        onClick={(e) => {
                          if (justDragged()) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        className={cn(
                          "flex items-center text-sm font-[600] whitespace-nowrap px-3 py-2 rounded-md transition-colors capitalize group outline-none",
                          isActiveRoute(category._id)
                            ? "text-red-600 bg-red-50"
                            : "text-gray-700 hover:text-red-600 hover:bg-gray-100"
                        )}
                      >
                        {category.name}
                        <ChevronDown className="ml-1 h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="w-[92vw] max-w-[500px] p-0 md:w-[500px]" align="start" sideOffset={5}>
                        <div className="p-6">
                          <div className="flex items-center gap-3 mb-6">
                            {category.image && (
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border">
                                <Image
                                  src={getThumbnailUrl(category.image.key)}
                                  alt={category.name}
                                  width={40}
                                  height={40}
                                  className="object-contain w-full h-full p-1"
                                  onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                                />
                              </div>
                            )}
                            <div>
                              <h3 className="font-[600] text-gray-900 capitalize text-lg">{category.name}</h3>
                              <p className="text-sm text-gray-600">
                                Choose from {activeBrands.length} brand{activeBrands.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-6">
                            {activeBrands.map((brandAssoc) => (
                              <Link
                                key={brandAssoc._id}
                                 href={`/products/brand/${brandAssoc.brand._id}?category=${category._id}`}
                                onClick={handleNavigateClose}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50",
                                  isBrandRoute(brandAssoc.brand._id)
                                    ? "bg-red-50 border-red-200 text-red-700"
                                    : "bg-white border-gray-200 hover:border-gray-300"
                                )}
                              >
                                <div className="w-12 h-12 rounded-md overflow-hidden bg-white border flex-shrink-0">
                                  <Image
                                    src={getThumbnailUrl(brandAssoc.brand.image.key)}
                                    alt={brandAssoc.brand.name}
                                    width={48}
                                    height={48}
                                    className="object-contain w-full h-full p-1"
                                    onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-[600] capitalize text-sm truncate">{brandAssoc.brand.name}</div>
                                  {/* <div className="text-xs text-gray-500">{brandAssoc.brand.code}</div> */}
                                </div>
                              </Link>
                            ))}
                          </div>

                          <div className="pt-4 border-t border-gray-200">
                            <Link
                              href={`/products/category/${category._id}`}
                              onClick={handleNavigateClose}
                              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                            >
                              <div>
                                <div className="font-[600] text-gray-900 text-sm">View all {category.name} products</div>
                                <div className="text-xs text-gray-600">Browse the complete collection</div>
                              </div>
                              <div className="text-gray-400 group-hover:text-gray-600 transition-colors">→</div>
                            </Link>
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
