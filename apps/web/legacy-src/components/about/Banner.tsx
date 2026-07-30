"use client";

import Image from "next/image";

export default function Banner() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Responsive wrapper */}
      <div
        className="
          relative mx-auto w-full
          constrained-width
          px-2 sm:px-4 md:px-6 lg:px-8
          py-4 sm:py-8 md:py-10 lg:py-14
        "
      >
        {/* Responsive banner image */}
        <div className="relative w-full">
          <Image
            src="/about/banner.svg"
            alt="Babas — About banner"
            width={1600}
            height={420}
            priority
            className="
              w-full h-auto
              max-w-none
              object-contain
              sm:object-cover
              md:rounded-xl
            "
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
          />
        </div>
      </div>
    </section>
  );
}
