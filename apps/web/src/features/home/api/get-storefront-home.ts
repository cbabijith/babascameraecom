import "server-only";

import { storefrontHomeResponseSchema, storefrontHomeSuccessSchema } from "../schemas/home-schema";
import type { StorefrontHomeSuccess } from "../types";

export class StorefrontApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "StorefrontApiError";
  }
}

export async function fetchStorefrontHome(
  origin: string,
  sectionLimit = 8,
): Promise<StorefrontHomeSuccess> {
  const url = new URL("/api/storefront/home", origin);
  url.searchParams.set("sectionLimit", String(sectionLimit));
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: {
      revalidate: 60,
      tags: ["storefront-home"],
    },
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new StorefrontApiError(
      "The storefront returned an invalid response.",
      "INVALID_STOREFRONT_RESPONSE",
      response.status,
    );
  }

  const parsed = storefrontHomeResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new StorefrontApiError(
      "The storefront returned an invalid response.",
      "INVALID_STOREFRONT_RESPONSE",
      response.status,
    );
  }
  if (!parsed.data.success) {
    throw new StorefrontApiError(
      parsed.data.error.message,
      parsed.data.error.code,
      response.status,
    );
  }
  if (!response.ok) {
    throw new StorefrontApiError(
      "The storefront is temporarily unavailable.",
      "STOREFRONT_REQUEST_FAILED",
      response.status,
    );
  }
  return storefrontHomeSuccessSchema.parse(parsed.data);
}
