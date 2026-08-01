"use client";

import { useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Award = {
  img: string;
  title: string;
  desc: string;
};

const awards: Award[] = [
  {
    img: "/about/awards/award-1.png",
    title: "Business Excellence Award 2013",
    desc:
      "Shri. Jayasankar V N, Managing Partner, honored by Shri. Nikhil Kumar, Hon. Governor of Kerala, for outstanding contribution to the photography industry.",
  },
  {
    img: "/about/awards/award-2.png",
    title: "Oldest Account Holder — South Indian Bank",
    desc:
      "Shri. Jayasankar V N, Managing Partner, honored by Shri. Amitabha Guha, Non-Executive Chairman of The South Indian Bank, for being the oldest account holder of the Chalai Branch, Trivandrum.",
  },
  {
    img: "/about/awards/award-3.png",
    title: "57 Years in the Field of Photography",
    desc:
      "Shri. G. Karthikeyan, Hon. Speaker, Kerala Legislative Assembly, presented an award to Shri. Jayasankar V N, Managing Partner, recognizing 57 years of contribution to the field of photography.",
  },
];

export default function Awards() {
  const trackRef = useRef<HTMLDivElement>(null);

  const CARD_W_DESKTOP = 517;
  const GAP_DESKTOP = 44;

  const scrollByCards = (dir: 1 | -1) => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({
      left: (CARD_W_DESKTOP + GAP_DESKTOP) * dir,
      behavior: "smooth",
    });
  };

  return (
    <section className="w-full bg-white py-10 sm:py-14 md:py-16">
      <div className="constrained-width px-4 sm:px-6 lg:px-8">
        {/* Titles — mobile centered per spec, left on md+ */}
      <div className="mb-6 sm:mb-8 text-left">
        <h2
            className="
            text-[#E72429] uppercase leading-[100%]
            font-mono font-[650]
            text-[16px] sm:text-[20px]   /* ⬅ matches PeopleBehind h2 on mobile */
            "
        >
            Awards & Recognitions
        </h2>

        <h3
            className="
            mt-2 leading-[100%] font-[650]
            text-[24px] md:text-[32px] lg:text-[36px]  /* ⬅ matches PeopleBehind h3 on mobile */
            text-black
            "
        >
            Honoured for Excellence in Photography
        </h3>
        </div>
        <div className="relative">
          {/* Arrows — desktop only */}
          <button
            onClick={() => scrollByCards(-1)}
            className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white shadow-sm hover:bg-gray-50"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scrollByCards(1)}
            className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white shadow-sm hover:bg-gray-50"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Track — scrollbar hidden globally via .no-scrollbar */}
          <div
            ref={trackRef}
            className="flex overflow-x-auto md:scroll-smooth no-scrollbar gap-4 sm:gap-6 md:gap-[44px] pb-1 sm:pb-2"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {awards.map((a, i) => (
              <AwardCard key={i} award={a} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------- Card -------------------- */

function AwardCard({ award }: { award: Award }) {
  return (
    <article
      className="
        bg-white border border-gray-200 rounded-[20px] overflow-hidden flex-shrink-0
        w-[64vw] h-[430px]            /* 📱 smaller mobile (≈1.4 cards visible) */
        xs:w-[62vw] xs:h-[440px]
        sm:w-[420px] sm:h-[500px]     /* small tablets */
        md:w-[517px] md:h-[563px]     /* 💻 desktop exact spec */
      "
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Image */}
      <div className="relative w-full h-[210px] xs:h-[230px] sm:h-[270px] md:h-[320px]">
        <Image
          src={award.img}
          alt={award.title}
          fill
          sizes="(min-width:1024px) 517px, (min-width:640px) 420px, 64vw"
          className="object-cover"
          priority={false}
        />
      </div>

      {/* Text */}
      <div
        className="
          px-4 sm:px-5 md:px-6
          pt-3 md:pt-4
          pb-3 sm:pb-4 md:pb-6
          text-justify
        "
        style={{ fontFamily: "'Roobert TRIAL', ui-sans-serif, system-ui" }}
      >
        <h4
          className="
            text-[#E72429]
            text-[16px] sm:text-[20px] md:text-[24px]
            font-semibold tracking-[-0.01em]
            leading-[120%] mb-1.5 sm:mb-2 md:mb-3
          "
        >
          {award.title}
        </h4>

        {/* Mobile card body per spec: Roobert TRIAL, 12px regular */}
        <p
          className="
            text-[12px] sm:text-[13px] md:text-[16px]
            leading-[18px] sm:leading-[22px] md:leading-[28px]
            text-[#1A1A1A]
          "
        >
          {award.desc}
        </p>
      </div>
    </article>
  );
}
