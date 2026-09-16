import React from "react";
import GalleryBanner from "@/components/contactUs/GalleryBanner";
import MapWithContact from "@/components/contactUs/MapContactSection";
import AppBreadcrumb from "@/components/common/app-breadcrumb";
import { getStoreProfile } from "@/lib/data/settings";
import type { ContactInfo } from "@/components/contactUs/ContactShell";

// Contact details come from the admin "Store profile" settings; the shell
// falls back to its built-in details when those fields are empty.
async function loadContactInfo(): Promise<ContactInfo | undefined> {
  try {
    const profile = await getStoreProfile();
    const emails = profile.email ? profile.email.split(/[,;\s]+/).filter(Boolean) : [];
    const phones = profile.phone ? profile.phone.split(/[,;/]+/).map(s => s.trim()).filter(Boolean) : [];
    const addressLines = profile.address
      ? profile.address.split("\n").map(s => s.trim()).filter(Boolean)
      : [];
    if (!emails.length && !phones.length && !addressLines.length) return undefined;
    return { emails, phones, addressLines };
  } catch {
    return undefined;
  }
}

export default async function ContactPage() {
  const contact = await loadContactInfo();
  return (
    <main className="mx-auto max-w-[1460px] px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="py-2 sm:pt-6">
              <AppBreadcrumb items={[{ label: "HOME", href: "/" }, { label: "CONTACT" }]} />
            </div>
      <h2 className="mb-8 text-center text-[32px] font-[650] text-[#E72429]">
        Contact Us
      </h2>

      {/* Map + Contact overlay */}
      <MapWithContact contact={contact} />

      {/* Gallery */}
      <div className="mt-12 md:mt-16">
        <GalleryBanner />
      </div>
    </main>
  );
}
