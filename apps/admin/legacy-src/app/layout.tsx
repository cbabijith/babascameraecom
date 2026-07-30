import type { Metadata } from "next";
import { Toaster } from "@babascamera/ui";

import "@babascamera/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Babas Commerce Admin",
    template: "%s · Babas Admin",
  },
  description: "Secure commerce operations for Babas Photo Store.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
