// src/app/(main)/(with-nav)/layout.tsx
"use client";
import type { ReactNode } from "react";
import Navbar from "@/components/common/navbar";
import Header from "@/components/common/header";
import Footer from "@/components/common/Footer";
import ReduxProvider from "@/store/providers";
// import BottomNav from "@/components/common/BottomNav";

export default function WithNavLayout({ children }: { children: ReactNode }) {
  return (
    <ReduxProvider>
      <Navbar />
      <Header />
      <main className="pb-16 md:pb-0 w-full max-w-full overflow-x-clip">{children}</main>
      <div className="mb-16 md:mb-0 w-full max-w-full overflow-x-clip">
        <Footer />
      </div>
      {/* <BottomNav /> */}
    </ReduxProvider>
  );
}
