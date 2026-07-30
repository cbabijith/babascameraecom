import "server-only";

import { headers } from "next/headers";

function configuredOrigin(): string | null {
  const value =
    process.env.STOREFRONT_INTERNAL_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEB_URL?.trim();
  if (!value) return null;
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("The configured storefront origin must use HTTP or HTTPS.");
  }
  return url.origin;
}

export async function getStorefrontOrigin(): Promise<string> {
  const configured = configuredOrigin();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "STOREFRONT_INTERNAL_ORIGIN or NEXT_PUBLIC_SITE_URL is required in production.",
    );
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host || !/^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/.test(host)) {
    throw new Error("Unable to resolve a safe local storefront origin.");
  }
  const protocol = requestHeaders.get("x-forwarded-proto") === "https" ? "https" : "http";
  return `${protocol}://${host}`;
}
