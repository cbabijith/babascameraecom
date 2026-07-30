"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { HomeBanner } from "../types";

export function autoplayAllowed(reducedMotion: boolean, saveData: boolean) {
  return !reducedMotion && !saveData;
}

function useMotionPreference() {
  const [canAutoplay, setCanAutoplay] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = navigator as Navigator & { connection?: { saveData?: boolean } };
    const update = () =>
      setCanAutoplay(autoplayAllowed(reduced.matches, Boolean(connection.connection?.saveData)));
    update();
    reduced.addEventListener("change", update);
    return () => reduced.removeEventListener("change", update);
  }, []);
  return canAutoplay;
}

function BannerMedia({
  banner,
  active,
  priority,
  canAutoplay,
}: {
  banner: HomeBanner;
  active: boolean;
  priority: boolean;
  canAutoplay: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active && canAutoplay) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [active, canAutoplay]);

  if (banner.mediaType === "video" && active && canAutoplay) {
    return (
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload={priority ? "metadata" : "none"}
        poster={banner.posterUrl ?? undefined}
        aria-label={banner.altText}
        className="h-full w-full object-cover"
      >
        {banner.mobileMediaUrl ? (
          <source src={banner.mobileMediaUrl} media="(max-width: 639px)" type="video/mp4" />
        ) : null}
        <source src={banner.desktopMediaUrl} type="video/mp4" />
      </video>
    );
  }

  const image = banner.mediaType === "video" ? banner.posterUrl : banner.desktopMediaUrl;
  if (!image) return null;
  return (
    <picture>
      {banner.mediaType === "image" && banner.mobileMediaUrl ? (
        <source media="(max-width: 639px)" srcSet={banner.mobileMediaUrl} />
      ) : null}
      {/* A picture element is intentional: banners have art-directed mobile assets. */}
      <img
        src={image}
        alt={banner.altText}
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        width={1600}
        height={900}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </picture>
  );
}

export function HomeBannerCarousel({ banners }: { banners: HomeBanner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const canAutoplay = useMotionPreference();
  const multiple = banners.length > 1;
  const go = useCallback(
    (next: number) => {
      if (!banners.length) return;
      setIndex((next + banners.length) % banners.length);
    },
    [banners.length],
  );

  useEffect(() => {
    if (!multiple || paused || !canAutoplay) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % banners.length),
      6_000,
    );
    return () => window.clearInterval(timer);
  }, [banners.length, canAutoplay, multiple, paused]);

  useEffect(() => {
    const visibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);

  if (!banners.length) {
    return null;
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      className="group relative overflow-hidden rounded-[22px] bg-[#06162a] sm:rounded-[28px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(index - 1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(index + 1);
        }
      }}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches[0]?.clientX;
        touchStart.current = null;
        if (start === null || end === undefined || Math.abs(start - end) < 45) return;
        go(index + (start > end ? 1 : -1));
      }}
    >
      <div className="relative aspect-[4/5] max-h-[76vh] min-h-[360px] sm:aspect-[16/6] sm:min-h-[230px]">
        {banners.map((banner, bannerIndex) => (
          <article
            key={banner.id}
            aria-hidden={bannerIndex !== index}
            className={`absolute inset-0 transition-opacity duration-500 ${bannerIndex === index ? "z-10 opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <BannerMedia
              banner={banner}
              active={bannerIndex === index}
              priority={bannerIndex === 0}
              canAutoplay={canAutoplay}
            />
            {banner.headline || banner.subheading || banner.buttonLabel ? (
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent p-6 text-white sm:p-10 lg:p-14">
                <div className="max-w-xl">
                  {banner.headline ? (
                    <h2 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                      {banner.headline}
                    </h2>
                  ) : null}
                  {banner.subheading ? (
                    <p className="mt-3 max-w-lg text-sm leading-6 text-white/90 sm:text-base">
                      {banner.subheading}
                    </p>
                  ) : null}
                  {banner.buttonLabel && banner.destinationUrl ? (
                    <Link
                      href={banner.destinationUrl}
                      target={banner.openInNewTab ? "_blank" : undefined}
                      rel={banner.openInNewTab ? "noopener noreferrer" : undefined}
                      tabIndex={bannerIndex === index ? 0 : -1}
                      className="mt-5 inline-flex rounded-full bg-[#e94560] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d63852] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      {banner.buttonLabel}
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {multiple ? (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-900 shadow opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-900 shadow opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          >
            <ChevronRight className="size-5" />
          </button>
          <div
            className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2"
            role="tablist"
            aria-label="Choose banner"
          >
            {banners.map((banner, bannerIndex) => (
              <button
                key={banner.id}
                type="button"
                role="tab"
                aria-selected={bannerIndex === index}
                aria-label={`Show banner ${bannerIndex + 1}`}
                onClick={() => go(bannerIndex)}
                className={`h-2 rounded-full transition-all ${bannerIndex === index ? "w-7 bg-white" : "w-2 bg-white/60 hover:bg-white"}`}
              />
            ))}
          </div>
        </>
      ) : null}
      <p className="sr-only" aria-live="polite">
        Banner {index + 1} of {banners.length}
      </p>
    </section>
  );
}
