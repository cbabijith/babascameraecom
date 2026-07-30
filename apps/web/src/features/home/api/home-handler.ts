import { NextResponse } from "next/server";

import { storefrontHomeQuerySchema, storefrontHomeSuccessSchema } from "../schemas/home-schema";
import { getStorefrontHome } from "../services/home-service";
import type { HomeRepository } from "../types";

const PUBLIC_CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

export function createStorefrontHomeHandler(repository: HomeRepository) {
  return async function get(request: Request) {
    const query = storefrontHomeQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    if (!query.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_QUERY",
            message: "The homepage request parameters are invalid.",
          },
        },
        {
          status: 400,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }

    try {
      const response = storefrontHomeSuccessSchema.parse(
        await getStorefrontHome(repository, query.data),
      );
      return NextResponse.json(response, {
        headers: { "Cache-Control": PUBLIC_CACHE_CONTROL },
      });
    } catch (error) {
      console.error("Storefront homepage API failed", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "STOREFRONT_HOME_UNAVAILABLE",
            message: "The storefront is temporarily unavailable.",
          },
        },
        {
          status: 503,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
  };
}
