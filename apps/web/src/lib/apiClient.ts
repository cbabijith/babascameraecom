// src/lib/apiClient.ts
import axios, { AxiosResponse, AxiosError, AxiosRequestConfig } from "axios";
import { toast } from "sonner";
import type { Store } from "@reduxjs/toolkit";
import type { RootState } from "@/store";

let _store: Store<RootState> | null = null;
async function getStore(): Promise<Store<RootState>> {
  if (_store) return _store;
  const mod = (await import("@/store")) as { store: Store<RootState> };
  _store = mod.store;
  return _store;
}

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
    showToast?: boolean;
    _retryCount?: number;
    _retriedWithoutAuth?: boolean;
  }
}

// Network Information API types
interface NetworkInformation {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

/* -------------------- Base configuration -------------------- */
// The legacy UI is intentionally retained, but its former external API is not.
// Keep every request same-origin and let the compatibility route translate it to
// the current storefront/admin data model.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "/api/storefront/legacy";
export const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_BASE_URL || "";
export const THUMBNAIL_BASE_URL = process.env.NEXT_PUBLIC_THUMBNAIL_BASE_URL || "";

/** Allow overriding the health endpoint from env; default to your real API path */
export const HEALTH_ENDPOINT =
  process.env.NEXT_PUBLIC_HEALTH_ENDPOINT || "/api/v1/health";

// Extended timeout based on network quality - give slow networks more time
const getAdaptiveTimeout = (): number => {
  if (typeof navigator === "undefined") return 60000;
  const conn = (navigator as NavigatorWithConnection).connection || (navigator as NavigatorWithConnection).mozConnection || (navigator as NavigatorWithConnection).webkitConnection;
  if (!conn) return 60000; // Default 60s for unknown networks (conservative)
  
  // 2G networks: 90s timeout - give it maximum time
  if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") {
    return 90000;
  }
  // 3G networks: 60s timeout
  if (conn.effectiveType === "3g") {
    return 60000;
  }
  // 4G and faster: 45s timeout (still generous)
  return 45000;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: getAdaptiveTimeout(), // Adaptive timeout based on network
  headers: { "Content-Type": "application/json" },
});

/* -------------------- Shared types -------------------- */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  currentPage?: number;
  results?: T;
  result?: T;
  data?: T;
  latestCount?: number;
  totalCount?: number;
  totalPages?: number;
}

export interface ErrorResponse {
  message: string;
  statusCode: number;
  code?: number | string;
}

/* -------------------- Utilities -------------------- */
export const getImageUrl = (imageKey?: string | null): string => {
  if (!imageKey) return "";
  if (/^https?:\/\//i.test(imageKey) || imageKey.startsWith("/")) return imageKey;
  const key = imageKey.startsWith("/") ? imageKey.slice(1) : imageKey;
  return `${CDN_BASE_URL}${key}`;
};

export const getThumbnailUrl = (imageKey?: string | null): string => {
  if (!imageKey) return getProductFallbackImage();
  if (/^https?:\/\//i.test(imageKey) || imageKey.startsWith("/")) return imageKey;
  const cleanKey = imageKey.startsWith("/") ? imageKey.slice(1) : imageKey;
  const cleanBaseUrl = THUMBNAIL_BASE_URL.endsWith("/")
    ? THUMBNAIL_BASE_URL.slice(0, -1)
    : THUMBNAIL_BASE_URL;
  return `${cleanBaseUrl}/${cleanKey}`;
};

export const getProductFallbackImage = (): string => "/placeholder.svg";

export const getErrorMessage = (e: unknown, fallback = "Something went wrong"): string =>
  e instanceof Error ? e.message : fallback;

type AxiosErrorWithCode<T = unknown> = AxiosError<T> & { code?: string };
const isTimeoutOrNoResponse = (err: AxiosError<ErrorResponse>): boolean => {
  const { code } = err as AxiosErrorWithCode<ErrorResponse>;
  return code === "ECONNABORTED" || !err.response;
};

/** Heuristic: CORS in browsers is usually "Network Error" with request present, no response, while online */
const isLikelyCORS = (err: AxiosError<ErrorResponse>): boolean => {
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  return (
    online &&
    !err.response &&
    !!err.request &&
    typeof err.message === "string" &&
    err.message.toLowerCase().includes("network error")
  );
};

// Simple toast throttle
let lastToastAt = 0;
const TOAST_COOLDOWN_MS = 6000;
const canToast = () => {
  const now = Date.now();
  if (now - lastToastAt > TOAST_COOLDOWN_MS) {
    lastToastAt = now;
    return true;
  }
  return false;
};

// Track continuous failure window to decide when UI should escalate
let firstFailureAt: number | null = null;

// Define public endpoints that don't require authentication
const isPublicEndpoint = (url?: string): boolean => {
  if (!url) return false;
  const publicPaths = ['/product', '/category', '/brand', '/banner', '/health', '/search', '/collection'];
  return publicPaths.some(path => url.includes(path));
};

// Aggressive retry configuration - maximum attempts to recover silently
const getRetryConfig = (): { maxAttempts: number; delayBase: number } => {
  if (typeof navigator === "undefined") {
    return { maxAttempts: 6, delayBase: 2000 };
  }
  const conn = (navigator as NavigatorWithConnection).connection || (navigator as NavigatorWithConnection).mozConnection || (navigator as NavigatorWithConnection).webkitConnection;
  if (!conn) {
    return { maxAttempts: 6, delayBase: 2000 };
  }
  
  // 2G networks: Maximum retries, longer delays to avoid showing errors
  if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") {
    return { maxAttempts: 8, delayBase: 4000 };
  }
  // 3G networks: High retries
  if (conn.effectiveType === "3g") {
    return { maxAttempts: 6, delayBase: 2500 };
  }
  // 4G and faster: Moderate retries
  return { maxAttempts: 4, delayBase: 1500 };
};

/* -------------------- Interceptors -------------------- */
apiClient.interceptors.request.use(
  (config) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  async (response: AxiosResponse<ApiResponse>) => {
    // reset failure tracking on any success
    firstFailureAt = null;

    try {
      const store = await getStore();
      const state = store.getState() as RootState;
      const wasNotOk =
        state?.apiStatus?.status && state.apiStatus.status !== "ok";

      if (wasNotOk) {
        const { markOk } = await import("@/store/slice/apiStatusSlice");
        store.dispatch(markOk());
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("api:recovered"));
        }
      }
    } catch {
      // ignore if store unavailable
    }
    return response;
  },
 async (error: AxiosError<ErrorResponse>) => {
    const cfg: AxiosRequestConfig & { skipAuthRedirect?: boolean; showToast?: boolean } =
      error.config || {};

    const status = error.response?.status;
    const serverMsg = error.response?.data?.message ?? "";
    const serverMsgLc = serverMsg.toLowerCase();

    // Treat 401/403 (or any message that contains "unauth") as an auth error
    const isAuthError =
      status === 401 ||
      status === 403 ||
      /unauth/.test(serverMsgLc); // covers "unauthenticated", "unathenticated", etc.

    // Normalize the user-facing message
    let message: string;
    if (isAuthError) {
      // More specific message for auth-required endpoints
      const url = String(cfg.url || "");
      const isAuthCall =
        /\/auth\/(login|register|refresh|password|forgot|reset)/i.test(url) ||
        /\/login$/i.test(url);
      const requiresAuth = !isAuthCall && !isPublicEndpoint(url);

      message = requiresAuth
        ? "Session expired. Please log in again."
        : "Please log in to continue.";
    } else if (isLikelyCORS(error)) {
      message = "We couldn’t connect due to a configuration issue. Please contact the support team.";
    } else if (isTimeoutOrNoResponse(error)) {
      message = "The server took too long to respond.";
    } else if (serverMsg) {
      message = serverMsg;
    } else {
      message = "Something went wrong";
    }

    // ----- Auth errors: warn + do not escalate global API status -----
    if (isAuthError) {
      const url = String(cfg.url || "");
      const isAuthCall =
        /\/auth\/(login|register|refresh|password|forgot|reset)/i.test(url) ||
        /\/login$/i.test(url);
      const requiresAuth = !isAuthCall && !isPublicEndpoint(url);

      // For 403 on public endpoints, clear invalid token and retry without auth
      if (status === 403 && isPublicEndpoint(url) && !isAuthCall && !cfg._retriedWithoutAuth) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          delete apiClient.defaults.headers.common['Authorization'];
        }

        // Retry the request without auth header (silently)
        const retryConfig = {
          ...cfg,
          headers: {
            ...cfg.headers,
            Authorization: undefined,
          },
          _retriedWithoutAuth: true,
          showToast: false, // Don't show toast for this automatic retry
        };
        delete retryConfig.headers?.Authorization;

        try {
          return apiClient.request(retryConfig);
        } catch (retryError) {
          // If retry also fails, continue with normal error handling
        }
      }

      // Show toast for auth errors (except silent retries)
      if (cfg.showToast !== false && canToast() && !cfg._retriedWithoutAuth) {
        const opts: Parameters<typeof toast.message>[1] = {
          id: "auth-warning",
          duration: 6000,
          dismissible: true,
        };

        type ToastWithWarning = typeof toast & {
          warning?: (msg: string, options?: Parameters<typeof toast.message>[1]) => unknown;
        };
        const t = toast as ToastWithWarning;

        if (t.warning) {
          t.warning("Please log in to continue.", opts);
        } else {
          toast.message("Please log in to continue.", opts);
        }
      }

      // Handle 401 (unauthorized) - always clear token
      if (status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          delete apiClient.defaults.headers.common['Authorization'];
        }

        if (!cfg.skipAuthRedirect && !isAuthCall && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        }
      }

      // Handle 403 (forbidden) - clear token; if the endpoint requires auth, redirect to login
      if (status === 403 && !cfg._retriedWithoutAuth) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          delete apiClient.defaults.headers.common['Authorization'];
        }

        if (!cfg.skipAuthRedirect && requiresAuth && typeof window !== "undefined") {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?next=${next}`;
        }
      }

      return Promise.reject(error);
    }

    // ----- Non-auth errors: keep your existing banner/escalation logic -----
    const now = Date.now();
    if (!firstFailureAt) firstFailureAt = now;

    try {
      const store = await getStore();

      if (typeof window !== "undefined" && navigator && !navigator.onLine) {
        const { markDown } = await import("@/store/slice/apiStatusSlice");
        store.dispatch(markDown({ message: "You are offline." }));
        window.dispatchEvent(new CustomEvent("api:down", { detail: { message: "You are offline." } }));
      } else if (isLikelyCORS(error)) {
        const { markDown } = await import("@/store/slice/apiStatusSlice");
        store.dispatch(markDown({ message }));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("api:down", { detail: { message } }));
        }
      } else if (isTimeoutOrNoResponse(error)) {
        // Aggressive silent retry - don't show errors until all retries exhausted
        const retryCount = cfg._retryCount || 0;
        const retryConfigResult = getRetryConfig();
        const { maxAttempts, delayBase } = retryConfigResult;
        
        if (retryCount < maxAttempts && !cfg._retriedWithoutAuth) {
          // Exponential backoff with jitter - longer delays for 2G
          const delay = delayBase * Math.pow(2, retryCount) + Math.random() * 2000;
          
          // Silent retry - no toast, no error shown to user
          await new Promise(resolve => setTimeout(resolve, delay));
          
          const retryConfig = {
            ...cfg,
            _retryCount: retryCount + 1,
            showToast: false, // Never show toast during retries
            timeout: getAdaptiveTimeout(), // Use adaptive timeout for retry
          };

          try {
            // Continue retrying silently
            return apiClient.request(retryConfig);
          } catch (retryError) {
            // If retry fails, continue to next retry attempt
            // Only after all retries exhausted will error be shown
          }
        }

        // Only escalate API status after ALL retries are exhausted
        // During retries, keep status as-is to avoid showing errors to user
        if (retryCount >= maxAttempts) {
          // All retries exhausted - now escalate based on elapsed time
          const elapsed = now - firstFailureAt;
          if (elapsed >= 30000) { // Increased threshold to avoid premature errors
            const { markDown } = await import("@/store/slice/apiStatusSlice");
            store.dispatch(markDown({ message }));
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("api:down", { detail: { message } }));
            }
          } else {
            const { markDegraded } = await import("@/store/slice/apiStatusSlice");
            store.dispatch(markDegraded({ message }));
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("api:degraded", { detail: { message } }));
            }
          }
        }
        // If still retrying, don't escalate - let retries continue silently
      } else if (status && status >= 500) {
        const { markDegraded } = await import("@/store/slice/apiStatusSlice");
        store.dispatch(markDegraded({ message }));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("api:degraded", { detail: { message } }));
        }
      }
      // 4xx non-auth: no banner escalation
    } catch {
      // ignore if store unavailable
    }

    // Only show error toast if:
    // 1. Not explicitly disabled
    // 2. All retry attempts exhausted (for timeout errors)
    // 3. Not a retry attempt (retry attempts have showToast: false)
    const isRetryAttempt = (cfg._retryCount || 0) > 0 || cfg._retriedWithoutAuth;
    const shouldShowError = cfg.showToast !== false && canToast() && !isRetryAttempt;
    
    if (shouldShowError) {
      // Only show error after all background retries are exhausted
      toast.error(message, { id: "api-error", duration: 6000, dismissible: true });
    }

    return Promise.reject(error);
  }

);

export default apiClient;
