import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest, secretsMatch } from "./cron-auth";

describe("cron authorization", () => {
  it("requires an exact non-empty secret", () => {
    expect(secretsMatch("secret", "secret")).toBe(true);
    expect(secretsMatch("secret", "other")).toBe(false);
    expect(secretsMatch("", "")).toBe(false);
  });

  it("accepts only a bearer token", () => {
    expect(
      isAuthorizedCronRequest(
        new Request("https://store.test/internal", {
          headers: { authorization: "Bearer cron-secret" },
        }),
        "cron-secret",
      ),
    ).toBe(true);
    expect(
      isAuthorizedCronRequest(
        new Request("https://store.test/internal", {
          headers: { authorization: "Basic cron-secret" },
        }),
        "cron-secret",
      ),
    ).toBe(false);
  });
});
