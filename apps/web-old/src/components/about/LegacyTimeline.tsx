"use client";

import Image from "next/image";

export default function LegacyTimeline() {
  return (
    <section className="w-full bg-white">
      {/* ===== Tablet & Desktop intro (unchanged) ===== */}
      <div className="hidden md:block mx-auto w-full constrained-width px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          {/* LEFT: headings */}
          <div className="text-left">
            <h2 className="text-[#E72429] font-mono font-[650] uppercase text-[20px] leading-[100%]">
              Our Legacy, Framed in Time
            </h2>
            <h3 className="mt-4 font-[650] text-[32px] leading-[34px] text-black">
              From a Humble Studio in 1956 to India’s Trusted Name in Photography
            </h3>
          </div>

          {/* RIGHT: paragraph */}
          <div>
            <p className="text-[16px] leading-[24px] font-normal text-[#1A1A1A] text-justify">
              Founded in 1956 by Late Shri. N. Nanukuttan Nair, Babas began as a
              small studio in East Fort, Trivandrum — a place where memories were
              developed, and moments came to life. Over the decades, Babas has
              evolved from a single photo studio into South India’s most trusted
              photography retailer, blending tradition, innovation, and trust.
            </p>
          </div>
        </div>
      </div>

      {/* ===== Mobile intro (typography per spec) ===== */}
      <div className="md:hidden mx-auto w-full constrained-width px-3 py-8 text-left">
        <h2
          className="text-[#E72429] uppercase leading-[100%] text-[12px] font-[650]"
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco" }}
        >
          Our Legacy, Framed in Time
        </h2>

        <h3
          className="mt-3 leading-[24px] text-[20px] font-[650] text-black"
          style={{ fontFamily: "'Roobert TRIAL', ui-sans-serif, system-ui" }}
        >
          From a Humble Studio in 1956 to India’s Trusted Name in Photography
        </h3>

        <p className="mt-3 text-[14px] leading-[24px] text-[#1A1A1A] text-justify font-normal">
          Founded in 1956 by Late Shri. N. Nanukuttan Nair, Babas began as a small studio
          in East Fort, Trivandrum — a place where memories were developed, and moments
          came to life. Over the decades, Babas has evolved from a single photo studio
          into South India’s most trusted photography retailer, blending tradition,
          innovation, and trust.
        </p>
      </div>

      {/* ===== Full-bleed timeline image — show on tablet & desktop ===== */}
      <div className="hidden md:block relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
        <Image
          src="/about/timeline.svg"
          alt="Babas timeline — milestones through the years"
          width={2880}
          height={1200}
          priority
          className="w-full h-auto"
        />
      </div>

      {/* ===== Mobile textual timeline (design-spec fonts) ===== */}
      <div className="block md:hidden px-6 pb-10 space-y-8">
        <TimelineItem
          year="1956"
          title="The Beginning"
          text="Late Shri. N. Nanukuttan Nair founded Baba Studio at East Fort, Trivandrum — marking the start of Kerala’s photography revolution."
        />
        <TimelineItem
          year="1982"
          title="Expanding the Vision"
          text="Under Shri. Jayakrishnan V N and Shri. Jayasankar V N, Babas expanded into retail and service innovation, serving amateur and professional photographers alike."
        />
        <TimelineItem
          year="1990s"
          title="The Age of Innovation"
          text="Babas introduced world-class Noritsu lab systems — bringing photo processing technology never before seen in Kerala."
        />
        <TimelineItem
          year="2008"
          title="A New Era of Growth"
          text="Babas inaugurated its five-storey complex at Pazhavangadi, becoming Kerala’s one-stop photography destination."
        />
        <TimelineItem
          year="2013"
          title="Recognition & Excellence"
          text="Babas received the Business Excellence Award from the Chamber of Commerce for leadership and innovation in photography retail."
        />
        <TimelineItem
          year="Today"
          title="The Digital Future"
          text="With babascamera.com, Babas enters the next chapter — empowering photographers across India with a digital-first experience."
        />

        {/* ✅ New paragraph after "Today" timeline */}
        <div className="pt-6">
          <p className="text-[#1A1A1A] text-[14px] leading-[24px] font-normal text-justify">
            Baba Studio was lucky to have been born at a time when new technologies were
            just beginning to change the shape of the world of photography. We are glad to
            have been riding this wave of technological innovations ever since and
            bringing its benefits consistently to our valued customers.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------ Mobile timeline item ------------------ */
function TimelineItem({
  year,
  title,
  text,
}: {
  year: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      {/* Year */}
      <div
        className="text-[#E72429] text-[20px] font-semibold uppercase leading-[100%] mb-2"
        style={{ fontFamily: "'Noto Serif', ui-serif" }}
      >
        {year}
      </div>

      {/* Heading */}
      <div
        className="text-[#E72429] text-[24px] leading-[100%] mb-2"
        style={{ fontFamily: "Prata, ui-serif", fontWeight: 400 }}
      >
        {title}
      </div>

      {/* Body */}
      <div
        className="text-[#1A1A1A] text-[14px] leading-[24px] font-medium text-justify"
        style={{ fontFamily: "inherit" }}
      >
        {text}
      </div>

      {/* Divider */}
      <div className="border-b border-[#E72429] mt-4 w-full max-w-[320px]" />
    </div>
  );
}
