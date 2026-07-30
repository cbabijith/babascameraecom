export interface PurchasedCartLine {
  productId: string | null;
  variantId: string | null;
  quantity: number;
}

export interface AggregatedPurchasedCartLine {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export function aggregatePurchasedCartLines(
  lines: PurchasedCartLine[],
): AggregatedPurchasedCartLine[] {
  const grouped = new Map<string, AggregatedPurchasedCartLine>();
  for (const line of lines) {
    if (!line.productId || !Number.isInteger(line.quantity) || line.quantity <= 0) {
      continue;
    }
    const key = `${line.productId}:${line.variantId ?? "base"}`;
    const current = grouped.get(key);
    if (current) {
      current.quantity += line.quantity;
    } else {
      grouped.set(key, {
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
      });
    }
  }
  return [...grouped.values()];
}

export function remainingCartQuantity(
  currentQuantity: number,
  purchasedQuantity: number,
): number | null {
  if (
    !Number.isInteger(currentQuantity) ||
    !Number.isInteger(purchasedQuantity) ||
    currentQuantity <= 0 ||
    purchasedQuantity <= 0
  ) {
    throw new Error("Cart quantities must be positive integers.");
  }
  return currentQuantity > purchasedQuantity
    ? currentQuantity - purchasedQuantity
    : null;
}
