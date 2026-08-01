// components/PhotographersGrid.tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function PhotographersGrid() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const cards = [
    {
      title: "Shri. Jayakrishnan V N",
      subtitle: "Founder- Minerva Studio, Trivandrum Founder’s Brother",
      image: "/about/Img1.jpeg",
      mobImage: "/about/Img1.jpeg",
    },
    {
      title: "Shri. Jayasankar V N",
      subtitle: "Founder",
      image: "/about/Img2.jpeg",
      mobImage: "/about/Img2.jpeg",
    },
  ];

  return (
    <section className="w-full bg-white mb-6 lg:mb-12">
      <div className="mx-auto max-w-[1460px] px-4 sm:px-6 lg:px-[65px] py-10">
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
          {cards.map((c, i) => (
            <figure key={i} className="group">
              {/* Keep ratio like Figma: pick one that matches your design, e.g. 3/2 */}
              <div className="relative w-full aspect-[1] overflow-hidden rounded-[6px] shadow-sm transition-transform duration-200 group-hover:-translate-y-1">
                {/* OPTION A — crop to fill (Figma-like thumbnails) */}
                <Image
                  src={isMobile ? c.mobImage ?? c.image : c.image}
                  alt={c.title}
                  fill
                  className="object-cover object-center"
                  // sizes="(min-width:1024px) 680px, (min-width:768px) 50vw, 100vw"
                  priority={i === 0}
                />

                {/*
                OPTION B — show full image without cropping:
                Just swap object-cover -> object-contain

                <Image
                  src={isMobile ? c.mobImage ?? c.image : c.image}
                  alt={c.title}
                  fill
                  className="object-contain"
                  sizes="(min-width:1024px) 680px, (min-width:768px) 50vw, 100vw"
                  priority={i === 0}
                />
                */}
              </div>

              <figcaption className="mt-3">
                <p className="text-[18px] font-[400] tracking-tight text-[#000000]">
                  {c.title}
                </p>
                <p className="text-[14px] font-[400] text-[#00000080]">
                  {c.subtitle}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
