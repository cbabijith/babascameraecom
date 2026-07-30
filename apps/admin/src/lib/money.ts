export interface ParsedMoney {
  decimal: string;
  paise: number;
}

const MAX_INTEGER_DIGITS = 8;

export function parseMoney(value: FormDataEntryValue | string): ParsedMoney {
  if (typeof value !== "string") throw new Error("Amount must be a decimal value.");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) {
    throw new Error("Amount must be a non-negative decimal with at most two decimals.");
  }
  const integerPart = (match[1] ?? "0").replace(/^0+(?=\d)/, "");
  const fraction = (match[2] ?? "").padEnd(2, "0");
  if (integerPart.length > MAX_INTEGER_DIGITS) {
    throw new Error("Amount exceeds the supported numeric(10,2) range.");
  }
  const paise = Number(BigInt(integerPart) * 100n + BigInt(fraction));
  if (!Number.isSafeInteger(paise) || paise < 0) {
    throw new Error("Amount exceeds the supported range.");
  }
  return { decimal: `${integerPart}.${fraction}`, paise };
}

export function parseOptionalMoney(
  value: FormDataEntryValue | string | null | undefined,
): ParsedMoney | null {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    return null;
  }
  return parseMoney(value);
}

export function formatMoney(value: string | null | undefined) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value ?? "0");
  const minor = match
    ? BigInt(match[1] ?? "0") * 100n + BigInt((match[2] ?? "").padEnd(2, "0"))
    : 0n;
  const integer = minor / 100n;
  const fraction = (minor % 100n).toString().padStart(2, "0");
  return `₹${integer.toLocaleString("en-IN")}.${fraction}`;
}

export function formatPaise(value: number) {
  if (!Number.isSafeInteger(value)) return "₹0.00";
  return formatMoney(`${Math.trunc(value / 100)}.${Math.abs(value % 100).toString().padStart(2, "0")}`);
}
