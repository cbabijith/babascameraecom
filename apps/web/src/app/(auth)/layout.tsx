// app/(auth)/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { initializeAuth, removeAuthToken } from "@/instances/authInstance";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Send already-authenticated visitors to the home page. The quick
  // localStorage check is confirmed against the live session before
  // redirecting: after a session expires, stale localStorage must NOT
  // bounce a returning customer off the login page. NOTE: get-session
  // answers 200 with a null body when signed out, so the body must be
  // inspected — res.ok alone is not proof of a session. This runs once on
  // mount, so it cannot hijack the post-login navigation.
  useEffect(() => {
    const { token, user } = initializeAuth();
    if (!token || !user) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/get-session", {
          credentials: "include",
        });
        if (!alive) return;
        const data = await res.json().catch(() => null);
        const signedIn = Boolean(
          data && (data.user || (data.session && data.session.user)),
        );
        if (signedIn) {
          router.replace("/");
        } else {
          // Stale credentials — clear them so the customer can sign in.
          removeAuthToken();
        }
      } catch {
        /* network hiccup: stay on the auth page */
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <div className="min-h-screen flex items-center justify-center ">
        {children}
      </div>
    </div>
  );
}
