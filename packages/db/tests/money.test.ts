import { describe, expect, test } from "bun:test";

import {
  MAX_NUMERIC_10_2_PAISE,
  moneyToPaise,
  multiplyMoney,
  normalizeMoney,
  paiseToMoney,
} from "../src/money";

describe("money helpers", () => {
  test("converts decimal strings without floating-point arithmetic", () => {
    expect(moneyToPaise("0")).toBe(0);
    expect(moneyToPaise("12.3")).toBe(1_230);
    expect(moneyToPaise("99999999.99")).toBe(MAX_NUMERIC_10_2_PAISE);
    expect(String(paiseToMoney(1_230))).toBe("12.30");
    expect(String(normalizeMoney("12.3"))).toBe("12.30");
  });

  test("rejects malformed, negative, and over-precision values", () => {
    for (const value of ["-1.00", "01.00", "1.001", "1e3", "NaN", ""]) {
      expect(() => moneyToPaise(value)).toThrow();
    }
  });

  test("enforces PostgreSQL numeric(10,2) range", () => {
    expect(() => moneyToPaise("100000000.00")).toThrow(RangeError);
    expect(() => paiseToMoney(MAX_NUMERIC_10_2_PAISE + 1)).toThrow();
    expect(() => multiplyMoney("99999999.99", 2)).toThrow(RangeError);
  });

  test("multiplies through integer paise", () => {
    expect(String(multiplyMoney("199.99", 3))).toBe("599.97");
  });
});
