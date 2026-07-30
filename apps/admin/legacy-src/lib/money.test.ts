import { describe, expect, it } from "bun:test";

import { parseMoney, parseOptionalMoney } from "./money";

describe("parseMoney", () => {
  it("normalizes decimal input without floating-point rounding", () => {
    expect(parseMoney("0012.3")).toEqual({ decimal: "12.30", paise: 1230 });
    expect(parseMoney("0.01")).toEqual({ decimal: "0.01", paise: 1 });
    expect(parseMoney("99999999.99")).toEqual({
      decimal: "99999999.99",
      paise: 9_999_999_999,
    });
  });

  it("rejects negatives, exponents, extra precision, NaN, and overflow", () => {
    for (const value of [
      "-1",
      "+1",
      "1e3",
      "1.001",
      "NaN",
      "Infinity",
      "100000000.00",
      "",
    ]) {
      expect(() => parseMoney(value)).toThrow();
    }
  });

  it("distinguishes an optional blank value from zero", () => {
    expect(parseOptionalMoney("")).toBeNull();
    expect(parseOptionalMoney(null)).toBeNull();
    expect(parseOptionalMoney("0")).toEqual({ decimal: "0.00", paise: 0 });
  });
});
