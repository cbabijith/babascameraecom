"use client";

import React from "react";
import GalleryBanner from "@/components/contactUs/GalleryBanner";
import MapWithContact from "@/components/contactUs/MapContactSection";
import AppBreadcrumb from "@/components/common/app-breadcrumb";

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-[1460px] px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="py-2 sm:pt-6">
              <AppBreadcrumb items={[{ label: "HOME", href: "/" }, { label: "CONTACT" }]} />
            </div>
      <h2 className="mb-8 text-center text-[32px] font-[650] text-[#E72429]">
        Contact Us
      </h2>

      {/* Map + Contact overlay */}
      <MapWithContact />

      {/* Gallery */}
      <div className="mt-12 md:mt-16">
        <GalleryBanner />
      </div>
    </main>
  );
}
