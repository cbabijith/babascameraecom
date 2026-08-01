"use client";
import Image from "next/image";

export default function AboutUs() {
  return (
    <section className="relative w-full pb-6 mt-6 lg:mt-12">
      {/* Mobile: aboutus.svg */}
      <div className="lg:hidden w-full">
        <Image
          src="/about/aboutus.svg"
          alt="aboutus"
          width={1920}
          height={1080}
          className="w-full h-auto object-cover"
          priority
        />
      </div>

      {/* Desktop: aboutus2.svg */}
      <div className="hidden lg:block w-full">
        <Image
          src="/about/aboutus2.svg"
          alt="aboutus"
          width={1920}
          height={1080}
          className="w-full h-auto object-cover"
          priority
        />
      </div>
    </section>
  );
}
