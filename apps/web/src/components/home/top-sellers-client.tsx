// src/components/home/top-sellers-client.tsx
// Client component for TopSellers interactivity (scroll, navigation)
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { getImageUrl } from "@/lib/apiClient";
import { buildProductPath } from "@/lib/slug";

interface Product {
  _id: string;
  name: string;
  slug?: string;
  price?: {
    actualPrice?: number;
    salePrice?: number;
  };
  images?: { key: string }[];
  category?: {
    _id: string;
    name: string;
  };
}

interface TopSellersClientProps {
  products: Product[];
}

const formatINR = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

export default function TopSellersClient({ products }: TopSellersClientProps) {
  const router = useRouter();
  const productHref = (pid: string, pslug?: string) => buildProductPath({ _id: pid, slug: pslug });

  // DOM refs
  const trackRef = useRef<HTMLDivElement | null>(null);
  const firstCardRef = useRef<HTMLDivElement | null>(null);

  // scroll state
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [cardStep, setCardStep] = useState(0);

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

    const cardRect = card.getBoundingClientRect();
    const cs = getComputedStyle(track);
    const gap = parseFloat(cs.columnGap || cs.gap || "0") || 0;

    const trackWidth = track.clientWidth;
    const oneCard = cardRect.width + gap;
    const visFloat = (trackWidth + gap) / Math.max(1, oneCard);
    const whole = Math.max(1, Math.floor(visFloat));
    setCardStep(whole * oneCard);

    updateArrows();
  }, [updateArrows]);

  useEffect(() => {
    if (products.length) {
      measure();
    } else {
      setCardStep(0);
    }
  }, [products.length, measure]);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;

    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(el);

    if (firstCardRef.current) {
      ro.observe(firstCardRef.current);
    }

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [measure, updateArrows]);

  const scrollByAmount = (dir: "left" | "right") => {
    const el = trackRef.current;
    if (!el || !cardStep) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const delta = dir === "left" ? -cardStep : cardStep;
    const target = Math.max(0, Math.min(scrollLeft + delta, scrollWidth - clientWidth));

    try {
      el.scrollTo({ left: target, behavior: "smooth" });
    } catch {
      el.scrollLeft = target;
    }

    requestAnimationFrame(updateArrows);
  };

  if (products.length === 0) return null;

  return (
    <section className="py-0">
      <div className="constrained-width">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="text-xl sm:text-2xl lg:text-[28px] text-gray-900 font-[650]">
            Top Sellers
          </h2>

          {/* Desktop arrows only */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => scrollByAmount("left")}
              disabled={!canLeft}
              className="h-10 w-10 rounded-full border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-50"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => scrollByAmount("right")}
              disabled={!canRight}
              className="h-10 w-10 rounded-full border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-50"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5 text-gray-700" />
            </Button>
          </div>
        </div>

        {/* Slider */}
        <div className="overflow-hidden">
          <div
            ref={trackRef}
            className="
              flex overflow-x-auto scroll-smooth snap-x snap-mandatory md:snap-none
              gap-4 md:gap-5 pb-2 scrollbar-hide
              [--gap:16px] md:[--gap:20px]
              [--cards:2.5] sm:[--cards:3.5] lg:[--cards:4.5]
            "
          >
            {products.map((p, i) => {
              const cover = p.images?.[0]?.key ? getImageUrl(p.images[0].key) : "/placeholder.svg";
              const sale = p.price?.salePrice ?? 0;
              const actual = p.price?.actualPrice ?? 0;
              const isFirst = i === 0;

              return (
                <div
                  key={p._id}
                  role="link"
                  tabIndex={0}
                  ref={isFirst ? firstCardRef : undefined}
                  onClick={() => router.push(productHref(p._id, p.slug))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") router.push(productHref(p._id, p.slug));
                  }}
                  onMouseEnter={() => router.prefetch(productHref(p._id, p.slug))}
                  className="
                    flex-none flex flex-col group cursor-pointer snap-start
                    w-[calc((100%-(var(--gap)*(var(--cards)-1)))/var(--cards)+6px)]
                    md:w-[calc((100%-(var(--gap)*(var(--cards)-1)))/var(--cards))]
                  "
                  aria-label={`View ${p.name}`}
                >
                  {/* Media */}
                  <div
                    className="
                      relative overflow-hidden bg-gray-100 transition-transform group-hover:-translate-y-0.5
                      rounded-[14px] md:rounded-[24px] border
                      h-[140px] md:h-[180px] mb-2 md:mb-2
                    "
                    style={{ borderWidth: 0.45 }}
                  >
                    <Image
                      src={cover}
                      alt={p.name}
                      fill
                      className="object-contain p-4 md:p-5"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      priority={isFirst}
                    />
                  </div>

                  {/* Text stack */}
                  <div className="text-left flex flex-col min-h-[96px] md:min-h-[94px]">
                    <h3
                      className="
                        text-[12px] sm:text-sm md:text-base text-gray-900 font-[600]
                        group-hover:underline
                        line-clamp-2 md:line-clamp-1
                        leading-snug
                        min-h-[3.0em] md:min-h-[1.5em]
                        mb-0.5
                      "
                      title={p.name}
                    >
                      {p.name ? p.name.charAt(0).toUpperCase() + p.name.slice(1) : ""}
                    </h3>
                    <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 font-[500] line-clamp-1 mb-0.5 md:mb-1">
                      {p.category?.name
                        ? p.category.name.charAt(0).toUpperCase() + p.category.name.slice(1)
                        : ""}
                    </p>

                    <div className="flex flex-col items-start gap-0.5">
                      {actual > sale && (
                        <span className="text-xs md:text-sm lg:text-base text-gray-500 line-through font-[500]">
                          {formatINR(actual)}
                        </span>
                      )}
                      <span className="text-base md:text-lg lg:text-xl text-gray-900 font-[800]">
                        {formatINR(sale)}
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
