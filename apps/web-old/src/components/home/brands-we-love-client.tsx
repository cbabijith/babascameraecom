// src/components/home/brands-we-love-client.tsx
// Client component for BrandsWeLove interactivity (scroll, navigation)
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getImageUrl } from "@/lib/apiClient";

interface Brand {
  _id: string;
  name: string;
  image?: {
    key: string;
  };
}

interface BrandsWeLoveClientProps {
  brands: Brand[];
}

export default function BrandsWeLoveClient({ brands }: BrandsWeLoveClientProps) {
  const router = useRouter();
  const [clickedId, setClickedId] = useState<string | null>(null);
  const [showArrows, setShowArrows] = useState(false);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const firstCardRef = useRef<HTMLButtonElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [pageStep, setPageStep] = useState(0);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;

    if (scrollWidth <= clientWidth + 1) {
      setShowArrows(false);
      setCanLeft(false);
      setCanRight(false);
      return;
    }

    setShowArrows(true);
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
    if (brands.length) {
      requestAnimationFrame(() => measure());
    } else {
      setPageStep(0);
    }
  }, [brands.length, measure]);

  useEffect(() => {
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
  }, [measure, updateArrows]);

  const scrollByAmount = (dir: "left" | "right") => {
    const el = trackRef.current;
    if (!el || !pageStep) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const delta = dir === "left" ? -pageStep : pageStep;
    const target = Math.max(0, Math.min(scrollLeft + delta, scrollWidth - clientWidth));

    try {
      el.scrollTo({ left: target, behavior: "smooth" });
    } catch {
      el.scrollLeft = target;
    }

    requestAnimationFrame(updateArrows);
  };

  const goBrand = (id: string) => {
    setClickedId(id);
    router.push(`/products/brand/${id}`);
  };

  if (brands.length === 0) return null;

  return (
    <section className="py-0">
      <div className="constrained-width">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="text-xl sm:text-2xl lg:text-[28px] font-[650] text-gray-900">
            Brands We Love
          </h2>

          {showArrows && (
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
          )}
        </div>

        {/* Track */}
        <div className="overflow-hidden">
          <div
            ref={trackRef}
            className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory md:snap-none gap-3 md:gap-6 pb-2 scrollbar-hide px-1 sm:px-4 md:mx-0 md:px-0"
          >
            {brands.map((brand, i) => {
              const logoSrc = brand.image?.key ? getImageUrl(brand.image.key) : "/placeholder.svg";
              const isFirst = i === 0;
              const busy = clickedId === brand._id;
              
              return (
                <button
                  key={brand._id}
                  ref={isFirst ? firstCardRef : undefined}
                  onClick={() => goBrand(brand._id)}
                  disabled={busy}
                  className={`relative flex-none bg-white shadow-sm overflow-hidden flex flex-col items-center justify-start
                    focus:outline-none focus:ring-2 focus:ring-gray-300 snap-start
                    w-[130px] sm:w-[190px] md:w-[230px] lg:w-[285px]
                    h-[170px] md:h-[260px] lg:h-[300px]
                    rounded-[16px] md:rounded-[28px] lg:rounded-[36px]
                    border border-gray-200 px-2 md:px-4 lg:px-5 pt-2 md:pt-4 lg:pt-5
                    ${busy ? "opacity-75" : ""}`}
                  aria-label={`View ${brand.name} products`}
                >
                  <div
                    className="min-h-[36px] sm:min-h-0 mt-1 px-1 text-gray-900 uppercase font-extrabold select-none
                      text-[clamp(10px,2.8vw,18px)] tracking-[0.08em] md:tracking-[0.12em] lg:tracking-[0.14em]
                      text-center leading-snug whitespace-normal break-words overflow-hidden"
                    style={{
                      overflowWrap: "anywhere",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {brand.name}
                  </div>

                  <div className="flex-1 w-full flex items-center justify-center">
                    <div className="relative w-full h-[70px] md:h-[160px] lg:h-[200px]">
                      <Image
                        src={logoSrc}
                        alt={`${brand.name} logo`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 160px, (max-width: 1024px) 230px, 285px"
                        priority={false}
                        draggable={false}
                      />
                    </div>
                  </div>

                  {busy && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-700" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
