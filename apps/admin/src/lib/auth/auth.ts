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
  // Fail loudly instead of silently signing sessions with a committed
  // fallback secret — a missing env var must never weaken the admin app.
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET is not set. Refusing to run the admin auth handler with a fallback secret.",
    );
  }
  const instance = createBetterAuth({
    baseURL,
    secret,
  });
  instanceCache.set(baseURL, instance);
  return instance;
}

export { auth } from "@babascamera/db";
