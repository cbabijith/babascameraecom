"use client";

import Image from "next/image";

export default function GalleryBanner() {
  return (
    <div className="relative mx-auto w-full max-w-[1460px] overflow-hidden rounded-2xl">
      <Image
        src="/contact/Frame2085662649.png"
        alt="Camera showcase"
        width={1460}
        height={520}
        className="h-[260px] w-full rounded-2xl object-cover sm:h-[320px] md:h-[360px]"
        priority
      />
    </div>
  );
}
