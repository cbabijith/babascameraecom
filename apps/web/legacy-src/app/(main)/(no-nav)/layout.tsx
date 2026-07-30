// src/app/(main)/(no-nav)/layout.tsx
"use client";
import type { ReactNode } from "react";
import Footer from "@/components/common/Footer";
import ReduxProvider from "@/store/providers";
// import BottomNav from "@/components/common/BottomNav";
import Navbar from "@/components/common/navbar";

export default function NoNavLayout({ children }: { children: ReactNode }) {
  return (
    <ReduxProvider>
      <Navbar />
      <main className="pb-16 md:pb-0">{children}</main>
      {/* Keep footer on mobile but lift it above BottomNav */}
      <div className="mb-16 md:mb-0">
        <Footer />
      </div>
      {/* <BottomNav /> */}
    </ReduxProvider>
  );
}
