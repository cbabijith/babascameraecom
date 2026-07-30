// components/WhoWeAre.tsx
"use client";

import Image from "next/image";

export default function WhoWeAre() {
  return (
    <section className="relative w-full bg-white overflow-hidden">
      {/* Full-bleed background split */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[45%] lg:top-[40%] -translate-y-1/2 z-0 "
      >
        <div className="flex">
          <div className="w-1/2 h-[300px] bg-[#fdde85]" />
          <div className="w-1/2 h-[300px] bg-[#f6d4a2]" />
        </div>
      </div>

      {/* 1460px content width */}
      <div className="relative z-10 mx-auto max-w-[1460px] px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="relative">
          {/* Image (814 × 517 on md+) */}
          <div className="mx-8">
 <div className="relative overflow-hidden shadow-md shrink-0 w-full aspect-[714/453] md:w-[814px] md:h-[517px] rounded-xl">
            <Image
              src="/about/Frame2085662646.png"
              alt="Canon camera on orange background"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 814px, 100vw"
              priority
            />
          </div>

          </div>
         
          {/* Content box — RIGHT & ON TOP of image (md+), responsive width */}
          <div
            className="
              mt-0 lg:mt-6
              md:mt-0 md:absolute md:-top-10 md:right-0 md:z-10
              bg-white shadow-[0_10px_35px_rgba(0,0,0,0.18)]
              flex flex-col items-start gap-[10px] lg:gap-[22px]
              w-full md:w-[min(46vw,760px)]
              p-[16px] lg:p-[50px] rounded-[8px]
            "
          >
            <h2
              className="text-black text-[18px] lg:text-[32px]"
              style={{
                fontStyle: "normal",
                fontWeight: "650",
                lineHeight: "normal",
              }}
            >
              Who We Are
            </h2>

            <div
              className="space-y-4 text-black text-[12px] lg:text-[16px] leading-normal lg:leading-[24px]"
              style={{
                textAlign: "justify",
                fontStyle: "normal",
                fontWeight: "400",
                
              }}
            >
              <p>
                In 2008, we shifted to a five storey complex at Pazhavangadi and celebrated our 50th anniversary.
                The complex became the one-stop showroom where everything related to photography was available.
                The Photo store houses in two floors in the new complex and have wide range of photographic products
                from leading brands like Canon, Nikon, Sony, Panasonic, Fujifilm, Olympus, Sigma, Lowepro, Elinchrom,
                Epson, Sandisk, Digi-Care etc. The store became a one-stop shop in photography for amateur and professional photographers.
              </p>
              <p>
                Now as we enter 2014, our loyal patrons have understood that Baba is a brand synonymous with comprehensive
                photographic equipments and services. We are here to help the city shutterbugs explore the world of photography.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
