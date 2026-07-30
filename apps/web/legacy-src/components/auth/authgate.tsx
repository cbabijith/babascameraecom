"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { initializeAuth } from "@/instances/authInstance";

/**
 * - requireAuth: protect private areas (redirect to /login if no token)
 * - blockWhenAuthed: protect auth pages (redirect to / if token exists)
 */
export function AuthGate({
  requireAuth = false,
  blockWhenAuthed = false,
  redirectUnauthed = "/login",
  redirectAuthed = "/",
  children,
}: {
  requireAuth?: boolean;
  blockWhenAuthed?: boolean;
  redirectUnauthed?: string;
  redirectAuthed?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    void initializeAuth().then(({ user }) => {
      if (!active) return;
      if (requireAuth && !user) {
        router.replace(`${redirectUnauthed}?next=${encodeURIComponent(pathname || '/')}`);
        return;
      }
      if (blockWhenAuthed && user) {
        router.replace(redirectAuthed);
        return;
      }
      setChecked(true);
    });
    return () => {
      active = false;
    };
  }, [requireAuth, blockWhenAuthed, redirectUnauthed, redirectAuthed, router, pathname]);

  // Avoid flicker while deciding. You can render a spinner instead if you like.
  if (!checked && (requireAuth || blockWhenAuthed)) return null;

  return <>{children}</>;
}
