// src/components/home/offer-zone.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { getCollections } from "@/instances/collectionInstance";
import type { Collection, CollectionProduct } from "@/types/collection";
import { getImageUrl } from "@/lib/apiClient";
import { buildProductPath } from "@/lib/slug";

/* ---------------- small helper ---------------- */
const capFirst = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

/* ---------------- Skeleton used while load / retry ---------------- */
function OfferSkeletonRow() {
  return (
    <section className="py-0">
      <div className="constrained-width">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-xl sm:text-2xl lg:text-[28px] text-black font-[650]">
              Offer Zone
            </h2>
            <span className="h-6 sm:h-7 w-16 sm:w-20 rounded-full bg-gray-200 animate-pulse" />
          </div>
          <div className="hidden md:block h-10 w-[92px]" />
        </div>

        <div className="overflow-hidden">
          <div className="flex gap-3 md:gap-6 pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-none w-[140px] md:w-[285px]">
                <div
                  className="
                    rounded-[14px] md:rounded-[36px] border bg-white shadow-sm animate-pulse
                    w-[140px] h-[90.8537px] md:w-[285px] md:h-[202px]
                  "
                />
                <div className="mt-2 md:mt-3 space-y-1.5">
                  <div className="h-3 md:h-4 w-[80%] bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 md:h-4 w-[60%] bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 md:h-5 w-[50%] bg-gray-200 rounded animate-pulse mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- One strip for a single collection ---------------- */
function OfferStrip({ collection }: { collection: Collection }) {
  const router = useRouter();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const firstCardRef = useRef<HTMLDivElement | null>(null);

  const products = useMemo<CollectionProduct[]>(
    () => (Array.isArray(collection?.products) ? collection.products : []),
    [collection]
  );

  // Hooks MUST be unconditional. Do NOT early-return before these.
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [pageStep, setPageStep] = useState(0);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 0);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  const measure = useCallback(() => {
    const track = trackRef.current;
    const card = firstCardRef.current;
    if (!track || !card) return;
    const trackWidth = track.clientWidth;
    const cardRect = card.getBoundingClientRect();
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
    const oneCard = cardRect.width + gap;
    const visible = Math.max(1, Math.floor((trackWidth + gap) / Math.max(1, oneCard)));
    setPageStep(visible * oneCard);
    updateArrows();
  }, [updateArrows]);

  useEffect(() => {
    // If no products, we still called hooks (good), but skip measuring work
    if (products.length === 0) return;

    measure();
    const el = trackRef.current;
    if (!el) return;

    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [measure, updateArrows, products.length]);

  // Now it's safe to early-return without violating hooks rules
  if (products.length === 0) return null;

  const scrollByAmount = (dir: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const delta = dir === "left" ? -pageStep : pageStep;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  const goToProduct = (id: string, slug?: string) => router.push(buildProductPath({ _id: id, slug }));

  return (
    <section className="py-0">
      <div className="constrained-width">
        {/* Header: collection name + OFF pill */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-xl sm:text-2xl lg:text-[28px] text-black font-[650]">
              {capFirst(collection?.name) || "Offer Zone"}
            </h2>

            {typeof collection?.value === "number" && (
              <span
                className="text-white text-xs sm:text-sm px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "#E72429" }}
              >
                {collection.value}% OFF
              </span>
            )}
          </div>

          {/* Desktop arrows only */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollByAmount("left")}
              disabled={!canLeft}
              className="h-10 w-10 rounded-full bg-white border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              aria-label="Previous offers"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollByAmount("right")}
              disabled={!canRight}
              className="h-10 w-10 rounded-full bg-white border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              aria-label="Next offers"
            >
              <ChevronRight className="h-5 w-5 text-gray-700" />
            </Button>
          </div>
        </div>

        {/* Slider */}
        <div className="overflow-hidden">
          <div
            ref={trackRef}
            className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory md:snap-none gap-3 md:gap-6 pb-2 scrollbar-hide"
          >
            {products.map((p, i) => {
              const cover = p.images?.[0]?.key ? getImageUrl(p.images[0].key) : "/placeholder.svg";
              const sale = p.price?.salePrice ?? 0;
              const actual = p.price?.actualPrice ?? 0;
              const isFirst = i === 0;

              // Unique key in case a product repeats within a collection
              const reactKey = `${collection._id}-${p._id}-${i}`;

              return (
                <div
                  key={reactKey}
                  ref={isFirst ? firstCardRef : undefined}
                  role="link"
                  tabIndex={0}
                  onClick={() => goToProduct(p._id, p.slug)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") goToProduct(p._id, p.slug);
                  }}
                  onMouseEnter={() => router.prefetch(buildProductPath({ _id: p._id, slug: p.slug }))}
                  className="flex-none flex flex-col group cursor-pointer snap-start w-[140px] md:w-[285px]"
                  aria-label={`View ${p.name}`}
                >
                  <div
                    className="relative overflow-hidden bg-gray-100 transition-transform group-hover:-translate-y-0.5
                               mb-2 md:mb-3 w-[140px] h-[90.8537px] md:w-[285px] md:h-[202px]
                               rounded-[14px] md:rounded-[36px] border"
                    style={{ borderWidth: 0.45 }}
                  >
                    <Image
                      src={cover}
                      alt={p.name}
                      fill
                      className="object-contain p-2 sm:p-3 md:p-4 lg:p-5"
                      sizes="(max-width: 768px) 140px, 285px"
                      priority={isFirst}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />
                  </div>

                  <div className="text-left">
                    <h3 className="text-[12px] sm:text-sm md:text-base lg:text-md text-gray-900 mb-1 md:mb-1.5 font-[600] group-hover:underline line-clamp-2">
                      {capFirst(p.name)}
                    </h3>

                    {p?.category?.name && (
                      <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-2 font-[500]">
                        {capFirst(p.category.name)}
                      </p>
                    )}

                    <div className="flex flex-col items-start">
                      {actual > sale && (
                        <span className="text-xs md:text-sm lg:text-base text-gray-500 line-through font-[500]">
                          ₹{Number(actual).toLocaleString()}
                        </span>
                      )}
                      <span className="text-sm md:text-lg lg:text-xl text-gray-900 font-[750]">
                        ₹{Number(sale).toLocaleString()}
                      </span>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Wrap: fetch + render many sections ---------------- */
export default function OfferZone() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const mountedRef = useRef(false);

  const fetchCollections = useCallback(async () => {
    try {
      // fresh load / retry skeleton
      if (!mountedRef.current) return;
      const rows = await getCollections();
      const sorted = [...(rows ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      setCollections(sorted);
    } catch {
      // On error: just clear data; visibility logic below will hide the section.
      setCollections([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchCollections();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchCollections]);

  // Auto-refetch on global retry/recovery
  useEffect(() => {
    const refetch = async () => {
      if (!mountedRef.current) return;
      setIsRetrying(true);
      setLoading(true); // show skeleton while retrying
      await fetchCollections();
      if (mountedRef.current) {
        setIsRetrying(false);
      }
    };

    window.addEventListener("api:retry-now", refetch as EventListener);
    window.addEventListener("api:recovered", refetch as EventListener);

    return () => {
      window.removeEventListener("api:retry-now", refetch as EventListener);
      window.removeEventListener("api:recovered", refetch as EventListener);
    };
  }, [fetchCollections]);

  // While loading or retrying → skeletons
  if (loading || isRetrying) {
    return (
      <>
        <OfferSkeletonRow />
        <OfferSkeletonRow />
      </>
    );
  }

  // Filter out empty collections
  const nonEmpty = collections.filter((c) => Array.isArray(c.products) && c.products.length > 0);

  // If nothing to show (failed or all empty) → hide section completely
  if (nonEmpty.length === 0) return null;

  return (
    <>
      {nonEmpty.map((c) => (
        <OfferStrip key={c._id} collection={c} />
      ))}
    </>
  );
}
