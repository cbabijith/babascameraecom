"use client";

import Image from "next/image";
import { useState } from "react";
import { productImageUrl } from "@/lib/storage";

export function ProductGallery({
  name,
  images,
}: {
  name: string;
  images: {
    id: string;
    url: string;
    altText: string | null;
  }[];
}) {
  const fallback = { id: "fallback", url: "", altText: name };
  const [selectedId, setSelectedId] = useState(
    images[0]?.id ?? fallback.id,
  );
  const [zoomed, setZoomed] = useState(false);
  const selected =
    images.find((image) => image.id === selectedId) ??
    images[0] ??
    fallback;

  return (
    <div>
      <button
        type="button"
        onClick={() => setZoomed((value) => !value)}
        aria-label={zoomed ? "Zoom product image out" : "Zoom product image in"}
        className="group relative block aspect-square w-full overflow-hidden rounded-3xl bg-slate-50"
      >
        <Image
          src={productImageUrl(selected.url)}
          alt={selected.altText ?? name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className={`object-contain p-8 transition duration-300 ${
            zoomed
              ? "scale-150 cursor-zoom-out"
              : "cursor-zoom-in group-hover:scale-110"
          }`}
        />
      </button>
      {images.length > 1 ? (
        <div className="mt-4 grid grid-cols-5 gap-3">
          {images.slice(0, 5).map((image) => (
            <button
              type="button"
              key={image.id}
              onClick={() => {
                setSelectedId(image.id);
                setZoomed(false);
              }}
              aria-label={`View ${image.altText ?? name}`}
              className={`relative aspect-square overflow-hidden rounded-xl border ${
                selected.id === image.id
                  ? "border-[#E94560] ring-2 ring-rose-100"
                  : "border-slate-200"
              }`}
            >
              <Image
                src={productImageUrl(image.url)}
                alt={image.altText ?? name}
                fill
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
