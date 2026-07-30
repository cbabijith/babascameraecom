import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./schemas";

describe("auth schemas", () => {
  it("normalizes a valid login", () => {
    expect(
      loginSchema.parse({
        email: "customer@example.com",
        password: "secret",
      }).email,
    ).toBe("customer@example.com");
  });

  it("requires strong matching registration passwords", () => {
    expect(
      registerSchema.safeParse({
        fullName: "Camera Customer",
        email: "customer@example.com",
        password: "Weakpass1",
        confirmPassword: "Different1",
      }).success,
    ).toBe(false);
  });
});
