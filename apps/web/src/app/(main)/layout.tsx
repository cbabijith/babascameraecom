"use client";
import type { ReactNode } from "react";
import BottomNav from "@/components/common/BottomNav";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Mount first so it never feels late */}
      {children}
      <BottomNav />
    </>
  );
}
