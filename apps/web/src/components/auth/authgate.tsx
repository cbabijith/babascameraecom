"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { checkAuthSession } from "@/instances/authInstance";

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
    let isMounted = true;

    async function evaluateGate() {
      const hasSession = await checkAuthSession();
      if (!isMounted) return;

      if (requireAuth && !hasSession) {
        router.replace(`${redirectUnauthed}?next=${encodeURIComponent(pathname || '/')}`);
        return;
      }

      if (blockWhenAuthed && hasSession) {
        router.replace(redirectAuthed);
        return;
      }

      setChecked(true);
    }

    evaluateGate();

    return () => {
      isMounted = false;
    };
  }, [requireAuth, blockWhenAuthed, redirectUnauthed, redirectAuthed, router, pathname]);

  // Avoid flicker while deciding. You can render a spinner instead if you like.
  if (!checked && (requireAuth || blockWhenAuthed)) return null;

  return <>{children}</>;
}
