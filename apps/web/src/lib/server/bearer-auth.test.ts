import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { hasValidBearerToken } from "./bearer-auth";

describe("internal bearer authentication", () => {
  const secret = "hostinger-cron-secret-with-at-least-32-characters";

  it("accepts an exact bearer token", () => {
    expect(hasValidBearerToken(`Bearer ${secret}`, secret)).toBe(true);
  });

  it.each([
    null,
    "",
    secret,
    `Basic ${secret}`,
    "Bearer wrong-secret",
    "Bearer",
  ])("rejects invalid authorization value %s", (header) => {
    expect(hasValidBearerToken(header, secret)).toBe(false);
  });

  it("fails closed when the server secret is missing", () => {
    expect(hasValidBearerToken(`Bearer ${secret}`, undefined)).toBe(false);
  });
});
