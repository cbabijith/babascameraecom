// ./src/components/network/GlobalNetworkBanner.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store";
import { useRouter } from "next/navigation";
import apiClient, { HEALTH_ENDPOINT } from "@/lib/apiClient";

/* -------------------------------- types ------------------------------- */
interface NetworkInformationLite {
  rtt?: number;
  downlink?: number;
  effectiveType?: string;
}
interface NavigatorWithConn extends Navigator {
  connection?: NetworkInformationLite;
  mozConnection?: NetworkInformationLite;
  webkitConnection?: NetworkInformationLite;
}

/* -------------------------- body scroll lock -------------------------- */
function useBodyScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [lock]);
}

/* ---------------------- safe network info accessor -------------------- */
function getNavigatorConnection(): NetworkInformationLite | undefined {
  if (typeof navigator === "undefined") return undefined;
  const nav = navigator as NavigatorWithConn;
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

/* -------------------------- network quality hook ---------------------- */
function useNetworkQuality() {
  const [quality, setQuality] = useState<{
    rttMs?: number;
    downlinkMbps?: number;
    type?: string;
    slow: boolean;
  }>({ slow: false });

  useEffect(() => {
    let cancelled = false;

    const sample = async () => {
      const conn = getNavigatorConnection();
      const apiRtt = conn?.rtt;
      const apiDown = conn?.downlink;
      const apiType = conn?.effectiveType;

      // Fallback: HEAD fetch to root route if connection API is unavailable
      let headRtt: number | undefined;
      if (typeof apiRtt !== "number") {
        try {
          const start = performance.now();
          await fetch("/", { method: "HEAD", cache: "no-store" });
          headRtt = Math.max(0, performance.now() - start);
        } catch {
          // ignore
        }
      }

      const rtt = apiRtt ?? headRtt;
      const slowByType = apiType ? ["slow-2g", "2g"].includes(apiType) : false;
      const slowByRtt = typeof rtt === "number" ? rtt > 1200 : false;
      const slow = Boolean(slowByType || slowByRtt);

      if (!cancelled) {
        setQuality({
          rttMs: rtt,
          downlinkMbps: apiDown,
          type: apiType,
          slow,
        });
      }
    };

    sample();
    const id = setInterval(sample, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return quality;
}

/* ------------------------------ component ----------------------------- */
export default function GlobalNetworkBanner() {
  const { status, lastError } = useAppSelector((s) => s.apiStatus);
  const router = useRouter();

  // Local state
  const [retrying, setRetrying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pinging, setPinging] = useState(false);

  // Backoff for health pings: 10s → 20s → 40s → max 60s
  const backoffRef = useRef<number>(10000);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog thresholds
  const firstDownAtRef = useRef<number | null>(null);
  // Initial incident: 20s, later: 2 minutes
  const thresholdRef = useRef<number>(20000);

  const [forcedVisible, setForcedVisible] = useState(false); // for offline immediate

  // Offline detection - initialize to false for SSR/hydration consistency
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Network quality (for slow-pill)
  const quality = useNetworkQuality();
  const [slowPillSnoozed, setSlowPillSnoozed] = useState(false);

  // Sync offline state after hydration
  useEffect(() => {
    setIsOffline(!navigator.onLine);
  }, []);

  // Derived flags
  const isServerIssue = status === "down" || status === "degraded";
  const [shouldShow, setShouldShow] = useState(false);

  // Lock body scroll when modal is open
  useBodyScrollLock(shouldShow);

  /* -------------------- online/offline listeners ---------------------- */
  useEffect(() => {
    const onOffline = () => {
      setIsOffline(true);
      setForcedVisible(true); // show modal immediately for offline
    };
    const onOnline = () => {
      setIsOffline(false);
      setForcedVisible(false);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  /* ---------------------- modal ping/backoff loop --------------------- */
  useEffect(() => {
    const clear = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const ping = async () => {
      try {
        setPinging(true);
        await apiClient.get(HEALTH_ENDPOINT, { showToast: false, timeout: 5000 });
        // success → restore
        backoffRef.current = 10000;
        setRetrying(false);
        setPinging(false);
        setForcedVisible(false);
        window.dispatchEvent(new CustomEvent("api:recovered"));
      } catch {
        setPinging(false);
        const next = Math.min(backoffRef.current * 2, 60000);
        backoffRef.current = next;
        setRetrying(true);
        timerRef.current = setTimeout(ping, next);
      }
    };

    if (isServerIssue && !isOffline) {
      ping();
    } else {
      clear();
      setRetrying(false);
      backoffRef.current = 10000;
    }
    return () => clear();
  }, [isServerIssue, isOffline]);

  /* ----------------------- modal visibility logic --------------------- */
  useEffect(() => {
    if (isOffline) {
      // Immediate dialog
      setShouldShow(true);
      return;
    }
    if (isServerIssue) {
      if (!firstDownAtRef.current) {
        firstDownAtRef.current = Date.now();
      }
      const elapsed = Date.now() - firstDownAtRef.current;
      setShouldShow(elapsed >= thresholdRef.current || forcedVisible);
    } else {
      // Reset on recovery
      if (firstDownAtRef.current !== null) {
        // After first incident, extend future threshold to 2 minutes
        thresholdRef.current = 120000;
      }
      firstDownAtRef.current = null;
      setShouldShow(false);
    }
  }, [isServerIssue, isOffline, forcedVisible]);

  /* ------------------ reset slow-pill snooze when quality changes ------ */
  useEffect(() => {
    if (!quality.slow && slowPillSnoozed) {
      setSlowPillSnoozed(false);
    }
  }, [quality.slow, slowPillSnoozed]);

  /* ------------------------- derived messages ------------------------- */
  const message =
    isOffline
      ? "You appear to be offline. Please check your internet connection."
      : status === "down" || status === "degraded"
      ? // Prefer the store-provided message (covers CORS wording set in apiClient)
        (lastError ||
          "We’re having trouble reaching the server. Please try again in a moment.")
      : "";

  /* ------------------------------ actions ----------------------------- */
  const onRetryNow = async () => {
    setRetrying(true);
    try {
      await apiClient.get(HEALTH_ENDPOINT, { showToast: false, timeout: 5000 });
      window.dispatchEvent(new CustomEvent("api:retry-now"));
    } catch {
      // keep modal open; backoff loop continues
    } finally {
      setRetrying(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      router.refresh();
      setRefreshing(false);
    }, 600);
  };

  /* ------------------ non-blocking "slow network" pill ----------------- */
  const showSlowPill =
    !shouldShow && // don't show under the modal
    !isOffline && // not offline
    quality.slow && // slow by RTT or effectiveType
    !slowPillSnoozed; // not snoozed by user

  /* ------------------------------ render ------------------------------ */
  return (
    <>
      {/* Slow network pill (non-blocking, dismissible) */}
      {showSlowPill && (
        <div className="fixed top-3 inset-x-0 z-[950] flex justify-center px-4">
          <div className="max-w-[640px] w-full rounded-full bg-amber-50 text-amber-900 border border-amber-200 shadow-sm px-4 py-2 flex items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" aria-hidden />
            <span className="text-sm">
              Your internet seems slow
              {typeof quality.rttMs === "number" ? ` (RTT ~${Math.round(quality.rttMs)}ms)` : ""}
              {quality.type ? ` · ${quality.type}` : ""}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={onRetryNow}
                className="rounded-md border border-amber-300 bg-white/80 px-2.5 py-1 text-xs hover:bg-white"
                disabled={retrying || pinging}
              >
                {retrying || pinging ? "Checking…" : "Check"}
              </button>
              <button
                onClick={() => setSlowPillSnoozed(true)}
                className="rounded-md px-2.5 py-1 text-xs hover:bg-amber-100"
                aria-label="Dismiss slow network notice"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocking modal dialog for offline / long timeouts / CORS */}
      {shouldShow && (
        <div
          className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-md flex items-center justify-center p-4"
          aria-modal
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="px-5 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-900">
                {isOffline ? "No Internet Connection" : "Having Trouble Reaching the Server"}
              </h2>
            </div>

            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-700">{message}</p>

              {!isOffline && (
                <div className="text-xs text-gray-600 bg-gray-50 border rounded-md p-3">
                  We’re trying to reconnect in the background.
                  {retrying || pinging ? <span className="ml-1">Retrying…</span> : null}
                </div>
              )}

              {!isOffline && (quality.slow || quality.type || quality.rttMs) && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                  {quality.slow ? "Your connection seems slow." : "Network info:"}
                  <span className="ml-1 opacity-80">
                    {quality.type ? `type: ${quality.type}` : null}
                    {quality.type && (quality.rttMs || quality.downlinkMbps) ? " · " : null}
                    {typeof quality.rttMs === "number" ? `rtt: ~${Math.round(quality.rttMs)}ms` : null}
                    {typeof quality.downlinkMbps === "number" ? ` · downlink: ${quality.downlinkMbps} Mbps` : null}
                  </span>
                </div>
              )}
            </div>

            <div className="px-5 pb-5 pt-2 flex items-center justify-end gap-2">
              <button
                onClick={onRetryNow}
                disabled={retrying || pinging}
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-white disabled:opacity-60"
              >
                {(retrying || pinging) && (
                  <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                )}
                Retry now
              </button>
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex items-center rounded-md bg-amber-600 text-white px-3 py-1.5 text-sm hover:bg-amber-700 disabled:opacity-70"
              >
                {refreshing && (
                  <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                )}
                Refresh page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
