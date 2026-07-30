import "@babascamera/ui/styles.css";
import "./globals.css";

import { Toaster } from "@babascamera/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Baba's Camera Admin",
    template: "%s | Baba's Camera Admin",
  },
  description: "Secure commerce operations for Baba's Camera.",
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
