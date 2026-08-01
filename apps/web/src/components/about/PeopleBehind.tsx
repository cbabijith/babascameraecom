"use client";

import Image from "next/image";

export default function PeopleBehind() {
  return (
    <section className="w-full bg-white py-12 sm:py-16">
      <div className="constrained-width px-4 sm:px-6 lg:px-8">
        {/* headings */}
        <div className="mb-10 text-left">
          <h2 className="text-[#E72429] font-mono font-[650] uppercase text-[16px] sm:text-[20px] leading-[100%]">
            The People Behind Babas
          </h2>
          <h3 className="mt-2 sm:mt-3 font-[650] text-[24px] sm:text-[32px] lg:text-[36px] leading-[100%] text-black">
            The Visionaries Behind Babas
          </h3>
        </div>

        {/* first row */}
        <div
          className="
            grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
            gap-[28px] sm:gap-[36px] lg:gap-[44px]
            justify-items-center
          "
        >
          <PersonCard
            name="Late Shri. N. Nanukuttan Nair"
            role="Founder of Babas"
            src="/about/NanukuttanNair.jpg"
          />
          <PersonCard
            name="Late N. Krishnan Nair"
            role="Founder – Minerva Studio, Trivandrum (Founder’s Brother)"
            src="/about/KrishnanNair.jpg"
          />
          <PersonCard
            name="Late Saraswathy Amma"
            role="Founder’s Mother"
            src="/about/SaraswathyAmma.jpg"
          />
        </div>

        {/* second row */}
        <div
          className="
            mt-[40px] flex flex-wrap justify-center gap-[28px] sm:gap-[36px] lg:gap-[44px]
          "
        >
          <PersonCard
            name="Jayakrishnan V N"
            role="Managing Partner"
            src="/about/jayakrishnan.jpg" 
          />
          <PersonCard
            name="Jayasankar V N"
            role="Managing Partner"
            src="/about/jayasankar.jpg"
          />
        </div>
      </div>
    </section>
  );
}

/* ---------------- Person Card ---------------- */

type PersonCardProps = { name: string; role: string; src: string };

function PersonCard({ name, role, src }: PersonCardProps) {
  return (
    <div
      className="
        bg-white border border-gray-200 shadow-md overflow-hidden
        flex flex-col items-center
        w-[85vw] sm:w-[300px] md:w-[340px] lg:w-[360px]
        h-auto md:h-[400px] lg:h-[460px]
        p-5 sm:p-6 md:p-7
        rounded-[18px] sm:rounded-[20px] lg:rounded-[22px]
        transition-transform hover:scale-[1.02]
      "
      style={{ borderWidth: "1.1px" }}
    >
      {/* image section */}
      <div className="w-full aspect-[4/5] bg-gray-100 rounded-[14px] overflow-hidden flex items-center justify-center">
        <Image
          src={src}
          alt={name}
          width={360}
          height={450}
          className="
            w-full h-full object-cover
            object-[center_25%] md:object-[center_30%] lg:object-[center_20%]
          "
          priority={false}
        />
      </div>

      {/* text section */}
      <div className="w-full mt-4 sm:mt-5 text-left">
        <h4 className="text-[#1A1A1A] font-semibold text-[18px] sm:text-[20px] lg:text-[22px] leading-[120%]">
          {name}
        </h4>
        <p className="mt-1 text-[#A1A1A1] font-medium text-[15px] sm:text-[17px] lg:text-[18px] leading-[120%]">
          {role}
        </p>
      </div>
    </div>
  );
}
