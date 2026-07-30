import { describe, expect, it } from "bun:test";

import { compactId, formatMoney, parsePaise, slugify } from "@/lib/utils";

describe("admin formatting boundaries", () => {
  it("converts rupees to integer paise", () => {
    expect(parsePaise("1234.56")).toBe(123456);
    expect(parsePaise("0.105")).toBe(11);
    expect(parsePaise("not-a-number")).toBe(0);
  });

  it("formats minor units as INR", () => {
    expect(formatMoney(123456)).toContain("1,234.56");
  });

  it("creates stable URL-safe slugs", () => {
    expect(slugify("Sony Alpha 7 IV Camera")).toBe("sony-alpha-7-iv-camera");
    expect(slugify("  Canon  EOS / R5  ")).toBe("canon-eos-r5");
  });

  it("compacts long identifiers for operational tables", () => {
    expect(compactId("12345678-1234-5678-9012-123456789012")).toBe("12345678…9012");
  });
});
