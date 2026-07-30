import { afterEach, describe, expect, it } from "vitest";

import { productImageUrl } from "./storage";

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

afterEach(() => {
  if (originalSupabaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  }
});

describe("productImageUrl", () => {
  it("keeps local public assets local", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";

    expect(productImageUrl("/camera2.png")).toBe("/camera2.png");
  });

  it("keeps absolute URLs unchanged", () => {
    expect(productImageUrl("https://images.example/camera.webp")).toBe(
      "https://images.example/camera.webp",
    );
  });

  it("builds a public Storage URL for managed object paths", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co/";

    expect(productImageUrl("products/camera body.webp")).toBe(
      "https://project.supabase.co/storage/v1/object/public/product-images/products/camera%20body.webp",
    );
  });
});
