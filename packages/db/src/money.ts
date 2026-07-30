declare const moneyStringBrand: unique symbol;

export type MoneyString = string & {
  readonly [moneyStringBrand]: "MoneyString";
};

const MONEY_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;
export const MAX_NUMERIC_10_2_PAISE = 9_999_999_999;

export function moneyToPaise(value: string): number {
  const match = MONEY_PATTERN.exec(value);

  if (match === null) {
    throw new TypeError(
      `Invalid money value "${value}". Expected a non-negative decimal with at most 2 places.`,
    );
  }

  const wholeRupees = Number(match[1]);
  const fractionalDigits = match[2] ?? "";
  const paise = wholeRupees * 100 + Number(fractionalDigits.padEnd(2, "0"));

  if (!Number.isSafeInteger(paise)) {
    throw new RangeError(`Money value "${value}" exceeds the safe integer range.`);
  }

  if (paise > MAX_NUMERIC_10_2_PAISE) {
    throw new RangeError(`Money value "${value}" exceeds PostgreSQL numeric(10,2).`);
  }

  return paise;
}

export function paiseToMoney(value: number): MoneyString {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Paise must be a non-negative safe integer.");
  }

  if (value > MAX_NUMERIC_10_2_PAISE) {
    throw new RangeError(`Paise exceeds PostgreSQL numeric(10,2): ${MAX_NUMERIC_10_2_PAISE}.`);
  }

  const wholeRupees = Math.floor(value / 100);
  const paise = value % 100;

  return `${wholeRupees}.${paise.toString().padStart(2, "0")}` as MoneyString;
}

export function normalizeMoney(value: string): MoneyString {
  return paiseToMoney(moneyToPaise(value));
}

export function multiplyMoney(value: string, quantity: number): MoneyString {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new TypeError("Quantity must be a non-negative safe integer.");
  }

  const totalPaise = moneyToPaise(value) * quantity;

  if (!Number.isSafeInteger(totalPaise)) {
    throw new RangeError("Money multiplication exceeds the safe integer range.");
  }

  return paiseToMoney(totalPaise);
}
