import "server-only";

import { cookies } from "next/headers";

/**
 * Server-side fetch helpers for the Hono backend on Railway. The Vercel
 * storefront has no database access; every server-side read goes through
 * here.
 *
 * - backendFetch: public, cacheable reads (catalog, banners, settings). No
 *   cookies are forwarded so routes remain statically renderable.
 * - backendFetchScoped: session-scoped reads (session, cart). Forwards the
 *   browser's cookies and never caches.
 */
export const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN ?? "").replace(/\/+$/, "");

interface FetchOptions {
  revalidate?: number | false;
  tags?: string[];
  timeoutMs?: number;
}

async function request<T>(path: string, headers: Record<string, string>, options?: FetchOptions): Promise<T> {
  if (!BACKEND_ORIGIN) {
    throw new Error("BACKEND_ORIGIN is not configured for the storefront.");
  }
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${BACKEND_ORIGIN}${path}`, {
      headers,
      signal: controller.signal,
      ...(options?.revalidate === undefined && !options?.tags
        ? { next: { revalidate: 60 } }
        : { next: { revalidate: options?.revalidate, tags: options?.tags } }),
    });
    if (!response.ok) {
      throw new Error(`Backend ${path} responded ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Backend ${path} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function backendFetch<T>(path: string, options?: FetchOptions): Promise<T> {
  return request<T>(path, {}, options);
}

export async function backendFetchScoped<T>(path: string, options?: FetchOptions): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  return request<T>(path, cookieHeader ? { cookie: cookieHeader } : {}, { ...options, revalidate: undefined, tags: undefined });
}
