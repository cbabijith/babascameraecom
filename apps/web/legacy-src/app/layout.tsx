import type React from "react";
import type { Metadata } from "next";

import GlobalNetworkBanner from "@/components/network/GlobalNetworkBanner";
import { Toaster } from "@/components/ui/sonner";
import ReduxProvider from "@/store/providers";

import "./globals.css";
import SeoSitewide from "./SeoSitewide";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.babascamera.com";
const brand = "Babas Camera";
const title = `${brand} - Camera Equipment Store`;
const description =
  "Buy cameras, lenses, tripods, lighting, audio, and accessories with fast delivery, downloadable order invoices, and expert support across Kerala and India.";
const socialImage = {
  url: "/og-babas-camera-v2.png",
  width: 1729,
  height: 910,
  alt: "Baba's Camera - Cameras, lenses, and creative gear",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s | ${brand}`,
  },
  description,
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
    canonical: siteUrl,
  },
  applicationName: brand,
  creator: brand,
  publisher: brand,
  category: "E-commerce",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: brand,
    title,
    description,
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  generator: "Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
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
