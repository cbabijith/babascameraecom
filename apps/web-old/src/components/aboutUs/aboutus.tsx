// components/AboutUs.tsx
"use client";

import Image from "next/image";

export default function AboutUs() {
  return (
    <section className="w-full bg-white overflow-x-hidden">
      <div className="mx-auto max-w-[1460px] px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        {/* Title */}
        <h2
          className="text-center"
          style={{
            color: "#E72429",
            fontSize: "32px",
            fontStyle: "normal",
            fontWeight: 650,
            lineHeight: "normal",
          }}
        >
          About Us
        </h2>

        <div className="mt-8 grid gap-12 lg:gap-10 md:grid-cols-2 md:items-start">
          {/* Left: Content */}
          <div className="order-2 md:order-1">
            <h3
              style={{
                fontStyle: "normal",
                fontWeight: 650,
                lineHeight: "normal",
                color: "#000",
              }}
              className="text-[18px] lg:text-[32px]"
            >
              We thrive for{" "}
              <span
                style={{
                  color: "#E72429",
                  fontStyle: "normal",
                  fontWeight: 650,
                  lineHeight: "normal",
                }}
                className="text-[18px] lg:text-[32px]"
              >
                Value-for-Money
              </span>
            </h3>

            <div
              className="mt-4 space-y-3 text-[12px] lg:text-[16px]"
              style={{
                color: "#000",
                textAlign: "justify",

                fontStyle: "normal",
                fontWeight: 400,
              }}
            >
              <p className="leading-normal lg:leading-[24px]">
                Baba & Baba Photosales was started in 1987 near Baba Studio at
                East Fort, Trivandrum, and were into retailing of all
                photographic related goods. Over the years we grew in stature
                and credibility among the city residents. After years of
                retailing in cameras, lenses, tripods and other equipments
                related to photography, we ensured that we served a wide range
                of people including amateur to professional photographers. Under
                the leadership of Shri. V. N. Jayakrishnan who was popularly
                known as Sai, we offered unique value for money services and
                rose above the growing competition including online shopping
                sites with our unbeatable prices.
              </p>
            </div>
          </div>

          {/* Right: Images */}
          <div className=" relative order-1 md:order-2 w-full">
            {/* Main image */}
            <div className="relative">
              <Image
                src="/about/Frame2085662642.png"
                alt="Camera close-up"
                width={460}
                height={287}
                className="rounded-[6px] lg:rounded-[0px] object-cover w-[330px] lg:w-[460px]"
                priority
              />
            </div>

            {/* Overlay image */}
            <div
              className="absolute top-[50%] right-0 lg:right-[20%] "
            >
              <div>
                <Image
                  src="/about/Frame2085662643.png"
                  alt="Vintage camera on map"
                  width={193}
                  height={193}
                  className="rounded-[6px] lg:rounded-[0px] w-[116px] lg:w-[193px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
