"use client";
import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// ---- Orbit controls ----
const ORBIT_ICON_SIZE = 70; // each orbit image = 70x70
const ORBIT_CANVAS = 700;   // outer container size
const RING_OUTER = 700;
const RING_MIDDLE = 540;
const RING_INNER = 400;

// Absolutely-positioned orbit image, no borders or background
function OrbitImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={ORBIT_ICON_SIZE}
      height={ORBIT_ICON_SIZE}
      className={cn("absolute object-contain", className)}
      priority
    />
  );
}

interface OrbitalDecorationProps {
  className?: string;
}

export function OrbitalDecoration({ className }: OrbitalDecorationProps) {
  return (
    <div className={cn("relative hidden items-center justify-center md:flex pr-6", className)}>
      {/* Orbit canvas */}
      <div className="relative" style={{ width: ORBIT_CANVAS, height: ORBIT_CANVAS }}>
        {/* Center circle with logo */}
        <div className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2">
          <div className="grid size-44 place-items-center rounded-full bg-white shadow-lg ring-1 ring-black/5">
            <Image
              src="/babas-center.png"
              alt="babas"
              width={160}
              height={160}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Rings */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="rounded-full ring-1 ring-black/10" style={{ width: RING_OUTER, height: RING_OUTER }} />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="rounded-full ring-1 ring-black/10" style={{ width: RING_MIDDLE, height: RING_MIDDLE }} />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="rounded-full ring-1 ring-black/10" style={{ width: RING_INNER, height: RING_INNER }} />
        </div>

        {/* ===== OUTER RING (first border) ===== */}
        <OrbitImg src="/speaker.png" alt="Speaker" className="left-1/2 top-[6%] -translate-x-1/2" />
        <OrbitImg src="/camera1.png" alt="Camera" className="left-[2%] top-1/2 -translate-y-1/2" />
        <OrbitImg src="/sdcard.png" alt="SD Card" className="right-[2%] top-1/2 -translate-y-1/2" />

        {/* ===== MIDDLE RING (second border) ===== */}
        <OrbitImg src="/light.png" alt="Light" className="left-1/2 top-[11.5%] -translate-x-1/2" />
        <OrbitImg src="/gopro.png" alt="GoPro" className="right-[11.5%] top-[28%]" />
        <OrbitImg src="/camera2.png" alt="Camera 2" className="right-[11.5%] bottom-[14%]" />

        {/* ===== INNER RING (third border) ===== */}
        <OrbitImg src="/videolight.png" alt="Video Light" className="left-[21.5%] bottom-[18%]" />
        <OrbitImg src="/compact.png" alt="Compact" className="left-[28%] top-[22%]" />
      </div>
    </div>
  );
}
