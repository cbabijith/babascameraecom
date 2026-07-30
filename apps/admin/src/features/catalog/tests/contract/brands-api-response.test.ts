import { describe, expect, test } from "bun:test";

import {
  errorResponse,
  parseBrandJson,
  parseBrandFormData,
  successResponse,
} from "@/features/catalog/api/brands-api-response";
import { BrandServiceError } from "@/features/catalog/services/brands-service-error";

describe("brands API response contract", () => {
  test("uses stable success and dependency-conflict envelopes", async () => {
    expect(await successResponse({ id: "brand-1" }, 201).json()).toEqual({
      success: true,
      data: { id: "brand-1" },
    });
    const response = errorResponse("BRAND_HAS_PRODUCTS", "Brand is in use.", 409);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: "BRAND_HAS_PRODUCTS", message: "Brand is in use." },
    });
  });

  test("preserves field errors without internal details", async () => {
    const response = errorResponse("BRAND_NAME_CONFLICT", "A brand with this name already exists.", 409, {
      name: ["A brand with this name already exists."],
    });
    expect(await response.json()).toEqual({
      success: false,
      error: {
        code: "BRAND_NAME_CONFLICT",
        message: "A brand with this name already exists.",
        fieldErrors: { name: ["A brand with this name already exists."] },
      },
    });
  });

  test("maps malformed JSON to a stable 400 business error", async () => {
    const request = new Request("https://admin.example/api/admin/catalog/brands/reorder", {
      method: "POST",
      body: "{",
      headers: { "Content-Type": "application/json" },
    });
    await expect(parseBrandJson(request)).rejects.toEqual(
      new BrandServiceError("Request body is malformed.", "MALFORMED_REQUEST", 400),
    );
  });

  test("rejects non-multipart brand forms with 415", async () => {
    const request = new Request("https://admin.example/api/admin/catalog/brands", {
      method: "POST",
      body: JSON.stringify({ name: "Canon" }),
      headers: { "Content-Type": "application/json" },
    });
    await expect(parseBrandFormData(request)).rejects.toMatchObject({
      code: "UNSUPPORTED_MEDIA_TYPE",
      status: 415,
    });
  });
});
