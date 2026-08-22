// components/Footer.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Instagram, Linkedin, Facebook, Twitter } from "lucide-react";
import { getCategories } from "@/instances/categoryInstance";
import { getProductsByCategory } from "@/instances/productInstance";
import type { Category } from "@/types/product";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

interface CachedCats { ts: number; cats: Category[] }

const CACHE_KEY = "footer_cats_v3";
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

function readCacheSafe(): Category[] {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedCats;
    const fresh = Date.now() - parsed.ts < MAX_AGE_MS;
    return fresh && parsed.cats?.length ? parsed.cats : [];
  } catch {
    return [];
  }
}

export default function Footer() {
  // START: make server and first client render identical
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // END

  const cap = (s: string) => (s?.length ? s[0].toUpperCase() + s.slice(1) : s);

  useEffect(() => {
    // 1) Try session cache AFTER mount
    const cached = readCacheSafe();
    if (cached.length) {
      setCats(cached);
      setLoading(false);
      return;
    }

    // 2) Else fetch
    (async () => {
      try {
        setLoading(true);
        const data = await getCategories();
        const active = data
          .filter((c) => c.status === "Active" && c.visibility === "Show")
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        const withProducts = await Promise.all(
          active.map(async (c) => {
            try {
              const res = await getProductsByCategory(c._id, { limit: 1 });
              return res.totalCount > 0 ? c : null;
            } catch {
              return null;
            }
          })
        );

        const finalCats = (withProducts.filter(Boolean) as Category[]).slice(0, 4);
        setCats(finalCats);
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ ts: Date.now(), cats: finalCats })
        );
      } catch {
        toast.error("Failed to load footer categories");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

 const shopLinks = useMemo(
    () => [
      { label: "All Products", href: "/products" },
      ...cats.map((c) => ({
        label: cap(c.name),
        href: `/products/category/${c._id}`,
      })),
    ],
    [cats]
  );

  const importantLinks = [
    { label: "Contact Us", href: "/contact" },
    { label: "Shipping", href: "/shipping" },
    { label: "Cancellation", href: "/cancellation" },
    { label: "Return Policy", href: "/return-policy" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy-policy" },
  ];

  const showSkeleton = loading && cats.length === 0;
  const reservedRows = 6; 

  return (
    <footer className="constrained-width bg-white border-t border-gray-200 py-[10px] px-4 pb-6 lg:px-0 mt-0 lg:mt-16">
      <div className="flex flex-col lg:flex-row justify-between mx-auto py-6">
        <div className="flex flex-col lg:flex-row gap-[32px] lg:gap-[64px]">
          <div className="relative h-[44px] w-[106px]">
            <Image src="/PHOTO_STORE_black.svg" alt="babas" fill className="object-contain" priority />
          </div>

          <div className="flex flex-col lg:flex-row gap-[32px] lg:gap-[56px]">
            {/* About */}
            <div className="lg:col-span-1 md:col-span-2">
              <div className="flex flex-col gap-[16px] w-full lg:w-80">
                <h3 className="font-[650] text-[14px] text-[#000000]">About</h3>
                <p className="text-[#00000080] text-[14px] font-[400] leading-relaxed">
                  Babas is a one-stop shop for everything camera and creative. From pre-grade gear to
                  studio essentials, we&apos;ve got everything photographic, filmmaker and content creator
                  needs. From budget-friendly options to professional-grade equipment, find inspiration
                  for every project at Babas.
                </p>
              </div>
            </div>

            {/* Shop & Important Links */}
            <div className="flex flex-row lg:flex-row gap-[20px] lg:gap-[56px]">
              {/* Shop */}
              <div className="flex flex-col gap-[16px] flex-1 lg:flex-none">
                <h3 className="font-[650] text-[14px] text-[#000000]">Shop</h3>
                {/* Reserve vertical space to avoid layout shift */}
                <ul className="space-y-2 min-h-[140px]">
                  {showSkeleton
                    ? Array.from({ length: reservedRows }).map((_, i) => (
                        <li key={i} className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                      ))
                    : // Render exactly reservedRows rows to keep height stable (pad with transparent placeholders if needed)
                      Array.from({ length: reservedRows }).map((_, i) => {
                        const link = shopLinks[i];
                        return link ? (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className="text-[#000000] text-[14px] font-normal hover:text-red-600 transition-colors duration-200"
                            >
                              {link.label}
                            </Link>
                          </li>
                        ) : (
                          <li key={`pad-${i}`} className="h-4 w-32 opacity-0">
                            &nbsp;
                          </li>
                        );
                      })}
                </ul>
              </div>

             {/* Important Links */}
              <div className="flex flex-col gap-[16px] flex-1 lg:flex-none">
                <h3 className="font-[650] text-[14px] text-[#000000]">Important Links</h3>
                <ul className="space-y-2">
                  {importantLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={`text-[14px] font-normal transition-colors duration-200 ${
                            isActive
                              ? "text-[#E11924] font-[600]" // active link style
                              : "text-[#000000] hover:text-red-600"
                          }`}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>


              {/* Social (mobile) */}
              <div className="flex lg:hidden flex-col gap-[15px] items-center mb-4 sm:mb-0">
  <Link
    href="https://in.linkedin.com/company/babasphoto"
    aria-label="LinkedIn"
    target="_blank"
    rel="noopener noreferrer"
  >
    <Linkedin className="w-5 h-5 text-black" />
  </Link>
  <Link
    href="https://www.facebook.com/babastvm/"
    aria-label="Facebook"
    target="_blank"
    rel="noopener noreferrer"
  >
    <Facebook className="w-5 h-5 text-black" />
  </Link>
  <Link
    href="https://x.com"
    aria-label="Twitter"
    target="_blank"
    rel="noopener noreferrer"
  >
    <Twitter className="w-5 h-5 text-black" />
  </Link>
  <Link
    href="https://www.instagram.com/babas_photostore/?hl=en"
    aria-label="Instagram"
    target="_blank"
    rel="noopener noreferrer"
  >
    <Instagram className="w-5 h-5 text-black" />
  </Link>
</div>
            </div>
          </div>
        </div>

        {/* Social (desktop) */}
       <div className="flex flex-col justify-between items-end lg:items-center mt-8 lg:mt-0">
  <div className="hidden lg:flex gap-[15px] items-center mb-4 sm:mb-0">
    <Link
      href="https://in.linkedin.com/company/babasphoto"
      aria-label="LinkedIn"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Linkedin className="w-5 h-5 text-black" />
    </Link>
    <Link
      href="https://www.facebook.com/babastvm/"
      aria-label="Facebook"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Facebook className="w-5 h-5 text-black" />
    </Link>
    <Link
      href="https://x.com"
      aria-label="Twitter"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Twitter className="w-5 h-5 text-black" />
    </Link>
    <Link
      href="https://www.instagram.com/babas_photostore/?hl=en"
      aria-label="Instagram"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Instagram className="w-5 h-5 text-black" />
    </Link>
  </div>
</div>
      </div>
    </footer>
  );
}
