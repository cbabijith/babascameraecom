import "server-only";

import { headers as nextHeaders } from "next/headers";
import { createBetterAuth } from "@babascamera/db";

/**
 * Web (storefront) better-auth instance.
 *
 * The storefront and the admin panel share one identity database (users,
 * sessions, accounts). Each deployment signs in through its own origin so
 * better-auth's origin checks accept same-origin requests.
 */
const instanceCache = new Map<string, ReturnType<typeof createBetterAuth>>();

function resolveOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export function getWebAuth(origin?: string) {
  const baseURL = (origin ?? resolveOrigin()).replace(/\/+$/, "");
  const cached = instanceCache.get(baseURL);
  if (cached) return cached;
  const instance = createBetterAuth({
    baseURL,
    secret:
      process.env.BETTER_AUTH_SECRET ||
      "babas-camera-super-secret-auth-key-2026-very-secure-32chars",
  });
  instanceCache.set(baseURL, instance);
  return instance;
}

/** Build a Request carrying the incoming cookies/headers for better-auth APIs. */
export async function getWebRequest(): Promise<Request> {
  const headerList = await nextHeaders();
  const origin = resolveOrigin();
  const url = new URL("/api/auth", origin);
  return new Request(url, {
    headers: headerList,
  });
}

/** best-effort request origin from incoming headers (for proxies/LB). */
export async function getRequestOrigin(): Promise<string> {
  const headerList = await nextHeaders();
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}
