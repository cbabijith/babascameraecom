// app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ReduxProvider from "@/store/providers";
import GlobalNetworkBanner from "@/components/network/GlobalNetworkBanner";
import SeoSitewide from "./SeoSitewide";
import { getSeoDefaults } from "@/lib/data/settings";

const siteUrl = "https://www.babascamera.com";
const brand = "Babas Camera";

// Fallback copy for when the settings table cannot be reached.
const FALLBACK_DESCRIPTION =
  "Buy cameras, lenses, tripods, lighting, audio & accessories at the best prices. Fast delivery, GST invoice, and expert support across Kerala & India.";

// SEO defaults are managed from the admin Settings page ("Default search
// metadata"); the values below only apply when nothing is stored yet.
export async function generateMetadata(): Promise<Metadata> {
  let title = `${brand} – Camera Equipment Store`;
  let description = FALLBACK_DESCRIPTION;
  let siteName = brand;
  try {
    const seo = await getSeoDefaults();
    title = seo.title || title;
    description = seo.description || FALLBACK_DESCRIPTION;
    siteName = seo.siteName || brand;
  } catch {
    // Keep static fallbacks rather than breaking rendering on DB errors.
  }

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
  // ✅ Core keyword seed (page-specific keywords will be added by each page via generateMetadata)
  keywords: [
    "camera store",
    "buy cameras online",
    "DSLR",
    "mirrorless",
    "camera lenses",
    "tripods",
    "lighting",
    "microphones",
    "camera accessories",
    "Kerala",
    "India",
  ],
  alternates: {
    canonical: siteUrl, // per-page canonicals will override this via generateMetadata
  },
  applicationName: siteName,
  creator: siteName,
  publisher: siteName,
  category: "E-commerce",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title,
    description,
    images: [{ url: "/og.png" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@babascamera", // if you have it; else remove
    creator: "@babascamera",
    title,
    description,
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Uncomment after adding your verification tokens in env or hard-code the string
  // verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
  generator: "Next.js",
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {/* Sitewide structured data (Org + SearchBox) */}
        <SeoSitewide />

        <ReduxProvider>
          <GlobalNetworkBanner />
          {children}
          <Toaster
            position="bottom-right"
            closeButton
            expand
            duration={1000}
            toastOptions={{
              style: {
                background: "white",
                borderRadius: 10,
                fontWeight: 600,
              },
              classNames: {
                toast: "custom-toast toast-base",
                title: "toast-title",
                description: "toast-desc",
                closeButton: "custom-close-btn",
                success: "toast-success toast-border-success",
                error: "toast-error toast-border-error",
                info: "toast-info",
                warning: "toast-warning",
              },
            }}
          />
        </ReduxProvider>
      </body>
    </html>
  );
}
