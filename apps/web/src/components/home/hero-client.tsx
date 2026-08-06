// src/components/home/hero-client.tsx
// Client component for Hero interactivity (carousel, swipe, mute button)
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Volume2, VolumeX } from "lucide-react";
import { HeroBannerSkeleton } from "@/components/ui/banner-skeleton";
import { getImageUrl } from "@/lib/apiClient";

// Types
interface Banner {
  _id: string;
  heading?: string;
  subHeading?: string;
  tagline?: string;
  ctaName?: string;
  position: number;
  status: string;
  visibility: string;
  mediaFile?: {
    key: string;
    mimetype?: string;
  };
}

interface HeroClientProps {
  banners: Banner[];
}

function Dot({ active = false, onClick }: { active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-2 rounded-full transition-all duration-300 cursor-pointer hover:bg-white/80 ${
        active ? "w-8 bg-white" : "w-4 bg-white/60"
      }`}
      aria-label={`Go to slide ${active ? "current" : "next"}`}
    />
  );
}

/* ---------- Tunables ---------- */
const IMAGE_DURATION_MS = 6000;
const VIDEO_STALL_SKIP_MS = 8000;
const VIDEO_MAX_FALLBACK_MS = 45000;
const SWIPE_THRESHOLD_PX = 50;
const ANGLE_TOLERANCE = 1.2;

function isVideoFile(key?: string, mimetype?: string): boolean {
  if (mimetype?.startsWith("video/")) return true;
  if (!key) return false;
  const ext = key.split(".").pop()?.toLowerCase();
  return ["mp4", "webm", "ogg", "mov", "m4v", "avi", "mkv"].includes(ext || "");
}

export default function HeroClient({ banners }: HeroClientProps) {
  const [muted, setMuted] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [slideReady, setSlideReady] = useState(false);
  const [inViewport, setInViewport] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoFallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoStallTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /* ---- swipe / drag state ---- */
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const lastDXRef = useRef(0);

  /* ---------- Ensure currentSlide is in range when banners change ---------- */
  useEffect(() => {
    if (banners.length === 0) {
      setCurrentSlide(0);
      return;
    }
    if (currentSlide >= banners.length) {
      setCurrentSlide(0);
    }
  }, [banners.length, currentSlide]);

  /* ---------- Pause when off-screen ---------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setInViewport(entries[0]?.isIntersecting ?? true),
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ---------- Helpers ---------- */
  const clearTimers = useCallback(() => {
    if (imageTimerRef.current) { clearTimeout(imageTimerRef.current); imageTimerRef.current = null; }
    if (videoFallbackTimerRef.current) { clearTimeout(videoFallbackTimerRef.current); videoFallbackTimerRef.current = null; }
    if (videoStallTimerRef.current) { clearTimeout(videoStallTimerRef.current); videoStallTimerRef.current = null; }
  }, []);

  const nextSlide = useCallback(() => {
    if (banners.length === 0) return;
    clearTimers();
    setCurrentSlide(s => (s + 1) % banners.length);
  }, [banners.length, clearTimers]);

  const prevSlide = useCallback(() => {
    if (banners.length === 0) return;
    clearTimers();
    setCurrentSlide(s => (s - 1 + banners.length) % banners.length);
  }, [banners.length, clearTimers]);

  /* ---------- Prefetch next image ---------- */
  useEffect(() => {
    if (banners.length <= 1) return;
    const next = (currentSlide + 1) % banners.length;
    const b = banners[next];
    const isVid = isVideoFile(b?.mediaFile?.key, b?.mediaFile?.mimetype);
    const url = b?.mediaFile?.key ? getImageUrl(b.mediaFile.key) : "";
    if (url && !isVid) {
      const img = new window.Image();
      img.src = url;
    }
  }, [currentSlide, banners]);

  /* ---------- Slide scheduling (image timer vs. video ended) ---------- */
  const currentBanner: Banner | undefined = banners.length > 0 ? banners[currentSlide] : undefined;
  const isVideo = isVideoFile(currentBanner?.mediaFile?.key, currentBanner?.mediaFile?.mimetype);
  const mediaUrl = currentBanner?.mediaFile?.key ? getImageUrl(currentBanner.mediaFile.key) : "/placeholder.svg";

  useEffect(() => {
    if (!currentBanner) return;
    setMediaError(null);
    setSlideReady(false);
    clearTimers();

    if (isVideo) {
      if (VIDEO_MAX_FALLBACK_MS > 0) {
        videoFallbackTimerRef.current = setTimeout(() => {
          nextSlide();
        }, VIDEO_MAX_FALLBACK_MS);
      }
    } else {
      imageTimerRef.current = setTimeout(() => {
        if (!isVideo) nextSlide();
      }, IMAGE_DURATION_MS);
    }

    return clearTimers;
  }, [currentSlide, isVideo, mediaUrl, clearTimers, nextSlide]);

  /* ---------- Play/Pause based on viewport visibility ---------- */
  useEffect(() => {
    if (isVideo && videoRef.current) {
      if (inViewport) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [inViewport, isVideo, currentSlide]);

  /* ---------- Video event handlers ---------- */
  const onVideoCanPlay = () => {
    setSlideReady(true);
    if (inViewport) {
      videoRef.current?.play().catch(() => {});
    }
  };

  const onVideoEnded = () => {
    nextSlide();
  };

  const onVideoWaitingOrStalled = () => {
    if (videoStallTimerRef.current) clearTimeout(videoStallTimerRef.current);
    videoStallTimerRef.current = setTimeout(() => {
      nextSlide();
    }, VIDEO_STALL_SKIP_MS);
  };

  const onVideoPlaying = () => {
    if (videoStallTimerRef.current) { clearTimeout(videoStallTimerRef.current); videoStallTimerRef.current = null; }
  };

  const onMediaError = () => {
    setMediaError("Media failed to load");
    setTimeout(() => nextSlide(), 1500);
  };

  /* ---------- Swipe / Drag Handlers ---------- */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    draggingRef.current = true;
    lastDXRef.current = 0;
    clearTimers();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || startXRef.current === null || startYRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    lastDXRef.current = dx;
    if (Math.abs(dx) > Math.abs(dy) * ANGLE_TOLERANCE) {
      e.preventDefault();
    }
  };

  const endSwipe = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const dx = lastDXRef.current;
    startXRef.current = null;
    startYRef.current = null;
    lastDXRef.current = 0;

    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
      if (dx < 0) nextSlide();
      else prevSlide();
    } else {
      if (isVideo) {
        if (inViewport) videoRef.current?.play().catch(() => {});
      } else {
        imageTimerRef.current = setTimeout(() => {
          if (!isVideo) nextSlide();
        }, IMAGE_DURATION_MS);
      }
    }
  }, [isVideo, inViewport, nextSlide, prevSlide]);

  const onPointerUp = () => endSwipe();
  const onPointerCancel = () => endSwipe();
  const onPointerLeave = () => endSwipe();

  /* ---------- Empty ---------- */
  if (banners.length === 0) return null;

  /* ---------- Responsive copy ---------- */
  const Heading = (
    <p className="text-[10px] sm:text-xs tracking-widest opacity-90 uppercase">{currentBanner?.heading}</p>
  );
  const Title = (
    <h1 className="mt-2 text-xl sm:text-4xl lg:text-5xl font-semibold">{currentBanner?.subHeading}</h1>
  );
  const Tagline = (
    <p className="mt-3 text-xs sm:text-base opacity-90 leading-relaxed">{currentBanner?.tagline}</p>
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-[28px] mt-10 sm:mt-14 lg:mt-16"
    >
      <div
        className="relative h-[240px] sm:h-[320px] md:h-[420px] lg:h-[460px] touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
        role="region"
        aria-roledescription="carousel"
        aria-label="Hero banners"
      >
        <div className="relative w-full h-full">
          {isVideo ? (
            <video
              key={currentBanner?._id || currentSlide}
              ref={videoRef}
              src={mediaUrl}
              muted={muted}
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
              onCanPlay={onVideoCanPlay}
              onEnded={onVideoEnded}
              onPlaying={onVideoPlaying}
              onError={onMediaError}
            />
          ) : (
            <Image
              src={mediaUrl}
              alt={currentBanner?.subHeading || "Hero Banner"}
              fill
              className="object-cover"
              priority={true}
              fetchPriority="high"
              sizes="100vw"
              onLoad={() => setSlideReady(true)}
              onError={onMediaError}
            />
          )}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Copy */}
        <div className="absolute inset-0 px-4 sm:px-8 md:px-12 lg:px-16 py-6 sm:py-8 flex items-end">
          <div className="max-w-xl text-white transition-all duration-500">
            {Heading}
            {Title}
            {Tagline}

            {currentBanner?.ctaName && (
              <div className="mt-5 sm:mt-6">
                <Link
                  href={`/products/banner/${currentBanner._id}`}
                  className="inline-flex items-center rounded-full bg-white text-gray-900 px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-medium hover:bg-gray-100 transition-colors duration-200 shadow-lg"
                >
                  {currentBanner.ctaName.charAt(0).toUpperCase() + currentBanner.ctaName.slice(1)}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {banners.map((_, index) => (
              <Dot
                key={index}
                active={index === currentSlide}
                onClick={() => {
                  clearTimers();
                  setCurrentSlide(index);
                }}
              />
            ))}
          </div>
        )}

        {/* Mute/Unmute */}
        {isVideo && (
          <button
            onClick={() => setMuted(m => !m)}
            className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 inline-flex items-center justify-center rounded-full bg-black/50 text-white h-8 w-8 sm:h-9 sm:w-9 backdrop-blur hover:bg-black/60 transition-colors"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" /> : <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
        )}

        {mediaError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[11px] sm:text-xs px-2 py-1 rounded bg-black/60 text-white">
            {mediaError}
          </div>
        )}
      </div>
    </div>
  );
}
