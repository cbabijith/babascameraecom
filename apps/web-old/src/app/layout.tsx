// app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import "./globals.css"; 
import { Toaster } from "@/components/ui/sonner";
import ReduxProvider from "@/store/providers";
import GlobalNetworkBanner from "@/components/network/GlobalNetworkBanner";
import SeoSitewide from "./SeoSitewide";

const siteUrl = "https://www.babascamera.com";
const brand = "Babas Camera";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${brand} – Camera Equipment Store`,
    template: `%s | ${brand}`,
  },
  description:
    "Buy cameras, lenses, tripods, lighting, audio & accessories at the best prices. Fast delivery, GST invoice, and expert support across Kerala & India.",
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
  applicationName: brand,
  creator: brand,
  publisher: brand,
  category: "E-commerce",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: brand,
    title: `${brand} – Camera Equipment Store`,
    description:
      "Cameras, lenses & accessories at great prices. Fast delivery & warranty.",
    images: [{ url: "/og/default-og.jpg" }], // create this image for nicer shares
  },
  twitter: {
    card: "summary_large_image",
    site: "@babascamera", // if you have it; else remove
    creator: "@babascamera",
    title: `${brand} – Camera Equipment Store`,
    description:
      "Cameras, lenses & accessories at great prices. Fast delivery & warranty.",
    images: ["/og/default-og.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Uncomment after adding your verification tokens in env or hard-code the string
  // verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
  generator: "Next.js",
};

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
