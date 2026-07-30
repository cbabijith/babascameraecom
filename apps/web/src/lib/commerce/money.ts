const DECIMAL_MONEY = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;

export function decimalToPaise(value: string): bigint {
  const normalized = value.trim();
  const match = DECIMAL_MONEY.exec(normalized);
  if (!match) throw new Error("Invalid non-negative money value.");
  const wholeRupees = match[1];
  if (!wholeRupees) throw new Error("Invalid non-negative money value.");
  const rupees = BigInt(wholeRupees);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return rupees * 100n + BigInt(fraction || "0");
}

export function paiseToDecimal(value: bigint): string {
  if (value < 0n) throw new Error("Money cannot be negative.");
  const rupees = value / 100n;
  const fraction = String(value % 100n).padStart(2, "0");
  return `${rupees}.${fraction}`;
}

export function percentageToBasisPoints(value: string): bigint {
  const match = DECIMAL_MONEY.exec(value.trim());
  if (!match) throw new Error("Invalid percentage.");
  const wholePercentage = match[1];
  if (!wholePercentage) throw new Error("Invalid percentage.");
  const points =
    BigInt(wholePercentage) * 100n +
    BigInt((match[2] ?? "").padEnd(2, "0"));
  if (points > 10_000n) throw new Error("Percentage cannot exceed 100.");
  return points;
}

export type CheckoutCoupon =
  | { type: "fixed"; amountPaise: bigint }
  | {
      type: "percentage";
      basisPoints: bigint;
      maximumDiscountPaise?: bigint | null;
    };

export function calculateCheckoutTotals(input: {
  lines: { unitPricePaise: bigint; quantity: number }[];
  coupon?: CheckoutCoupon | null;
  shippingFeePaise: bigint;
  freeShippingThresholdPaise?: bigint | null;
}) {
  const subtotalPaise = input.lines.reduce((total, line) => {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new Error("Quantity must be a positive integer.");
    }
    if (line.unitPricePaise < 0n) throw new Error("Price cannot be negative.");
    return total + line.unitPricePaise * BigInt(line.quantity);
  }, 0n);

  let discountPaise = 0n;
  if (input.coupon?.type === "fixed") {
    discountPaise = input.coupon.amountPaise;
  } else if (input.coupon?.type === "percentage") {
    if (
      input.coupon.basisPoints < 0n ||
      input.coupon.basisPoints > 10_000n
    ) {
      throw new Error("Coupon percentage is invalid.");
    }
    discountPaise =
      (subtotalPaise * input.coupon.basisPoints) / 10_000n;
    if (input.coupon.maximumDiscountPaise !== undefined &&
        input.coupon.maximumDiscountPaise !== null) {
      discountPaise =
        discountPaise > input.coupon.maximumDiscountPaise
          ? input.coupon.maximumDiscountPaise
          : discountPaise;
    }
  }
  if (discountPaise < 0n) throw new Error("Discount cannot be negative.");
  if (discountPaise > subtotalPaise) discountPaise = subtotalPaise;

  const discountedSubtotalPaise = subtotalPaise - discountPaise;
  const qualifiesForFreeShipping =
    input.freeShippingThresholdPaise !== undefined &&
    input.freeShippingThresholdPaise !== null &&
    discountedSubtotalPaise >= input.freeShippingThresholdPaise;
  const shippingPaise = qualifiesForFreeShipping
    ? 0n
    : input.shippingFeePaise;
  if (shippingPaise < 0n) throw new Error("Shipping cannot be negative.");

  return {
    subtotalPaise,
    discountPaise,
    shippingPaise,
    totalPaise: discountedSubtotalPaise + shippingPaise,
  };
}

export function safePaiseNumber(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Amount is outside the supported payment range.");
  }
  return Number(value);
}
