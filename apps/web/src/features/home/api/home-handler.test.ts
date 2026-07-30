import { afterEach, describe, expect, it, vi } from "vitest";

import type { HomeRepository } from "../types";
import { createStorefrontHomeHandler } from "./home-handler";

const emptyRepository: HomeRepository = {
  listBannerCandidates: async () => [],
  listCategories: async () => [],
  listBrands: async () => [],
  listProductCandidates: async () => ({
    featured: [],
    bestSellers: [],
    newArrivals: [],
    offers: [],
  }),
  listProductsByIds: async () => [],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/storefront/home", () => {
  it("returns the stable public envelope and cache policy", async () => {
    const response = await createStorefrontHomeHandler(emptyRepository)(
      new Request("http://localhost/api/storefront/home?sectionLimit=8"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    expect(payload).toMatchObject({
      success: true,
      data: {
        banners: [],
        categories: [],
        brands: [],
        productSections: {
          featured: [],
          bestSellers: [],
          newArrivals: [],
          offers: [],
        },
      },
      meta: { currency: "INR" },
    });
  });

  it("rejects unknown, malformed, and excessive query limits", async () => {
    const handler = createStorefrontHomeHandler(emptyRepository);
    for (const query of ["sectionLimit=0", "sectionLimit=13", "sectionLimit=nope", "unknown=1"]) {
      const response = await handler(new Request(`http://localhost/api/storefront/home?${query}`));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        success: false,
        error: {
          code: "INVALID_QUERY",
          message: "The homepage request parameters are invalid.",
        },
      });
    }
  });

  it("maps repository failures to a safe non-cacheable response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await createStorefrontHomeHandler({
      ...emptyRepository,
      listCategories: async () => {
        throw new Error("sensitive SQL detail");
      },
    })(new Request("http://localhost/api/storefront/home"));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(JSON.stringify(payload)).not.toContain("SQL");
    expect(payload.error.code).toBe("STOREFRONT_HOME_UNAVAILABLE");
  });
});
