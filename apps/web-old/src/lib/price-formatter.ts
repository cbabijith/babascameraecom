// src/lib/price-formatter.ts

/**
 * Format number in Indian numbering system
 * Example: 1234567.89 -> "12,34,567.89"
 */
function formatIndianNumber(num: number): string {
  const [intPart, fracPart] = num.toFixed(2).split("."); // always 2 decimals

  // Last 3 digits (thousand group)
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);

  let formattedInt = "";
  if (rest.length > 0) {
    formattedInt = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  } else {
    formattedInt = last3;
  }

  return fracPart && Number(fracPart) > 0
    ? `${formattedInt}.${fracPart}`
    : formattedInt;
}

/**
 * Format price to Indian currency format (with ₹ symbol + space)
 */
export function formatPrice(price: number | null | undefined): string {
  if (price == null || isNaN(Number(price))) return "₹ 0";
  const num = Number(price);
  return `₹ ${formatIndianNumber(num)}`;
}

/**
 * Format price without currency symbol
 */
export function formatPriceWithoutSymbol(price: number | null | undefined): string {
  if (price == null || isNaN(Number(price))) return "0";
  const num = Number(price);
  return formatIndianNumber(num);
}

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercentage(originalPrice: number, currentPrice: number): number {
  if (originalPrice <= 0 || originalPrice <= currentPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}
