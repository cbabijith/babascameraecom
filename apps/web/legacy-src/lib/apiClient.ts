import axios, { AxiosError } from "axios";
import { toast } from "sonner";

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
    showToast?: boolean;
  }
}

// Keep all storefront traffic same-origin. Stale local env files must never
// redirect authenticated commerce requests to the retired legacy backend.
export const API_BASE_URL = "/api";
export const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_BASE_URL?.trim() || "";
export const THUMBNAIL_BASE_URL =
  process.env.NEXT_PUBLIC_THUMBNAIL_BASE_URL?.trim() || CDN_BASE_URL;
export const HEALTH_ENDPOINT = "/api/health";

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
  message?: string;
  statusCode?: number;
  code?: number | string;
}

function joinAssetUrl(base: string, key: string): string {
  if (/^https?:\/\//i.test(key) || key.startsWith("data:") || key.startsWith("blob:")) {
    return key;
  }
  if (!base) return key.startsWith("/") ? key : `/${key}`;
  return `${base.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
}

export const getImageUrl = (imageKey?: string | null): string =>
  imageKey ? joinAssetUrl(CDN_BASE_URL, imageKey) : "";

export const getProductFallbackImage = (): string => "/placeholder.svg";

export const getThumbnailUrl = (imageKey?: string | null): string =>
  imageKey
    ? joinAssetUrl(THUMBNAIL_BASE_URL, imageKey)
    : getProductFallbackImage();

export const getErrorMessage = (
  error: unknown,
  fallback = "Something went wrong",
): string => {
  if (axios.isAxiosError<ErrorResponse>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorResponse>) => {
    const status = error.response?.status;
    const config = error.config;
    const message = getErrorMessage(error);

    if (status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      if (!config?.skipAuthRedirect) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.assign(`/login?next=${next}`);
      }
    } else if (config?.showToast !== false && typeof window !== "undefined") {
      toast.error(message);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
