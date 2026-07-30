import { afterEach, describe, expect, mock, test } from "bun:test";

import { brandsApi } from "@/features/catalog/api/brands-api-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("brands API client", () => {
  test("sends same-origin credentials and decodes success", async () => {
    const brand = {
      id: "brand-1",
      name: "Canon",
      slug: "canon",
      description: null,
      logoUrl: null,
      position: 0,
      isActive: true,
      productCount: 0,
    };
    const fetchMock = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.credentials).toBe("same-origin");
      return Response.json({ success: true, data: brand });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const result = await brandsApi.create(new FormData());
    expect(result).toEqual({ success: true, data: brand });
  });

  test("returns the public API error without throwing", async () => {
    globalThis.fetch = mock(async () => Response.json({
      success: false,
      error: { code: "VALIDATION_FAILED", message: "Check the name.", fieldErrors: { name: ["Required"] } },
    }, { status: 422 })) as unknown as typeof fetch;
    expect(await brandsApi.create(new FormData())).toEqual({
      success: false,
      error: "Check the name.",
      fieldErrors: { name: ["Required"] },
    });
  });

  test("turns network failures into a usable error", async () => {
    globalThis.fetch = mock(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const result = await brandsApi.remove("brand-1");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Could not reach");
  });
});
