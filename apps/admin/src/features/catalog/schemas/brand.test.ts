import { describe, expect, test } from "bun:test";

import {
  brandClientSchema,
  brandMutationSchema,
  brandQuerySchema,
  brandReorderSchema,
  brandStatusSchema,
  normalizeBrandName,
} from "./brand";

describe("brand schemas", () => {
  test("normalizes safe names and rejects empty names", () => {
    expect(normalizeBrandName("  Carl   Zeiss  ")).toBe("Carl Zeiss");
    expect(brandClientSchema.safeParse({ name: "   ", isActive: true }).success).toBe(false);
    expect(brandClientSchema.safeParse({ name: "<script>alert(1)</script>", isActive: true }).success).toBe(true);
  });

  test("rejects unknown mutation fields and invalid status", () => {
    expect(brandMutationSchema.safeParse({
      name: "Canon",
      isActive: "true",
      unexpected: "admin",
    }).success).toBe(false);
    expect(brandStatusSchema.safeParse({ isActive: "true" }).success).toBe(false);
  });

  test("validates search filters and rejects SQL payload as a status", () => {
    expect(brandQuerySchema.safeParse({ q: "' OR 1=1 --", status: "all" }).success).toBe(true);
    expect(brandQuerySchema.safeParse({ q: "", status: "' OR 1=1 --" }).success).toBe(false);
  });

  test("rejects duplicate, missing, malformed, and oversized reorder input", () => {
    const first = "00000000-0000-4000-8000-000000000001";
    const second = "00000000-0000-4000-8000-000000000002";
    expect(brandReorderSchema.safeParse({ brandIds: [first, second] }).success).toBe(true);
    expect(brandReorderSchema.safeParse({ brandIds: [first, first] }).success).toBe(false);
    expect(brandReorderSchema.safeParse({ brandIds: [] }).success).toBe(false);
    expect(brandReorderSchema.safeParse({ brandIds: ["not-an-id"] }).success).toBe(false);
    expect(brandReorderSchema.safeParse({ brandIds: Array(501).fill(first) }).success).toBe(false);
  });
});
