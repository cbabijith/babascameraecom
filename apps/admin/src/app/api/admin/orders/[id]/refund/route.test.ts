import { describe, expect, test } from "bun:test";

import { POST } from "@/app/api/admin/orders/[id]/refund/route";

describe("admin refund API", () => {
  test("rejects missing or cross-origin requests before authentication or mutation", async () => {
    const response = await POST(
      new Request("https://admin.example/api/admin/orders/123e4567-e89b-12d3-a456-426614174000/refund", {
        method: "POST",
        headers: { origin: "https://evil.example" },
        body: JSON.stringify({ reason: "test" }),
      }),
      { params: Promise.resolve({ id: "123e4567-e89b-12d3-a456-426614174000" }) },
    );
    expect(response.status).toBe(403);
  });
});
