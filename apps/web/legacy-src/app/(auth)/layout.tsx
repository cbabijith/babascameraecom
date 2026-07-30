// app/(auth)/layout.tsx
"use client";

import { AuthGate } from "@/components/auth/authgate";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate blockWhenAuthed redirectAuthed="/">
      <div className="min-h-screen bg-background font-sans antialiased">
        <div className="min-h-screen flex items-center justify-center ">
          {children}
        </div>
      </div>
    </AuthGate>
  );
}
