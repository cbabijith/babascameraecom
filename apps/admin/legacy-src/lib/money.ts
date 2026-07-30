export type ParsedMoney = {
  decimal: string;
  paise: number;
};

const MAX_INTEGER_DIGITS = 8;

/**
 * PostgreSQL numeric(10,2) parser that never routes through binary floating
 * point. It accepts a plain non-negative decimal and returns the canonical
 * database value plus exact integer paise.
 */
export function parseMoney(value: FormDataEntryValue | string): ParsedMoney {
  if (typeof value !== "string") {
    throw new Error("Amount must be a decimal value.");
  }
  const trimmed = value.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed);
  if (!match) {
    throw new Error("Amount must be a non-negative decimal with at most two decimals.");
  }

  const integerPart = match[1].replace(/^0+(?=\d)/, "");
  const fractionalPart = (match[2] ?? "").padEnd(2, "0");
  if (integerPart.length > MAX_INTEGER_DIGITS) {
    throw new Error("Amount exceeds the supported numeric(10,2) range.");
  }

  const paise = Number(BigInt(integerPart) * 100n + BigInt(fractionalPart));
  if (!Number.isSafeInteger(paise) || paise < 0) {
    throw new Error("Amount exceeds the supported range.");
  }

  return {
    decimal: `${integerPart}.${fractionalPart}`,
    paise,
  };
}

export function parseOptionalMoney(
  value: FormDataEntryValue | string | null,
): ParsedMoney | null {
  if (value === null || (typeof value === "string" && value.trim() === "")) {
    return null;
  }
  return parseMoney(value);
}

export function formatDecimalMoney(
  value: string | number | null | undefined,
  currency = "INR",
) {
  const raw = typeof value === "number" ? value.toFixed(2) : value ?? "0.00";
  const parsed = /^(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
  const integer = parsed?.[1] ?? "0";
  const fraction = (parsed?.[2] ?? "").padEnd(2, "0");
  const numeric = Number(`${integer}.${fraction}`);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

