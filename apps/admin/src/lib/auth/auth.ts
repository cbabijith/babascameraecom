import "server-only";

import { headers as nextHeaders } from "next/headers";
import { createBetterAuth } from "@babascamera/db";

const instanceCache = new Map<string, ReturnType<typeof createBetterAuth>>();

export async function getRequestOrigin(): Promise<string> {
  try {
    const headerList = await nextHeaders();
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
    const protocol =
      headerList.get("x-forwarded-proto") ??
      (host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https");
    if (host) return `${protocol}://${host}`;
  } catch {
    /* fallback */
  }
  return (
    process.env.NEXT_PUBLIC_ADMIN_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    "http://localhost:3001"
  );
}

export function getAdminAuth(origin?: string) {
  const baseURL = (origin || "http://localhost:3001").replace(/\/+$/, "");
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

export { auth } from "@babascamera/db";
