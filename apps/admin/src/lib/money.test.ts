import { describe, expect, test } from "bun:test";

import { formatMoney, parseMoney, parseOptionalMoney } from "@/lib/money";

describe("money parsing", () => {
  test("normalizes numeric(10,2) without floating point", () => {
    expect(parseMoney("00042.5")).toEqual({ decimal: "42.50", paise: 4_250 });
    expect(parseMoney("99999999.99")).toEqual({ decimal: "99999999.99", paise: 9_999_999_999 });
  });

  test.each(["-1", "NaN", "Infinity", "1e2", "1.001", "100000000.00", ""])(
    "rejects invalid or overflowing value %s",
    (value) => expect(() => parseMoney(value)).toThrow(),
  );

  test("handles optional and formatted amounts", () => {
    expect(parseOptionalMoney("")).toBeNull();
    expect(formatMoney("1234.50")).toBe("₹1,234.50");
  });
});
