"use client";

import { useEffect, useRef } from "react";

const LAST_SEEN_KEY = "babas.deployment.lastSeen";

/**
 * Self-heals stale tabs after a deployment. Browsers keep an already-loaded
 * app running in memory; when the site deploys new code, those tabs keep
 * executing the OLD bundle against the NEW server — mismatched chunks,
 * dead buttons, stale screens. This guard polls /api/health (no-store) on
 * window focus and every few minutes; when the deployment id changes from
 * the one this tab was loaded with, it hard-reloads once.
 */
export default function VersionGuard() {
  const reloading = useRef(false);

  useEffect(() => {
    let alive = true;

    const check = async () => {
      if (reloading.current) return;
      try {
        const res = await fetch("/api/health", {
          credentials: "omit",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as
          | { deployment?: string | null }
          | null;
        const deployment = data?.deployment;
        if (!alive || !deployment) return; // local dev — nothing to compare
        const lastSeen = sessionStorage.getItem(LAST_SEEN_KEY);
        if (lastSeen && lastSeen !== deployment) {
          sessionStorage.setItem(LAST_SEEN_KEY, deployment);
          reloading.current = true;
          // Bust the router/prefetch caches with a hard navigation.
          window.location.reload();
          return;
        }
        if (!lastSeen) {
          sessionStorage.setItem(LAST_SEEN_KEY, deployment);
        }
      } catch {
        /* offline — try again on next tick */
      }
    };

    void check();
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(check, 4 * 60 * 1000);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
