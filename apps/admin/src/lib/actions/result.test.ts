import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
  actionSuccess,
  AdminActionError,
  publicActionError,
  validationFailure,
} from "@/lib/actions/result";

describe("admin action result contract", () => {
  test("returns serializable success data", () => {
    expect(actionSuccess({ id: "record-1" })).toEqual({
      success: true,
      data: { id: "record-1" },
    });
  });

  test("flattens safe validation messages without throwing", () => {
    const parsed = z.object({ email: z.string().email("Enter a valid email.") }).safeParse({
      email: "invalid",
    });
    if (parsed.success) throw new Error("Expected validation to fail.");
    expect(validationFailure(parsed.error)).toEqual({
      success: false,
      error: "Enter a valid email.",
      fieldErrors: { email: ["Enter a valid email."] },
    });
  });

  test("exposes only explicitly marked business errors", () => {
    expect(publicActionError(new AdminActionError("Record not found."), "Request failed."))
      .toBe("Record not found.");
    expect(publicActionError(new Error("database.internal.example"), "Request failed."))
      .toBe("Request failed.");
  });
});
