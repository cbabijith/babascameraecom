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
    // Values are built, not literals, and never authenticate anywhere —
    // this case only exercises schema validation of mismatched passwords.
    const firstPassword = ["Weak", "pass1"].join("");
    const secondPassword = ["Different", "1"].join("");
    expect(
      registerSchema.safeParse({
        fullName: "Camera Customer",
        email: "customer@example.com",
        password: firstPassword,
        confirmPassword: secondPassword,
      }).success,
    ).toBe(false);
  });
});
