import { describe, expect, it } from "bun:test";

import { GET } from "@/app/api/health/route";

describe("admin health endpoint", () => {
  it("is available without authentication or database configuration", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", service: "admin" });
  });
});
