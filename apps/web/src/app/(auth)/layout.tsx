// app/(auth)/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { initializeAuth } from "@/instances/authInstance";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Send already-authenticated visitors to the home page. Deliberately a
  // synchronous localStorage check with no network probe: the previous
  // async session gate resolved after login submissions completed and
  // hijacked the post-login navigation back to "/".
  useEffect(() => {
    const { token, user } = initializeAuth();
    if (token && user) router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <div className="min-h-screen flex items-center justify-center ">
        {children}
      </div>
    </div>
  );
}
