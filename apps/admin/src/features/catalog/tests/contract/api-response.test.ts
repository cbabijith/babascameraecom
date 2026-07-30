import { describe, expect, test } from "bun:test";

import { actionResultResponse } from "@/features/catalog/api/api-error";
import { isSameOrigin } from "@/features/catalog/api/route-guard";

describe("catalogue API contract", () => {
  test("uses the stable success envelope", async () => {
    const response = actionResultResponse({ success: true, data: { id: "item-1" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: { id: "item-1" },
    });
  });

  test("uses 201 for creates and 204 for empty deletes", () => {
    expect(actionResultResponse({ success: true, data: {} }, { created: true }).status).toBe(201);
    expect(actionResultResponse({ success: true, data: null }, { empty: true }).status).toBe(204);
  });

  test("maps field validation to a stable 422 envelope", async () => {
    const response = actionResultResponse({
      success: false,
      error: "Name is required.",
      fieldErrors: { name: ["Name is required."] },
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Name is required.",
        fieldErrors: { name: ["Name is required."] },
      },
    });
  });

  test("accepts same-origin requests and rejects cross-origin mutations", () => {
    const request = (origin: string) => ({
      headers: new Headers({ origin }),
      url: "https://admin.example/api",
    }) as Request;
    expect(isSameOrigin(request("https://admin.example"))).toBe(true);
    expect(isSameOrigin(request("https://evil.example"))).toBe(false);
  });
});
