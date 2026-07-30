import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { StorefrontApiError, fetchStorefrontHome } from "./get-storefront-home";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("storefront homepage API client", () => {
  it("validates a successful response instead of casting JSON", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({
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
        meta: {
          generatedAt: "2026-07-30T10:00:00.000Z",
          currency: "INR",
        },
      }),
    ) as typeof fetch;

    const result = await fetchStorefrontHome("http://localhost:3000");
    expect(result.success).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it("rejects responses contaminated with non-public product fields", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({
        success: true,
        data: {
          banners: [],
          categories: [],
          brands: [],
          productSections: {
            featured: [
              {
                id: "00000000-0000-4000-8000-000000000001",
                name: "Camera",
                slug: "camera",
                brand: null,
                category: { name: "Cameras", slug: "cameras" },
                image: null,
                mrp: "100.00",
                salePrice: "90.00",
                discountPercent: 10,
                availability: "in_stock",
                costPrice: "1.00",
              },
            ],
            bestSellers: [],
            newArrivals: [],
            offers: [],
          },
        },
        meta: {
          generatedAt: "2026-07-30T10:00:00.000Z",
          currency: "INR",
        },
      }),
    ) as typeof fetch;

    await expect(fetchStorefrontHome("http://localhost:3000")).rejects.toBeInstanceOf(
      StorefrontApiError,
    );
  });
});
