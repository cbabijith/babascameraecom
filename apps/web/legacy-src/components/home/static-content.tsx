import Image from "next/image";

export default function StaticContent() {
  return (
    <section className="pt-6 pb-8 bg-white">
      <div className="constrained-width">
        <div className="overflow-hidden rounded-[16px] sm:rounded-[24px] lg:rounded-[36px] bg-[var(--background)]">
          {/* ---------- Desktop / Tablet ---------- */}
          <div className="hidden md:grid grid-cols-5 min-h-[360px] lg:min-h-[440px] relative">
            {/* Left 40% (2/5) — text */}
            <div className="col-span-2 relative bg-[#F8F8F8] flex items-center">
              <div className="relative z-10 w-full p-6 sm:p-8 lg:p-10 text-[var(--foreground)]">
                {/* Slightly bigger logo */}
                <div className="mb-5 lg:mb-6">
                  <Image
                    src="/PHOTO_STORE_black.svg"
                    alt="Babas"
                    width={120}
                    height={36}
                    className="w-[95px] sm:w-[115px] md:w-[130px] h-auto"
                  />
                </div>

                <p className="text-sm md:text-sm leading-relaxed mb-4">
                  At Babas, our mission is simple — to bring the best quality gear into the hands of passionate
                  photographers and creatives who live to capture life&apos;s most precious moments.
                </p>
                <p className="text-xs md:text-sm leading-relaxed mb-4">
                  We believe great tools inspire great work, which is why we choose only curating top-tier equipment that
                  empowers storytellers at every level.
                </p>
                <p className="text-xs md:text-sm leading-relaxed">
                  Whether you&apos;re behind the lens for the first time or crafting your next masterpiece, Babas is here to
                  make sure your gear keeps up with your vision — reliable, professional, and always ready to shoot.
                </p>
              </div>

              {/* Gradient */}
              <div
                className="
                  pointer-events-none absolute inset-y-0 right-0 w-28
                  bg-gradient-to-r from-[#F8F8F8] via-[#F8F8F8]/70 to-transparent
                  z-0
                "
              />
            </div>

            {/* Right 60% (3/5) — video */}
            <div className="relative col-span-3">
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover"
                aria-hidden="true"
              >
                <source src="/Sequence 02.mp4" type="video/mp4" />
              </video>

              <div
                className="
                  pointer-events-none absolute inset-y-0 left-0 w-40
                  bg-gradient-to-r from-[#F8F8F8] via-[#F8F8F8]/60 to-transparent
                  z-10
                "
              />
            </div>
          </div>

          {/* ---------- Mobile ---------- */}
          <div className="relative md:hidden">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
              aria-hidden="true"
            >
              <source src="/Sequence 02.mp4" type="video/mp4" />
            </video>

            <div
              className="
                relative z-[1]
                px-5 py-10
                text-white
                bg-gradient-to-b from-black/50 via-black/35 to-black/55
              "
            >
              {/* Slightly bigger logo for mobile */}
              <div className="mb-5 flex justify-center">
                <Image
                  src="/PHOTO_STORE_black.svg"
                  alt="Babas"
                  width={100}
                  height={30}
                  className="w-[85px] sm:w-[95px] h-auto"
                />
              </div>

              <div className="max-w-none text-center">
                <p className="text-sm leading-relaxed mb-4">
                  At Babas, our mission is simple — to bring the best quality gear into the hands of passionate
                  photographers and creatives who live to capture life&apos;s most precious moments.
                </p>
                <p className="text-xs leading-relaxed mb-4">
                  We believe great tools inspire great work, which is why we choose only curating top-tier equipment that
                  empowers storytellers at every level.
                </p>
                <p className="text-xs leading-relaxed">
                  Whether you&apos;re behind the lens for the first time or crafting your next masterpiece, Babas is here to
                  make sure your gear keeps up with your vision — reliable, professional, and always ready to shoot.
                </p>
              </div>
            </div>

            <div
              className="
                pointer-events-none absolute inset-x-0 bottom-0 h-16
                bg-gradient-to-b from-transparent to-black/40
              "
            />
          </div>
        </div>
      </div>
    </section>
  );
}
